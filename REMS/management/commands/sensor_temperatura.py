import random
import time
import uuid
from django.utils import timezone
from django.core.management.base import BaseCommand
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from HABUI_APP.models import Recurso, RecursoTemperatura, MetricaMonitoreo


class Command(BaseCommand):
    help = "Simula lecturas del sensor de Temperatura (C) y guarda metricas por WebSocket."

    def add_arguments(self, parser):
        parser.add_argument('--interval', type=float, default=2.0,
                            help='Tiempo entre lecturas (segundos)')
        parser.add_argument('--count', type=int, default=0,
                            help='Numero de lecturas (0 = infinito)')
        parser.add_argument('--recurso-id', type=int, required=False,
                            help='ID del recurso tipo temperatura (opcional)')
        parser.add_argument('--mode', type=str, default='optimo',
                            choices=['optimo', 'advertencia', 'critico', 'normal', 'aleatorio', 'variacion'],
                            help='Modo de simulacion: optimo, advertencia, critico, normal, aleatorio, variacion')
        parser.add_argument('--drift', type=float, default=0.0,
                            help='Deriva gradual del valor por minuto (positivo para aumento, negativo para disminucion)')
        parser.add_argument('--noise', type=float, default=0.2,
                            help='Nivel de ruido aleatorio (+/- C)')

    # ========================= HELPERS =========================

    def obtener_escenario(self, mode, drift_rate):
        if mode == "optimo":
            return "S1"
        elif mode == "advertencia":
            return "S3"
        elif mode == "critico":
            return "S4"
        elif mode == "normal" and drift_rate != 0:
            return "S3"
        else:
            return "S0"

    def clasificar_estado_temperatura(self, valor):
        if valor < 18.0:
            return "CRITICO", "rojo", "Riesgo fisiologico por hipotermia potencial"
        elif valor < 20.0:
            return "ADVERTENCIA", "amarillo", "Leve incomodidad termica por frio"
        elif valor < 24.0:
            return "OPTIMO", "verde", "Zona de confort termico humano optimo"
        elif valor <= 26.0:
            return "ADVERTENCIA", "amarillo", "Leve incomodidad termica por calor"
        else:
            return "CRITICO", "rojo", "Riesgo fisiologico por estres termico"

    def obtener_estado_esperado(self, valor):
        if valor < 18.0:
            return "CRITICO"
        elif valor < 20.0:
            return "ADVERTENCIA"
        elif valor < 24.0:
            return "OPTIMO"
        elif valor <= 26.0:
            return "ADVERTENCIA"
        else:
            return "CRITICO"

    def alerta_para_estado(self, estado):
        return estado in ["ADVERTENCIA", "CRITICO"]

    # ========================= MAIN =========================

    def handle(self, *args, **options):
        intervalo = options['interval']
        max_count = options['count']
        recurso_id = options['recurso_id']
        mode = options['mode']
        drift_rate = options['drift']
        noise_level = options['noise']

        RANGOS = {
            'optimo': {'min': 20.0, 'max': 24.0, 'color': 'verde', 'desc': 'Zona de confort termico humano optimo'},
            'advertencia': {'min': 18.0, 'max': 26.0, 'color': 'amarillo', 'desc': 'Leve incomodidad termica'},
            'critico': {'min': 0.0, 'max': 45.0, 'color': 'rojo', 'desc': 'Riesgo fisiologico y estres termico'},
            'normal': {'min': 21.0, 'max': 23.0, 'color': 'verde', 'desc': 'Variacion normal dentro del rango optimo'},
            'variacion': {'min': 15.0, 'max': 30.0, 'color': 'naranja', 'desc': 'Variacion amplia entre estados'},
        }

        channel_layer = get_channel_layer()

        recurso, creado = Recurso.objects.get_or_create(
            tipo='temperatura',
            defaults={'nombre': 'Sensor de Temperatura (C)'}
        )

        if creado:
            self.stdout.write(self.style.SUCCESS("Recurso 'Sensor de Temperatura' creado automaticamente."))
        else:
            self.stdout.write(self.style.SUCCESS("Recurso 'Sensor de Temperatura' ya existe."))

        escenario = self.obtener_escenario(mode, drift_rate)

        self.stdout.write(self.style.SUCCESS(f"Iniciando simulador Temperatura en modo: {mode}"))
        self.stdout.write(self.style.SUCCESS(f"Escenario asignado automaticamente: {escenario}"))

        if mode == 'aleatorio':
            self.stdout.write("Modo aleatorio: Se alternara entre diferentes estados cada 15 segundos")

        if drift_rate != 0:
            self.stdout.write(f"Deriva configurada: {drift_rate} C por minuto")

        self.stdout.write(f"Nivel de ruido: +/-{noise_level} C")
        self.stdout.write("Rangos de referencia:")
        self.stdout.write(" OPTIMO: 20.0 - 24.0 C")
        self.stdout.write(" ADVERTENCIA: 18.0 - 20.0 C o 24.0 - 26.0 C")
        self.stdout.write(" CRITICO: < 18.0 C o > 26.0 C")

        i = 1
        base_value = 22.0
        start_time = time.time()
        last_mode_change = time.time()
        current_mode = mode
        advertencia_submodo = 'baja'

        try:
            while True:
                if max_count and i > max_count:
                    break

                tstart = timezone.now()

                elapsed_minutes = (time.time() - start_time) / 60.0
                drift = elapsed_minutes * drift_rate

                if mode == 'aleatorio':
                    if time.time() - last_mode_change > 15:
                        modes = ['optimo', 'advertencia', 'critico']
                        weights = [0.6, 0.3, 0.1]
                        current_mode = random.choices(modes, weights=weights)[0]
                        last_mode_change = time.time()

                        if current_mode == 'advertencia':
                            advertencia_submodo = random.choice(['baja', 'alta'])
                            if advertencia_submodo == 'baja':
                                rango_min, rango_max = 18.0, 20.0
                            else:
                                rango_min, rango_max = 24.0, 26.0
                            self.stdout.write(
                                f"Cambiando a modo: {current_mode} ({advertencia_submodo}: {rango_min}-{rango_max} C)"
                            )
                        else:
                            self.stdout.write(f"Cambiando a modo: {current_mode} ({RANGOS[current_mode]['desc']})")

                elif mode == 'variacion':
                    cycle_time = (time.time() - start_time) % 300
                    if cycle_time < 150:
                        base_value = 15.0 + (cycle_time / 150) * 15.0
                    else:
                        base_value = 30.0 - ((cycle_time - 150) / 150) * 15.0

                elif mode == 'normal':
                    if i == 1:
                        base_value = 22.0
                    else:
                        variation = random.uniform(-0.5, 0.5)
                        base_value += variation
                        return_force = (22.0 - base_value) * 0.1
                        base_value += return_force
                        base_value += drift
                        base_value = max(10.0, min(40.0, base_value))

                if current_mode in RANGOS:
                    rango = RANGOS[current_mode]

                    if current_mode == 'advertencia' and mode in ['aleatorio', 'advertencia']:
                        if advertencia_submodo == 'baja':
                            rango_min, rango_max = 18.0, 20.0
                        else:
                            rango_min, rango_max = 24.0, 26.0
                    else:
                        rango_min, rango_max = rango['min'], rango['max']

                    if mode in ['normal', 'variacion']:
                        valor_base = base_value
                    else:
                        valor_base = random.uniform(rango_min, rango_max)

                    noise = random.uniform(-noise_level, noise_level)
                    valor = valor_base + noise + drift
                    valor = max(-10.0, min(50.0, valor))

                    if current_mode in ['optimo', 'advertencia', 'critico'] and mode != 'variacion':
                        valor = max(rango_min, min(rango_max, valor))
                else:
                    valor = 22.0 + random.uniform(-2, 2)

                valor = round(valor, 2)

                estado, color, descripcion = self.clasificar_estado_temperatura(valor)
                estado_esperado = self.obtener_estado_esperado(valor)

                alerta_activada = self.alerta_para_estado(estado)
                alerta_esperada = self.alerta_para_estado(estado_esperado)

                clasificacion_correcta = (estado == estado_esperado)
                alerta_correcta = (alerta_activada == alerta_esperada)

                try:
                    reading = RecursoTemperatura.objects.create(
                        recurso_id=recurso_id if recurso_id else recurso.id,
                        valor=valor
                    )

                    tgen = timezone.now()
                    sample_id = f"temperatura-{reading.id}-{uuid.uuid4().hex[:8]}"

                    metrica = MetricaMonitoreo.objects.create(
                        recurso="temperatura",
                        escenario=escenario,
                        sample_id=sample_id,
                        valor=valor,
                        estado_esperado=estado_esperado,
                        estado_clasificado=estado,
                        clasificacion_correcta=clasificacion_correcta,
                        alerta_esperada=alerta_esperada,
                        alerta_activada=alerta_activada,
                        alerta_correcta=alerta_correcta,
                        tstart=tstart,
                        tgen=tgen,
                        lp_ms=(tgen - tstart).total_seconds() * 1000.0
                    )

                    lp_ms = metrica.lp_ms if metrica.lp_ms is not None else 0.0

                    if estado == "OPTIMO":
                        style = self.style.SUCCESS
                    elif estado == "ADVERTENCIA":
                        style = self.style.WARNING
                    else:
                        style = self.style.ERROR

                    self.stdout.write(
                        style(
                            f"[{i}] Esc:{escenario} | Estado:{estado} | Esperado:{estado_esperado} | "
                            f"Temp:{valor:.1f} C | LP:{lp_ms:.2f} ms | "
                            f"ClasOK:{clasificacion_correcta} | AlertOK:{alerta_correcta} | "
                            f"(BD ID:{reading.id})"
                        )
                    )

                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Error al guardar temperatura/metricas: {str(e)}"))
                    tgen = timezone.now()
                    sample_id = f"temperatura-error-{uuid.uuid4().hex[:8]}"

                data = {
                    "type": "temperatura_data",
                    "sample_id": sample_id,
                    "escenario": escenario,
                    "valor": valor,
                    "fecha_hora": tgen.isoformat(),
                    "unidad": "C",
                    "estado": estado,
                    "estado_esperado": estado_esperado,
                    "color": color,
                    "descripcion": descripcion,
                    "alerta_activada": alerta_activada,
                    "alerta_esperada": alerta_esperada,
                    "clasificacion_correcta": clasificacion_correcta,
                    "alerta_correcta": alerta_correcta,
                    "modo_simulacion": current_mode if mode == 'aleatorio' else mode,
                    "tstart": tstart.isoformat(),
                    "tgen": tgen.isoformat(),
                }

                async_to_sync(channel_layer.group_send)(
                    "temperatura",
                    {"type": "enviar_dato", "data": data}
                )

                i += 1
                time.sleep(intervalo)

            self.stdout.write(self.style.SUCCESS("Simulador Temperatura finalizado."))

        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING("Simulacion detenida."))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error en simulacion: {str(e)}"))