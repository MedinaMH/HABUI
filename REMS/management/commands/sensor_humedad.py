import random
import time
import uuid
from django.utils import timezone
from django.core.management.base import BaseCommand
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from HABUI_APP.models import Recurso, RecursoHumedad, MetricaMonitoreo


class Command(BaseCommand):
    help = "Simula lecturas del sensor de Humedad (%) y guarda metricas por WebSocket."

    def add_arguments(self, parser):
        parser.add_argument('--interval', type=float, default=2.0,
                            help='Tiempo entre lecturas (segundos)')
        parser.add_argument('--count', type=int, default=0,
                            help='Numero de lecturas (0 = infinito)')
        parser.add_argument('--recurso-id', type=int, required=False,
                            help='ID del recurso tipo humedad (opcional)')
        parser.add_argument('--mode', type=str, default='optimo',
                            choices=['optimo', 'advertencia', 'critico', 'normal', 'aleatorio', 'variacion'],
                            help='Modo de simulacion: optimo, advertencia, critico, normal, aleatorio, variacion')
        parser.add_argument('--drift', type=float, default=0.0,
                            help='Deriva gradual del valor por minuto (positivo para aumento, negativo para disminucion)')
        parser.add_argument('--noise', type=float, default=0.5,
                            help='Nivel de ruido aleatorio (+/- %)')

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

    def clasificar_estado_humedad(self, valor):
        if valor < 30.0:
            return "CRITICO", "rojo", "Irritacion respiratoria por sequedad extrema"
        elif valor < 40.0:
            return "ADVERTENCIA", "amarillo", "Riesgo de sequedad respiratoria"
        elif valor < 60.0:
            return "OPTIMO", "verde", "Minimiza patogenos y maximiza confort respiratorio"
        elif valor <= 70.0:
            return "ADVERTENCIA", "amarillo", "Riesgo de proliferacion microbiana"
        else:
            return "CRITICO", "rojo", "Riesgo de crecimiento de moho e irritacion respiratoria"

    def obtener_estado_esperado(self, valor):
        if valor < 30.0:
            return "CRITICO"
        elif valor < 40.0:
            return "ADVERTENCIA"
        elif valor < 60.0:
            return "OPTIMO"
        elif valor <= 70.0:
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
            'optimo': {'min': 40.0, 'max': 60.0, 'color': 'verde', 'desc': 'Confort respiratorio'},
            'advertencia': {'min': 30.0, 'max': 70.0, 'color': 'amarillo', 'desc': 'Riesgo moderado'},
            'critico': {'min': 0.0, 'max': 100.0, 'color': 'rojo', 'desc': 'Riesgo fisiologico'},
            'normal': {'min': 45.0, 'max': 55.0, 'color': 'verde', 'desc': 'Variacion normal dentro del rango optimo'},
            'variacion': {'min': 20.0, 'max': 90.0, 'color': 'naranja', 'desc': 'Variacion amplia entre estados'},
        }

        channel_layer = get_channel_layer()

        recurso, creado = Recurso.objects.get_or_create(
            tipo='humedad',
            defaults={'nombre': 'Sensor de Humedad Relativa (%)'}
        )

        if creado:
            self.stdout.write(self.style.SUCCESS("Recurso 'Sensor de Humedad Relativa (%)' creado automaticamente."))
        else:
            self.stdout.write(self.style.SUCCESS("Recurso 'Sensor de Humedad Relativa (%)' ya existe."))

        escenario = self.obtener_escenario(mode, drift_rate)

        self.stdout.write(self.style.SUCCESS(f"Iniciando simulador Humedad en modo: {mode}"))
        self.stdout.write(self.style.SUCCESS(f"Escenario asignado automaticamente: {escenario}"))

        if mode == 'aleatorio':
            self.stdout.write("Modo aleatorio: Se alternara entre diferentes estados cada 15 segundos")

        if drift_rate != 0:
            self.stdout.write(f"Deriva configurada: {drift_rate} % por minuto")

        self.stdout.write(f"Nivel de ruido: +/-{noise_level} %")
        self.stdout.write("Rangos de referencia:")
        self.stdout.write(" OPTIMO: 40.0 - 60.0 %")
        self.stdout.write(" ADVERTENCIA: 30.0 - 40.0 % o 60.0 - 70.0 %")
        self.stdout.write(" CRITICO: < 30.0 % o > 70.0 %")

        i = 1
        base_value = 50.0
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
                                rango_min, rango_max = 30.0, 40.0
                            else:
                                rango_min, rango_max = 60.0, 70.0
                            self.stdout.write(
                                f"Cambiando a modo: {current_mode} ({advertencia_submodo}: {rango_min}-{rango_max}%)"
                            )
                        else:
                            self.stdout.write(f"Cambiando a modo: {current_mode} ({RANGOS[current_mode]['desc']})")

                elif mode == 'variacion':
                    cycle_time = (time.time() - start_time) % 600
                    if cycle_time < 300:
                        base_value = 20.0 + (cycle_time / 300) * 50.0
                    else:
                        base_value = 70.0 - ((cycle_time - 300) / 300) * 50.0

                elif mode == 'normal':
                    if i == 1:
                        base_value = 50.0
                    else:
                        variation = random.uniform(-1.0, 1.0)
                        base_value += variation
                        return_force = (50.0 - base_value) * 0.1
                        base_value += return_force
                        base_value += drift
                        base_value = max(10.0, min(90.0, base_value))

                if current_mode in RANGOS:
                    rango = RANGOS[current_mode]

                    if current_mode == 'advertencia' and mode in ['aleatorio', 'advertencia']:
                        if advertencia_submodo == 'baja':
                            rango_min, rango_max = 30.0, 40.0
                        else:
                            rango_min, rango_max = 60.0, 70.0
                    else:
                        rango_min, rango_max = rango['min'], rango['max']

                    if mode in ['normal', 'variacion']:
                        valor_base = base_value
                    else:
                        valor_base = random.uniform(rango_min, rango_max)

                    noise = random.uniform(-noise_level, noise_level)
                    valor = valor_base + noise + drift
                    valor = max(0.0, min(100.0, valor))

                    if current_mode in ['optimo', 'advertencia', 'critico'] and mode != 'variacion':
                        valor = max(rango_min, min(rango_max, valor))
                else:
                    valor = 50.0 + random.uniform(-5, 5)

                valor = round(valor, 2)

                estado, color, descripcion = self.clasificar_estado_humedad(valor)
                estado_esperado = self.obtener_estado_esperado(valor)

                alerta_activada = self.alerta_para_estado(estado)
                alerta_esperada = self.alerta_para_estado(estado_esperado)

                clasificacion_correcta = (estado == estado_esperado)
                alerta_correcta = (alerta_activada == alerta_esperada)

                try:
                    reading = RecursoHumedad.objects.create(
                        recurso_id=recurso_id if recurso_id else recurso.id,
                        valor=valor
                    )

                    tgen = timezone.now()
                    sample_id = f"humedad-{reading.id}-{uuid.uuid4().hex[:8]}"

                    metrica = MetricaMonitoreo.objects.create(
                        recurso="humedad",
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
                            f"Humedad:{valor:.1f}% | LP:{lp_ms:.2f} ms | "
                            f"ClasOK:{clasificacion_correcta} | AlertOK:{alerta_correcta} | "
                            f"(BD ID:{reading.id})"
                        )
                    )

                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Error al guardar humedad/metricas: {str(e)}"))
                    tgen = timezone.now()
                    sample_id = f"humedad-error-{uuid.uuid4().hex[:8]}"

                data = {
                    "type": "humedad_data",
                    "sample_id": sample_id,
                    "escenario": escenario,
                    "valor": valor,
                    "fecha_hora": tgen.isoformat(),
                    "unidad": "%",
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
                    "humedad",
                    {"type": "enviar_dato", "data": data}
                )

                i += 1
                time.sleep(intervalo)

            self.stdout.write(self.style.SUCCESS("Simulador Humedad finalizado."))

        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING("Simulacion detenida."))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error en simulacion: {str(e)}"))