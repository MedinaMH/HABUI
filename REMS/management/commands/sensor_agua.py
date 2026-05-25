import random
import time
import uuid
from django.utils import timezone
from django.core.management.base import BaseCommand
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from REMS.models import Recurso, RecursoAgua, MetricaMonitoreo


class Command(BaseCommand):
    help = "Simula lecturas realistas de un tanque de agua (1000 L). Guarda metricas y envia datos por WebSocket."

    # --------- PARAMETROS DEL SIMULADOR ---------
    TANK_CAPACITY = 1000.0
    START_LEVEL_MIN = 700
    START_LEVEL_MAX = 900

    CONSUMO_MIN = -8
    CONSUMO_MAX = -2
    LLENADO_MIN = 15
    LLENADO_MAX = 25

    UMBRAL_BAJO = 300
    UMBRAL_ALTO = 950
    # --------------------------------------------

    def add_arguments(self, parser):
        parser.add_argument('--recurso-id', type=int, required=True,
                            help='ID del recurso agua en la base de datos')
        parser.add_argument('--interval', type=float, default=5.0,
                            help='Intervalo entre lecturas en segundos')
        parser.add_argument('--count', type=int, default=0,
                            help='Numero total de lecturas (0 = infinito)')
        parser.add_argument('--mode', type=str, default='normal',
                            choices=['normal', 'llenado', 'consumo', 'critico'],
                            help='Modo de simulacion: normal, llenado, consumo, critico')

    # ========================= HELPERS =========================

    def obtener_escenario(self, modo):
        if modo == 'normal':
            return 'S1'
        elif modo == 'llenado':
            return 'S3'
        elif modo == 'consumo':
            return 'S2'
        elif modo == 'critico':
            return 'S4'
        return 'S0'

    def clasificar_estado_agua(self, nivel_porcentaje):
        if nivel_porcentaje < 20:
            return "CRITICO", "#ff4444", "Nivel critico de agua"
        elif nivel_porcentaje < 40:
            return "BAJO", "#ffaa00", "Nivel bajo de agua"
        elif nivel_porcentaje < 70:
            return "NORMAL", "#00bfff", "Nivel funcional de agua"
        else:
            return "OPTIMO", "#00cc66", "Nivel optimo de agua"

    def obtener_estado_esperado(self, nivel_porcentaje):
        if nivel_porcentaje < 20:
            return "CRITICO"
        elif nivel_porcentaje < 40:
            return "BAJO"
        elif nivel_porcentaje < 70:
            return "NORMAL"
        else:
            return "OPTIMO"

    def alerta_para_estado(self, estado):
        return estado in ["BAJO", "CRITICO"]

    # ========================= MAIN =========================

    def handle(self, *args, **options):
        recurso_id = options['recurso_id']
        intervalo = options['interval']
        max_count = options['count']
        modo = options['mode']

        recurso, creado = Recurso.objects.get_or_create(
            tipo='agua',
            defaults={'nombre': 'Agua'}
        )

        if creado:
            self.stdout.write(self.style.SUCCESS("Recurso 'Agua Cabina' creado automaticamente."))
        else:
            self.stdout.write(self.style.SUCCESS("Recurso 'Agua Cabina' ya existe."))

        self.stdout.write(self.style.SUCCESS("Iniciando simulador Agua..."))
        channel_layer = get_channel_layer()

        if modo == 'critico':
            nivel = random.uniform(50, 150)
        elif modo == 'llenado':
            nivel = random.uniform(200, 400)
        elif modo == 'consumo':
            nivel = random.uniform(800, 950)
        else:
            nivel = random.uniform(self.START_LEVEL_MIN, self.START_LEVEL_MAX)

        estado_operacion = "NORMAL"
        i = 0
        llenando = False
        escenario = self.obtener_escenario(modo)

        self.stdout.write(self.style.SUCCESS("Iniciando simulador de tanque de agua"))
        self.stdout.write(f"Tanque: {self.TANK_CAPACITY} L | Recurso: {recurso.nombre}")
        self.stdout.write(f"Modo: {modo} | Intervalo: {intervalo}s | Escenario: {escenario}")

        try:
            while True:
                tstart = timezone.now()

                if modo == 'normal':
                    if nivel <= self.UMBRAL_BAJO:
                        variacion = random.uniform(self.LLENADO_MIN, self.LLENADO_MAX)
                        estado_operacion = "LLENANDO"
                        llenando = True
                    elif nivel >= self.UMBRAL_ALTO:
                        variacion = random.uniform(-2, 1)
                        estado_operacion = "ESTABLE"
                        llenando = False
                    else:
                        if random.random() < 0.05:
                            variacion = random.uniform(5, 15)
                            estado_operacion = "LLENANDO"
                            llenando = True
                        else:
                            variacion = random.uniform(self.CONSUMO_MIN, self.CONSUMO_MAX)
                            estado_operacion = "CONSUMIENDO"
                            llenando = False

                elif modo == 'llenado':
                    variacion = random.uniform(20, 30)
                    estado_operacion = "LLENANDO RAPIDO"
                    llenando = True

                elif modo == 'consumo':
                    variacion = random.uniform(-10, -5)
                    estado_operacion = "CONSUMIENDO"
                    llenando = False

                elif modo == 'critico':
                    if nivel < 100:
                        variacion = random.uniform(30, 40)
                        estado_operacion = "EMERGENCIA - LLENANDO"
                    else:
                        variacion = random.uniform(-3, 2)
                        estado_operacion = "CRITICO"
                    llenando = True

                nivel += variacion
                nivel = max(0, min(self.TANK_CAPACITY, nivel))

                nivel_porcentaje = round((nivel / self.TANK_CAPACITY) * 100, 2)
                nivel_litros = round(nivel, 2)

                estado_visual, color, descripcion = self.clasificar_estado_agua(nivel_porcentaje)
                estado_esperado = self.obtener_estado_esperado(nivel_porcentaje)

                alerta_activada = self.alerta_para_estado(estado_visual)
                alerta_esperada = self.alerta_para_estado(estado_esperado)

                clasificacion_correcta = (estado_visual == estado_esperado)
                alerta_correcta = (alerta_activada == alerta_esperada)

                try:
                    reading = RecursoAgua.objects.create(
                        recurso=recurso,
                        nivel=nivel_porcentaje
                    )

                    tgen = timezone.now()
                    sample_id = f"agua-{reading.id}-{uuid.uuid4().hex[:8]}"

                    metrica = MetricaMonitoreo.objects.create(
                        recurso="agua",
                        escenario=escenario,
                        sample_id=sample_id,
                        valor=nivel_porcentaje,
                        estado_esperado=estado_esperado,
                        estado_clasificado=estado_visual,
                        clasificacion_correcta=clasificacion_correcta,
                        alerta_esperada=alerta_esperada,
                        alerta_activada=alerta_activada,
                        alerta_correcta=alerta_correcta,
                        tstart=tstart,
                        tgen=tgen,
                        lp_ms=(tgen - tstart).total_seconds() * 1000.0
                    )

                    lp_ms = metrica.lp_ms if metrica.lp_ms is not None else 0.0

                    data = {
                        'type': 'agua_data',
                        'sample_id': sample_id,
                        'id': reading.id,
                        'recurso': recurso.pk,
                        'recurso_nombre': recurso.nombre,
                        'escenario': escenario,
                        'nivel': nivel_porcentaje,
                        'litros': nivel_litros,
                        'capacidad': self.TANK_CAPACITY,
                        'estado': estado_operacion,
                        'estado_visual': estado_visual,
                        'estado_esperado': estado_esperado,
                        'descripcion': descripcion,
                        'color': color,
                        'llenando': llenando,
                        'alerta_activada': alerta_activada,
                        'alerta_esperada': alerta_esperada,
                        'clasificacion_correcta': clasificacion_correcta,
                        'alerta_correcta': alerta_correcta,
                        'fecha_hora': tgen.isoformat(),
                        'timestamp_iso': tgen.isoformat(),
                        'unidad': '%',
                        'tstart': tstart.isoformat(),
                        'tgen': tgen.isoformat(),
                    }

                    async_to_sync(channel_layer.group_send)(
                        "agua",
                        {
                            "type": "enviar_dato",
                            "data": data
                        }
                    )

                    if nivel_porcentaje < 20:
                        estilo = self.style.ERROR
                    elif nivel_porcentaje < 40:
                        estilo = self.style.WARNING
                    else:
                        estilo = self.style.SUCCESS

                    self.stdout.write(estilo(
                        f"[{i+1}] Esc:{escenario} | Agua:{nivel_porcentaje}% | {nivel_litros} L | "
                        f"Op:{estado_operacion} | Visual:{estado_visual} | LP:{lp_ms:.2f} ms | "
                        f"ClasOK:{clasificacion_correcta} | AlertOK:{alerta_correcta} | "
                        f"(BD ID:{reading.id})"
                    ))

                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Error al guardar agua/metricas: {str(e)}"))
                    tgen = timezone.now()
                    sample_id = f"agua-error-{uuid.uuid4().hex[:8]}"

                    data = {
                        'type': 'agua_data',
                        'sample_id': sample_id,
                        'recurso': recurso.pk,
                        'recurso_nombre': recurso.nombre,
                        'escenario': escenario,
                        'nivel': nivel_porcentaje,
                        'litros': nivel_litros,
                        'capacidad': self.TANK_CAPACITY,
                        'estado': estado_operacion,
                        'estado_visual': estado_visual,
                        'estado_esperado': estado_esperado,
                        'descripcion': descripcion,
                        'color': color,
                        'llenando': llenando,
                        'alerta_activada': alerta_activada,
                        'alerta_esperada': alerta_esperada,
                        'clasificacion_correcta': clasificacion_correcta,
                        'alerta_correcta': alerta_correcta,
                        'fecha_hora': tgen.strftime("%Y-%m-%d %H:%M:%S"),
                        'timestamp_iso': tgen.isoformat(),
                        'unidad': '%',
                        'tstart': tstart.isoformat(),
                        'tgen': tgen.isoformat(),
                    }

                    async_to_sync(channel_layer.group_send)(
                        "agua",
                        {
                            "type": "enviar_dato",
                            "data": data
                        }
                    )

                i += 1

                if max_count > 0 and i >= max_count:
                    self.stdout.write(self.style.SUCCESS(f"Simulacion completada ({i} lecturas)"))
                    break

                time.sleep(intervalo)

        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING("Simulacion detenida por el usuario."))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error en simulacion: {str(e)}"))