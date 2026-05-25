import random
import time
import uuid
from django.utils import timezone
from django.core.management.base import BaseCommand
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from REMS.models import Recurso, RecursoOxigeno, MetricaMonitoreo


class Command(BaseCommand):
    help = "Simula lecturas del sensor de Oxigeno (O2) y guarda metricas por WebSocket."

    def add_arguments(self, parser):
        parser.add_argument('--interval', type=float, default=2.0,
                            help='Tiempo entre lecturas (segundos)')
        parser.add_argument('--count', type=int, default=0,
                            help='Numero de lecturas (0 = infinito)')
        parser.add_argument('--recurso-id', type=int, required=False,
                            help='ID del recurso tipo oxigeno (opcional)')
        parser.add_argument('--mode', type=str, default='normal',
                            choices=['normal', 'critico_bajo', 'critico_alto', 'advertencia_baja',
                                     'advertencia_alta', 'optimo', 'aleatorio'],
                            help='Modo de simulacion: normal, critico_bajo, critico_alto, advertencia_baja, advertencia_alta, optimo, aleatorio')
        parser.add_argument('--drift', type=float, default=0.0,
                            help='Deriva gradual del valor por minuto (positivo/negativo)')

    # ========================= HELPERS =========================

    def obtener_escenario(self, mode, drift_rate):
        if mode == "optimo":
            return "S1"
        elif mode in ["advertencia_baja", "advertencia_alta"]:
            return "S3"
        elif mode in ["critico_bajo", "critico_alto"]:
            return "S4"
        elif mode == "normal" and drift_rate != 0:
            return "S3"
        else:
            return "S0"

    def clasificar_estado_o2(self, valor):
        if valor < 17.0:
            return "CRITICO_BAJO", "rojo", "Nivel critico bajo de oxigeno"
        elif valor <= 19.4:
            return "ADVERTENCIA_BAJA", "amarillo", "Nivel bajo de oxigeno"
        elif valor <= 23.5:
            return "OPTIMO", "verde", "Nivel optimo de oxigeno"
        elif valor <= 25.0:
            return "ADVERTENCIA_ALTA", "amarillo", "Nivel alto de oxigeno"
        else:
            return "CRITICO_ALTO", "rojo", "Nivel critico alto de oxigeno"

    def obtener_estado_esperado(self, valor):
        if valor < 17.0:
            return "CRITICO_BAJO"
        elif valor <= 19.4:
            return "ADVERTENCIA_BAJA"
        elif valor <= 23.5:
            return "OPTIMO"
        elif valor <= 25.0:
            return "ADVERTENCIA_ALTA"
        else:
            return "CRITICO_ALTO"

    def alerta_para_estado(self, estado):
        return estado in ["ADVERTENCIA_BAJA", "ADVERTENCIA_ALTA", "CRITICO_BAJO", "CRITICO_ALTO"]

    # ========================= MAIN =========================

    def handle(self, *args, **options):
        intervalo = options['interval']
        max_count = options['count']
        recurso_id = options['recurso_id']
        mode = options['mode']
        drift_rate = options['drift']

        RANGOS = {
            'critico_bajo': {'min': 15.0, 'max': 16.9, 'color': 'rojo'},
            'critico_alto': {'min': 25.1, 'max': 30.0, 'color': 'rojo'},
            'advertencia_baja': {'min': 17.0, 'max': 19.4, 'color': 'amarillo'},
            'advertencia_alta': {'min': 23.6, 'max': 25.0, 'color': 'amarillo'},
            'optimo': {'min': 19.5, 'max': 23.5, 'color': 'verde'},
            'normal': {'min': 20.0, 'max': 21.5, 'color': 'verde'},
        }

        channel_layer = get_channel_layer()

        recurso, creado = Recurso.objects.get_or_create(
            tipo='oxigeno',
            defaults={'nombre': 'Oxigeno'}
        )

        if creado:
            self.stdout.write(self.style.SUCCESS("Recurso 'Oxigeno' creado automaticamente."))
        else:
            self.stdout.write(self.style.SUCCESS("Recurso 'Oxigeno' ya existe."))

        escenario = self.obtener_escenario(mode, drift_rate)

        self.stdout.write(self.style.SUCCESS(f"Iniciando simulador Oxigeno en modo: {mode}"))
        self.stdout.write(self.style.SUCCESS(f"Escenario asignado automaticamente: {escenario}"))

        if mode == 'aleatorio':
            self.stdout.write("Modo aleatorio: Se alternara entre diferentes estados")

        if drift_rate != 0:
            self.stdout.write(f"Deriva configurada: {drift_rate}% por minuto")

        i = 1
        base_value = 20.5
        start_time = time.time()
        current_mode = mode

        try:
            while True:
                if max_count and i > max_count:
                    break

                tstart = timezone.now()

                elapsed_minutes = (time.time() - start_time) / 60.0
                drift = elapsed_minutes * drift_rate

                current_mode = mode
                if mode == 'aleatorio':
                    modes = ['critico_bajo', 'advertencia_baja', 'normal', 'advertencia_alta', 'critico_alto']
                    if i % 10 == 0:
                        current_mode = random.choice(modes)
                        self.stdout.write(f"Cambiando a modo: {current_mode}")

                if current_mode in RANGOS:
                    rango = RANGOS[current_mode]
                    valor = round(
                        random.uniform(rango['min'], rango['max']) +
                        random.uniform(-0.05, 0.05) + drift,
                        4
                    )
                    if current_mode != 'normal':
                        valor = max(rango['min'], min(rango['max'], valor))
                elif current_mode == 'normal':
                    if i == 1:
                        base_value = 20.5
                    else:
                        variation = random.uniform(-0.1, 0.1)
                        base_value += variation
                        base_value = max(19.5, min(23.5, base_value + drift))
                    valor = round(base_value + random.uniform(-0.05, 0.05), 4)
                else:
                    valor = round(20.5 + random.uniform(-0.1, 0.1), 4)

                valor = round(valor, 2)

                estado, color, descripcion = self.clasificar_estado_o2(valor)
                estado_esperado = self.obtener_estado_esperado(valor)

                alerta_activada = self.alerta_para_estado(estado)
                alerta_esperada = self.alerta_para_estado(estado_esperado)

                clasificacion_correcta = (estado == estado_esperado)
                alerta_correcta = (alerta_activada == alerta_esperada)

                try:
                    reading = RecursoOxigeno.objects.create(
                        recurso_id=recurso_id if recurso_id else recurso.id,
                        nivel=valor
                    )

                    tgen = timezone.now()
                    sample_id = f"oxigeno-{reading.id}-{uuid.uuid4().hex[:8]}"

                    metrica = MetricaMonitoreo.objects.create(
                        recurso="oxigeno",
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

                    if "OPTIMO" in estado:
                        style = self.style.SUCCESS
                    elif "ADVERTENCIA" in estado:
                        style = self.style.WARNING
                    else:
                        style = self.style.ERROR

                    self.stdout.write(
                        style(
                            f"[{i}] Esc:{escenario} | Estado:{estado} | Esperado:{estado_esperado} | "
                            f"O2:{valor:.2f}% | LP:{lp_ms:.2f} ms | "
                            f"ClasOK:{clasificacion_correcta} | AlertOK:{alerta_correcta} | "
                            f"(BD ID:{reading.id})"
                        )
                    )

                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Error al guardar oxigeno/metricas: {str(e)}"))
                    tgen = timezone.now()
                    sample_id = f"oxigeno-error-{uuid.uuid4().hex[:8]}"

                data = {
                    "type": "oxigeno_data",
                    "sample_id": sample_id,
                    "escenario": escenario,
                    "nivel": valor,
                    "fecha_hora": tgen.isoformat(),
                    "estado": estado,
                    "estado_esperado": estado_esperado,
                    "color": color,
                    "descripcion": descripcion,
                    "alerta_activada": alerta_activada,
                    "alerta_esperada": alerta_esperada,
                    "clasificacion_correcta": clasificacion_correcta,
                    "alerta_correcta": alerta_correcta,
                    "modo_simulacion": current_mode,
                    "tstart": tstart.isoformat(),
                    "tgen": tgen.isoformat(),
                }

                async_to_sync(channel_layer.group_send)(
                    "oxigeno",
                    {"type": "enviar_dato", "data": data}
                )

                i += 1
                time.sleep(intervalo)

            self.stdout.write(self.style.SUCCESS("Simulador Oxigeno finalizado."))

        except KeyboardInterrupt:
            self.stdout.write("Simulacion detenida.")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error en simulacion: {str(e)}"))