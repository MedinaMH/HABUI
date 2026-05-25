import random
import time
import uuid
from django.utils import timezone
from django.core.management.base import BaseCommand
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from REMS.models import Recurso, RecursoCO2, MetricaMonitoreo


class Command(BaseCommand):
    help = "Simula lecturas del sensor de CO2 (ppm), guarda metricas y envia datos por WebSocket."

    def add_arguments(self, parser):
        parser.add_argument('--interval', type=float, default=2.0,
                            help='Tiempo entre lecturas (segundos)')
        parser.add_argument('--count', type=int, default=0,
                            help='Numero de lecturas (0 = infinito)')
        parser.add_argument('--recurso-id', type=int, required=False,
                            help='ID del recurso tipo CO2 (opcional)')
        parser.add_argument('--mode', type=str, default='normal',
                            choices=['optimo', 'advertencia', 'critico', 'normal', 'aleatorio', 'variacion'],
                            help='Modo de simulacion: optimo, advertencia, critico, normal, aleatorio, variacion')
        parser.add_argument('--drift', type=float, default=0.0,
                            help='Deriva gradual del valor por minuto (positivo para aumento, negativo para disminucion)')
        parser.add_argument('--noise', type=float, default=5.0,
                            help='Nivel de ruido aleatorio (+/- ppm)')

    # ========================= HELPERS =========================

    def clasificar_estado_co2(self, valor):
        if valor < 400:
            return "POR DEBAJO DE OPTIMO", "verde", "Nivel muy bajo de CO2"
        elif valor < 1000:
            return "OPTIMO", "verde", "Indicador de ventilacion adecuada y confort"
        elif valor < 2000:
            return "ADVERTENCIA", "amarillo", "Somnolencia leve, reduccion cognitiva"
        else:
            return "CRITICO", "rojo", "Riesgo fisiologico, hipercapnia progresiva"

    def alerta_para_estado(self, estado):
        return estado in ["ADVERTENCIA", "CRITICO"]

    def obtener_escenario(self, mode, drift_rate):
        if mode == "advertencia":
            return "S2"
        elif mode == "critico":
            return "S4"
        elif mode == "optimo":
            return "S1"
        elif mode == "normal" and drift_rate > 0:
            return "S2"
        else:
            return "S0"

    def obtener_estado_esperado(self, valor):
        if valor < 400:
            return "POR DEBAJO DE OPTIMO"
        elif valor < 1000:
            return "OPTIMO"
        elif valor < 2000:
            return "ADVERTENCIA"
        else:
            return "CRITICO"

    # ========================= MAIN =========================

    def handle(self, *args, **options):
        intervalo = options['interval']
        max_count = options['count']
        recurso_id = options['recurso_id']
        mode = options['mode']
        drift_rate = options['drift']
        noise_level = options['noise']

        RANGOS = {
            'optimo': {'min': 400, 'max': 1000, 'color': 'verde', 'desc': 'Optimo'},
            'advertencia': {'min': 1000, 'max': 2000, 'color': 'amarillo', 'desc': 'Advertencia'},
            'critico': {'min': 2000, 'max': 3000, 'color': 'rojo', 'desc': 'Critico'},
            'normal': {'min': 500, 'max': 800, 'color': 'verde', 'desc': 'Normal'},
            'variacion': {'min': 400, 'max': 2500, 'color': 'naranja', 'desc': 'Variacion amplia'},
        }

        channel_layer = get_channel_layer()

        recurso, creado = Recurso.objects.get_or_create(
            tipo='co2',
            defaults={'nombre': 'Dioxido de Carbono (CO2)'}
        )

        if creado:
            self.stdout.write(self.style.SUCCESS("Recurso 'Dioxido de Carbono' creado automaticamente."))
        else:
            self.stdout.write(self.style.SUCCESS("Recurso 'Dioxido de Carbono' ya existe."))

        escenario = self.obtener_escenario(mode, drift_rate)

        self.stdout.write(self.style.SUCCESS(f"Iniciando simulador CO2 en modo: {mode}"))
        self.stdout.write(self.style.SUCCESS(f"Escenario asignado automaticamente: {escenario}"))

        if mode == 'aleatorio':
            self.stdout.write("Modo aleatorio: Se alternara entre diferentes estados cada 15 segundos")

        if drift_rate != 0:
            self.stdout.write(f"Deriva configurada: {drift_rate} ppm por minuto")

        self.stdout.write(f"Nivel de ruido: +/-{noise_level} ppm")

        i = 1
        base_value = 600
        start_time = time.time()
        last_mode_change = time.time()
        current_mode = mode

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
                        weights = [0.5, 0.3, 0.2]
                        current_mode = random.choices(modes, weights=weights)[0]
                        last_mode_change = time.time()
                        self.stdout.write(f"Cambiando a modo: {current_mode} ({RANGOS[current_mode]['desc']})")

                elif mode == 'variacion':
                    cycle_time = (time.time() - start_time) % 120
                    if cycle_time < 90:
                        base_value = 400 + (cycle_time / 90) * 2100
                    else:
                        base_value = 2500 - ((cycle_time - 90) / 30) * 2100

                elif mode == 'normal':
                    if i == 1:
                        base_value = 600
                    else:
                        variation = random.uniform(-10, 10)
                        base_value += variation
                        return_force = (600 - base_value) * 0.1
                        base_value += return_force
                        base_value += drift
                        base_value = max(350, min(1500, base_value))

                if current_mode in RANGOS:
                    rango = RANGOS[current_mode]

                    if mode in ['normal', 'variacion']:
                        valor_base = base_value
                    else:
                        valor_base = random.uniform(rango['min'], rango['max'])

                    noise = random.uniform(-noise_level, noise_level)
                    valor = valor_base + noise + drift

                    valor = max(350, min(5000, valor))

                    if current_mode in ['optimo', 'advertencia', 'critico'] and mode != 'variacion':
                        valor = max(rango['min'], min(rango['max'], valor))
                else:
                    valor = 600 + random.uniform(-50, 50)

                valor = round(valor, 2)

                estado, color, descripcion = self.clasificar_estado_co2(valor)
                estado_esperado = self.obtener_estado_esperado(valor)

                alerta_activada = self.alerta_para_estado(estado)
                alerta_esperada = self.alerta_para_estado(estado_esperado)

                clasificacion_correcta = (estado == estado_esperado)
                alerta_correcta = (alerta_activada == alerta_esperada)

                try:
                    reading = RecursoCO2.objects.create(
                        recurso_id=recurso_id if recurso_id else recurso.id,
                        concentracion=valor
                    )

                    tgen = timezone.now()
                    sample_id = f"co2-{reading.id}-{uuid.uuid4().hex[:8]}"

                    metrica = MetricaMonitoreo.objects.create(
                        recurso="co2",
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

                    self.stdout.write(
                        f"[{i}] Esc:{escenario} | Estado:{estado} | Esperado:{estado_esperado} | "
                        f"CO2:{valor:.0f} ppm | LP:{lp_ms:.2f} ms | "
                        f"ClasOK:{clasificacion_correcta} | AlertOK:{alerta_correcta} | "
                        f"(BD ID:{reading.id})"
                    )

                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Error al guardar en BD/metricas: {str(e)}"))
                    tgen = timezone.now()
                    sample_id = f"co2-error-{uuid.uuid4().hex[:8]}"

                data = {
                    "type": "co2_data",
                    "sample_id": sample_id,
                    "escenario": escenario,
                    "valor": valor,
                    "fecha_hora": tgen.isoformat(),
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
                    "co2",
                    {"type": "enviar_dato", "data": data}
                )

                i += 1
                time.sleep(intervalo)

            self.stdout.write(self.style.SUCCESS("Simulador CO2 finalizado."))

        except KeyboardInterrupt:
            self.stdout.write("Simulacion detenida.")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error en simulacion: {str(e)}"))