import csv
import math
import random
import time
import uuid
from pathlib import Path

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.core.management.base import BaseCommand
from django.utils import timezone

from REMS.models import Recurso, RecursoEnergia, MetricaMonitoreo


class Command(BaseCommand):
    help = (
        "Simula el subsistema energetico de un habitat analogo alimentado por paneles solares. "
        "Genera datos de generacion solar, consumo, balance, bateria, autonomia y estado operativo."
    )

    def add_arguments(self, parser):
        parser.add_argument('--mode', type=str, default='normal', help='Modo: normal/optimo, warning/advertencia, critical/critico')
        parser.add_argument('--interval', type=float, default=2.0, help='Intervalo entre muestras en segundos')
        parser.add_argument('--count', type=int, default=0, help='Numero de muestras. 0 = continuo')
        parser.add_argument('--capacity', type=float, default=12000.0, help='Capacidad del banco de baterias en Wh')
        parser.add_argument('--initial_soc', type=float, default=0.65, help='Estado inicial de carga: 0.0 a 1.0')
        parser.add_argument('--solar_max', type=float, default=3000.0, help='Potencia maxima del arreglo fotovoltaico en W')
        parser.add_argument('--low_energy_mode', action='store_true', help='Fuerza escenario de baja generacion y mayor consumo')
        parser.add_argument('--soc_drift', type=float, default=0.0, help='Deriva forzada del SoC en puntos porcentuales por minuto')
        parser.add_argument('--noise_wh', type=float, default=2.5, help='Ruido aleatorio agregado a la bateria en Wh por muestra')
        parser.add_argument('--csv', type=str, default='', help='Ruta opcional al CSV de energia')

    # ======================================================
    # Utilidades
    # ======================================================

    def limitar(self, valor, minimo, maximo):
        return max(minimo, min(maximo, valor))

    def leer_float(self, row, *keys, default=0.0):
        for key in keys:
            value = row.get(key)
            if value not in (None, ''):
                try:
                    return float(str(value).replace(',', '.'))
                except ValueError:
                    continue
        return default

    def clasificar_bateria(self, soc):
        if soc <= 0.20:
            return 'critical', 'Nivel critico de bateria'
        if soc <= 0.40:
            return 'low', 'Nivel bajo de bateria'
        if soc < 0.70:
            return 'moderate', 'Nivel moderado de bateria'
        return 'optimal', 'Nivel optimo de bateria'

    def clasificar_estado_energia(self, soc, balance_w, autonomia_h):
        autonomia_critica = autonomia_h is not None and autonomia_h <= 1.0
        autonomia_baja = autonomia_h is not None and autonomia_h <= 3.0

        if soc <= 0.20 or autonomia_critica:
            return 'critical', 'Nivel critico de energia'

        if soc <= 0.40 or autonomia_baja or balance_w < -700:
            return 'warning', 'Nivel de advertencia de energia'

        return 'normal', 'Sistema energetico operativo'

    def normalizar_modo(self, mode):
        mode = (mode or 'normal').strip().lower()
        if mode in ('critico', 'critical', 'emergencia'):
            return 'critical'
        if mode in ('advertencia', 'warning', 'bajo'):
            return 'warning'
        if mode in ('optimo', 'óptimo', 'normal', 'nominal'):
            return 'normal'
        return 'normal'

    def estimar_generacion_solar(self, indice, solar_max_w, mode, low_energy_mode):
        """
        Perfil senoidal simplificado de generacion fotovoltaica.
        Representa una variacion diaria y permite escenarios de nubosidad/falla.
        """
        muestras_por_ciclo = 240
        posicion = (indice % muestras_por_ciclo) / muestras_por_ciclo
        perfil_diurno = max(0.0, math.sin(math.pi * posicion))

        if mode == 'critical' or low_energy_mode:
            nubosidad = random.uniform(0.15, 0.45)
            degradacion = random.uniform(0.45, 0.75)
        elif mode == 'warning':
            nubosidad = random.uniform(0.40, 0.75)
            degradacion = random.uniform(0.70, 0.90)
        else:
            nubosidad = random.uniform(0.75, 1.00)
            degradacion = random.uniform(0.90, 1.00)

        potencia = solar_max_w * perfil_diurno * nubosidad * degradacion

        # En pruebas cortas evitar iniciar con cero absoluto al comienzo del ciclo.
        if indice < 10:
            if mode == 'critical' or low_energy_mode:
                potencia = max(potencia, solar_max_w * random.uniform(0.05, 0.18))
            elif mode == 'warning':
                potencia = max(potencia, solar_max_w * random.uniform(0.18, 0.35))
            else:
                potencia = max(potencia, solar_max_w * random.uniform(0.35, 0.58))

        return self.limitar(potencia, 0.0, solar_max_w)

    def estimar_temperatura_panel(self, generacion_w, solar_max_w, mode):
        carga_relativa = generacion_w / solar_max_w if solar_max_w > 0 else 0
        base = 24.0 + (carga_relativa * 22.0) + random.uniform(-1.5, 1.5)
        if mode == 'critical':
            base += random.uniform(1.0, 4.0)
        return round(self.limitar(base, 18.0, 65.0), 2)

    def estimar_temperatura_bateria(self, soc, balance_w):
        esfuerzo = min(abs(balance_w) / 3000.0, 1.0)
        temp = 24.0 + (esfuerzo * 8.0) + random.uniform(-1.0, 1.0)
        if soc <= 0.20:
            temp += random.uniform(1.0, 3.0)
        return round(self.limitar(temp, 18.0, 50.0), 2)

    def areas_habitat(self, estado):
        areas_no_criticas = [
            'area.dormitorios',
            'area.bano',
            'area.pasillo',
            'area.exteriores',
        ]
        areas_criticas = ['area.sala_monitoreo']
        return {
            'critical': areas_criticas,
            'non_critical': areas_no_criticas,
            'shutdown': areas_no_criticas if estado == 'critical' else [],
        }

    def sugerencias(self, estado):
        if estado == 'critical':
            return [
                'Revisar estado del banco de baterias',
                'Verificar conexion y rendimiento de paneles solares',
                'Reducir consumo en sistemas no esenciales',
                'Comprobar inversor y regulador de carga',
                'Evaluar posible sobreconsumo inesperado',
            ]
        if estado == 'warning':
            return [
                'Reducir consumo en areas no esenciales',
                'Verificar generacion solar disponible',
                'Monitorear nivel de baterias',
            ]
        return []

    # ======================================================
    # Ejecucion principal
    # ======================================================

    def handle(self, *args, **options):
        mode = self.normalizar_modo(options['mode'])
        intervalo = float(options['interval'])
        count = int(options['count'])
        capacidad_bateria_wh = float(options['capacity'])
        soc_inicial = self.limitar(float(options['initial_soc']), 0.0, 1.0)
        low_energy_mode = bool(options['low_energy_mode']) or mode == 'critical'
        soc_drift = float(options['soc_drift'])
        solar_max_w = float(options['solar_max'])
        ruido_wh = float(options['noise_wh'])

        if mode == 'critical':
            soc_inicial = min(soc_inicial, 0.24)
            solar_max_w = min(solar_max_w, 900.0)
            factor_consumo = 1.55
            if soc_drift == 0.0:
                soc_drift = -3.5
            escenario = 'S5'
        elif mode == 'warning':
            soc_inicial = min(soc_inicial, 0.45)
            solar_max_w = min(solar_max_w, 1800.0)
            factor_consumo = 1.25
            if soc_drift == 0.0:
                soc_drift = -1.2
            escenario = 'S3'
        else:
            factor_consumo = 1.0
            escenario = 'S1'

        if low_energy_mode and mode != 'critical':
            solar_max_w = min(solar_max_w, 1000.0)
            factor_consumo = max(factor_consumo, 1.35)
            escenario = 'S4'

        csv_path = Path(options['csv']) if options['csv'] else Path(__file__).resolve().parent.parent.parent / 'data' / 'energia.csv'

        if not csv_path.exists():
            self.stderr.write(self.style.ERROR(f'No se encontro el archivo CSV: {csv_path}'))
            return

        with open(csv_path, newline='', encoding='utf-8') as csvfile:
            rows = list(csv.DictReader(csvfile))

        if not rows:
            self.stderr.write(self.style.ERROR('El CSV de energia no contiene registros.'))
            return

        recurso, creado = Recurso.objects.get_or_create(
            tipo='energia',
            defaults={'nombre': 'Subsistema de Energia Solar'}
        )

        if creado:
            self.stdout.write(self.style.SUCCESS("Recurso de energia creado automaticamente."))

        channel_layer = get_channel_layer()
        bateria_wh = capacidad_bateria_wh * soc_inicial
        energia_generada_wh = 0.0
        energia_consumida_wh = 0.0
        eficiencia_bateria = 0.95

        self.stdout.write(self.style.SUCCESS('Iniciando simulacion de energia solar'))
        self.stdout.write(f'Modo: {mode} | Escenario: {escenario} | Intervalo: {intervalo}s | Count: {count}')
        self.stdout.write(f'Capacidad: {capacidad_bateria_wh:.1f} Wh | SoC inicial: {soc_inicial:.2f} | Solar max: {solar_max_w:.1f} W')

        i = 0

        try:
            while count == 0 or i < count:
                row = rows[i % len(rows)]
                tstart = timezone.now()

                voltaje = self.leer_float(row, 'Tension/L1', 'Tensión/L1', 'voltaje', default=120.0)
                corriente_csv = self.leer_float(row, 'Corriente/L1', 'corriente', default=0.0)
                consumo_base_w = self.leer_float(row, 'P. Activa/L1 +', 'potencia', 'consumo_w', default=0.0)

                if consumo_base_w <= 0 and voltaje > 0 and corriente_csv > 0:
                    consumo_base_w = voltaje * corriente_csv

                consumo_w = max(0.0, consumo_base_w * factor_consumo)
                corriente = corriente_csv if corriente_csv > 0 else (consumo_w / voltaje if voltaje > 0 else 0.0)

                potencia_generada_w = self.estimar_generacion_solar(i, solar_max_w, mode, low_energy_mode)
                balance_w = potencia_generada_w - consumo_w

                energia_generada_wh += (potencia_generada_w * intervalo) / 3600.0
                energia_consumida_wh += (consumo_w * intervalo) / 3600.0
                balance_acumulado_wh = energia_generada_wh - energia_consumida_wh

                delta_wh = (balance_w * intervalo) / 3600.0
                if delta_wh >= 0:
                    delta_wh *= eficiencia_bateria
                else:
                    delta_wh /= eficiencia_bateria

                delta_soc_drift = (soc_drift / 100.0) * (intervalo / 60.0)
                delta_wh_drift = delta_soc_drift * capacidad_bateria_wh
                delta_wh += delta_wh_drift + random.uniform(-ruido_wh, ruido_wh)

                bateria_wh = self.limitar(bateria_wh + delta_wh, 0.0, capacidad_bateria_wh)
                soc = bateria_wh / capacidad_bateria_wh if capacidad_bateria_wh > 0 else 0.0
                soc_pct = soc * 100.0

                autonomia_h = None if balance_w >= 0 else bateria_wh / abs(balance_w) if abs(balance_w) > 0 else None
                estado, descripcion = self.clasificar_estado_energia(soc, balance_w, autonomia_h)
                banda_bateria, descripcion_bateria = self.clasificar_bateria(soc)

                factor_potencia = round(self.limitar(random.normalvariate(0.96, 0.015), 0.80, 1.0), 3)
                frecuencia = round(random.normalvariate(60.0, 0.05), 3)
                temperatura_panel_c = self.estimar_temperatura_panel(potencia_generada_w, solar_max_w, mode)
                temperatura_bateria_c = self.estimar_temperatura_bateria(soc, balance_w)
                modo_baja_energia = estado == 'critical' or low_energy_mode

                alerta_activada = estado == 'critical'
                estado_esperado = estado
                alerta_esperada = alerta_activada
                clasificacion_correcta = True
                alerta_correcta = True

                try:
                    reading = RecursoEnergia.objects.create(
                        recurso=recurso,

                        # Variables tecnicas
                        voltaje=round(voltaje, 4),
                        corriente=round(corriente, 4),
                        potencia=round(consumo_w, 4),
                        factor_potencia=factor_potencia,
                        frecuencia=frecuencia,

                        # Generacion solar
                        potencia_generada_w=round(potencia_generada_w, 4),
                        energia_generada_wh=round(energia_generada_wh, 4),
                        temperatura_panel_c=temperatura_panel_c,

                        # Consumo del habitat
                        potencia_consumida_w=round(consumo_w, 4),
                        energia_consumida_wh=round(energia_consumida_wh, 4),

                        # Balance energetico
                        balance_w=round(balance_w, 4),
                        balance_acumulado_wh=round(balance_acumulado_wh, 4),

                        # Banco de baterias
                        soc_bateria_pct=round(soc_pct, 4),
                        energia_bateria_wh=round(bateria_wh, 4),
                        capacidad_bateria_wh=round(capacidad_bateria_wh, 4),
                        autonomia_h=None if autonomia_h is None else round(autonomia_h, 4),
                        temperatura_bateria_c=temperatura_bateria_c,

                        # Estado operativo
                        estado_energia=estado,
                        modo_baja_energia=modo_baja_energia,
                    )

                    tgen = timezone.now()
                    sample_id = f'energia-{reading.id}-{uuid.uuid4().hex[:8]}'

                    metrica = MetricaMonitoreo.objects.create(
                        recurso='energia',
                        escenario=escenario,
                        sample_id=sample_id,
                        valor=round(soc_pct, 2),
                        estado_esperado=estado_esperado,
                        estado_clasificado=estado,
                        clasificacion_correcta=clasificacion_correcta,
                        alerta_esperada=alerta_esperada,
                        alerta_activada=alerta_activada,
                        alerta_correcta=alerta_correcta,
                        tstart=tstart,
                        tgen=tgen,
                        lp_ms=(tgen - tstart).total_seconds() * 1000.0,
                    )
                    lp_ms = metrica.lp_ms if metrica.lp_ms is not None else 0.0

                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'Error al guardar energia/metricas: {str(e)}'))
                    tgen = timezone.now()
                    sample_id = f'energia-error-{uuid.uuid4().hex[:8]}'
                    lp_ms = 0.0

                data = {
                    'type': 'energia_data',
                    'sample_id': sample_id,
                    'escenario': escenario,

                    # Compatibilidad con template anterior
                    'tension': round(voltaje, 4),
                    'corriente': round(corriente, 4),
                    'potencia': round(consumo_w, 4),
                    'solar_estimated_w': round(potencia_generada_w, 4),
                    'battery': round(soc, 4),
                    'battery_wh': round(bateria_wh, 4),
                    'capacity_wh': round(capacidad_bateria_wh, 4),
                    'energy_status': estado,
                    'low_energy_mode': modo_baja_energia,

                    # Nuevos nombres alineados con el modelo
                    'voltaje': round(voltaje, 4),
                    'factor_potencia': factor_potencia,
                    'frecuencia': frecuencia,
                    'potencia_generada_w': round(potencia_generada_w, 4),
                    'energia_generada_wh': round(energia_generada_wh, 4),
                    'temperatura_panel_c': temperatura_panel_c,
                    'potencia_consumida_w': round(consumo_w, 4),
                    'energia_consumida_wh': round(energia_consumida_wh, 4),
                    'balance_w': round(balance_w, 4),
                    'net_flow_w': round(balance_w, 4),
                    'balance_acumulado_wh': round(balance_acumulado_wh, 4),
                    'soc_bateria_pct': round(soc_pct, 4),
                    'soc_percent': round(soc_pct, 4),
                    'energia_bateria_wh': round(bateria_wh, 4),
                    'capacidad_bateria_wh': round(capacidad_bateria_wh, 4),
                    'autonomia_h': None if autonomia_h is None else round(autonomia_h, 4),
                    'temperatura_bateria_c': temperatura_bateria_c,
                    'estado_energia': estado,
                    'estado': estado,
                    'descripcion': descripcion,
                    'battery_band': banda_bateria,
                    'battery_band_description': descripcion_bateria,
                    'modo_baja_energia': modo_baja_energia,

                    'areas': self.areas_habitat(estado),
                    'alerts': {
                        'show_alert': estado in ('warning', 'critical'),
                        'level': estado,
                        'message': descripcion,
                        'suggestions': self.sugerencias(estado),
                    },

                    'alerta_activada': alerta_activada,
                    'alerta_esperada': alerta_esperada,
                    'clasificacion_correcta': clasificacion_correcta,
                    'alerta_correcta': alerta_correcta,
                    'interval': intervalo,
                    'timestamp': time.time(),
                    'tstart': tstart.isoformat(),
                    'tgen': tgen.isoformat(),
                }

                async_to_sync(channel_layer.group_send)(
                    'energia',
                    {'type': 'enviar_dato', 'data': data}
                )

                autonomia_txt = 'cargando/sostenido' if autonomia_h is None else f'{autonomia_h:.2f} h'
                self.stdout.write(
                    f'[{i + 1}] Esc:{escenario} | Solar={potencia_generada_w:.1f} W | '
                    f'Consumo={consumo_w:.1f} W | Balance={balance_w:.1f} W | '
                    f'SoC={soc_pct:.1f}% | Aut={autonomia_txt} | Estado={estado} | LP={lp_ms:.2f} ms'
                )

                i += 1
                time.sleep(intervalo)

        except KeyboardInterrupt:
            self.stdout.write(self.style.SUCCESS('Simulacion detenida por el usuario.'))
