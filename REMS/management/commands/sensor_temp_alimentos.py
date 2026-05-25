"""
SIMULADOR DE TEMPERATURA PARA ALIMENTOS
Versión simplificada compatible con tu estructura actual

Este simulador genera lecturas realistas de temperatura para el 
almacenamiento de alimentos refrigerados. Incluye:
1. Variaciones naturales de temperatura
2. Simulación de eventos (fallas, aperturas de puerta)
3. Diferentes modos de operación
4. Estados automáticos según rangos de temperatura
5. Envío de datos por WebSocket para visualización en tiempo real

USO:
python manage.py sim_temperatura_alimentos --interval 30 --modo normal
python manage.py sim_temperatura_alimentos --modo critico --count 50
"""

import random
import time
from datetime import datetime
from django.core.management.base import BaseCommand
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

# from HABUI_APP.models import Recurso, TemperaturaAlimentos


class Command(BaseCommand):
    help = "Simula temperatura de almacenamiento de alimentos refrigerados"
    
    # CONFIGURACIÓN - Rangos de temperatura para alimentos
    TEMP_MIN = -5.0      # Límite inferior (congelación)
    TEMP_MAX = 25.0      # Límite superior (ambiente caluroso)
    
    # Umbrales importantes para alimentos
    TEMP_OPTIMA_MIN = 2.0    # Mínimo óptimo
    TEMP_OPTIMA_MAX = 8.0    # Máximo óptimo
    TEMP_ALERTA_BAJA = 2.0   # Alerta por frío
    TEMP_ALERTA_ALTA = 8.0   # Alerta por calor
    TEMP_CRITICA_BAJA = -1.0 # Crítico por frío
    TEMP_CRITICA_ALTA = 12.0 # Crítico por calor
    
    # Variación natural por ciclo
    TEMP_NOISE = 0.1

    def add_arguments(self, parser):
        """Configura los argumentos del comando"""
        parser.add_argument(
            '--interval', 
            type=float, 
            default=30.0,
            help='Segundos entre lecturas (default: 30)'
        )
        parser.add_argument(
            '--count', 
            type=int, 
            default=0,
            help='Total de lecturas (0 = infinito)'
        )
        parser.add_argument(
            '--recurso-id', 
            type=int, 
            required=False,
            help='ID del recurso en BD (opcional por ahora)'
        )
        parser.add_argument(
            '--modo', 
            type=str, 
            default='normal',
            choices=['normal', 'estable', 'alerta', 'critico', 'ciclico'],
            help='Comportamiento del simulador'
        )
        parser.add_argument(
            '--temp-inicial', 
            type=float, 
            default=4.0,
            help='Temperatura inicial en °C'
        )

    def handle(self, *args, **options):
        """Método principal que ejecuta la simulación"""
        
        # 1. Obtener parámetros de configuración
        intervalo = options['interval']
        max_count = options['count']
        modo = options['modo']
        temp_inicial = options['temp_inicial']
        
        # 2. Configurar canal WebSocket
        channel_layer = get_channel_layer()
        
        # 3. Mostrar información inicial
        self.stdout.write(self.style.SUCCESS(
            f"🚀 Iniciando simulador de temperatura para alimentos"
        ))
        self.stdout.write(f"📊 Modo: {modo} | Intervalo: {intervalo}s")
        self.stdout.write(f"🌡️  Rango óptimo: {self.TEMP_OPTIMA_MIN}-{self.TEMP_OPTIMA_MAX}°C")
        
        # 4. Configurar temperatura inicial según modo
        current_temp = self._configurar_temperatura_inicial(modo, temp_inicial)
        
        # 5. Variables de estado de la simulación
        i = 1  # Contador de ciclos
        estado_anterior = "INICIAL"
        eventos_activos = []
        
        try:
            # 6. Bucle principal de simulación
            while True:
                # Verificar límite de lecturas
                if max_count and i > max_count:
                    self.stdout.write(self.style.SUCCESS(
                        f"✅ Simulación completada ({i-1} lecturas)"
                    ))
                    break
                
                # 7. Calcular nueva temperatura
                current_temp = self._calcular_temperatura(
                    current_temp, modo, i, eventos_activos
                )
                
                # 8. Preparar timestamp
                timestamp = datetime.now()
                
                # 9. Determinar estado actual
                estado = self._determinar_estado(current_temp)
                color = self._obtener_color_estado(estado)
                
                # 10. Preparar datos para WebSocket
                data = self._preparar_datos_websocket(
                    current_temp, timestamp, estado, color, modo, eventos_activos
                )
                
                # 11. Enviar por WebSocket (para visualización en tiempo real)
                async_to_sync(channel_layer.group_send)(
                    "temperatura_alimentos",
                    {"type": "enviar_dato", "data": data}
                )
                
                # 12. Guardar en base de datos 
                # self._guardar_en_bd(current_temp, timestamp, recurso_id)
                
                # 13. Mostrar en consola
                self._mostrar_en_consola(i, current_temp, estado, eventos_activos)
                
                # 14. Controlar eventos activos
                eventos_activos = self._actualizar_eventos(eventos_activos, i)
                
                self.stdout.write(f"[{i}] Dato enviado: {data}")
                # 15. Esperar para siguiente ciclo
                i += 1
                time.sleep(intervalo)

        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING("⏹️  Simulación interrumpida por usuario"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Error: {str(e)}"))

    # ========== MÉTODOS AUXILIARES ==========

    def _configurar_temperatura_inicial(self, modo, temp_inicial):
        """Configura la temperatura inicial según el modo seleccionado"""
        if modo == 'estable':
            return 5.0  # Punto medio óptimo
        elif modo == 'alerta':
            return 10.0  # En rango de alerta
        elif modo == 'critico':
            return 16.0  # En rango crítico
        elif modo == 'ciclico':
            return temp_inicial  # Usar valor proporcionado
        else:  # normal
            return 4.0  # Óptimo inicial

    def _calcular_temperatura(self, temp_actual, modo, ciclo, eventos):
        """Calcula la nueva temperatura basada en el modo y eventos"""
        
        # Variación base según modo
        if modo == 'normal':
            variacion = random.uniform(-0.15, 0.15)
            # Simular ciclo de compresor
            if ciclo % 20 < 10:  # Compresor encendido
                variacion -= random.uniform(0.05, 0.10)
            else:  # Compresor apagado
                variacion += random.uniform(0.05, 0.10)
                
        elif modo == 'estable':
            variacion = random.uniform(-0.05, 0.05)
            
        elif modo == 'alerta':
            variacion = random.uniform(-0.1, 0.2)  # Tendencia a subir
            
        elif modo == 'critico':
            variacion = random.uniform(0.05, 0.25)  # Siempre subiendo
            
        elif modo == 'ciclico':
            # Variación según hora del día
            hora = datetime.now().hour
            if hora < 6:  # Madrugada
                variacion = random.uniform(-0.2, 0)
            elif hora < 12:  # Mañana
                variacion = random.uniform(-0.1, 0.1)
            elif hora < 18:  # Tarde
                variacion = random.uniform(0, 0.2)
            else:  # Noche
                variacion = random.uniform(-0.1, 0.1)
        else:
            variacion = 0
            
        # Aplicar variación
        nueva_temp = temp_actual + variacion
        
        # Mantener dentro de límites físicos
        return max(self.TEMP_MIN, min(self.TEMP_MAX, nueva_temp))

    def _determinar_estado(self, temperatura):
        """Clasifica la temperatura en un estado descriptivo"""
        if temperatura < self.TEMP_CRITICA_BAJA:
            return "CONGELACIÓN PELIGROSA"
        elif temperatura < self.TEMP_ALERTA_BAJA:
            return "MUY FRÍO"
        elif temperatura < self.TEMP_OPTIMA_MIN:
            return "FRÍO"
        elif temperatura <= self.TEMP_OPTIMA_MAX:
            return "ÓPTIMO"
        elif temperatura <= self.TEMP_ALERTA_ALTA:
            return "CÁLIDO"
        elif temperatura <= self.TEMP_CRITICA_ALTA:
            return "MUY CÁLIDO"
        else:
            return "PELIGRO DE DESCOMPOSICIÓN"

    def _obtener_color_estado(self, estado):
        """Devuelve código de color hexadecimal para cada estado"""
        colores = {
            "CONGELACIÓN PELIGROSA": "#3b82f6",  # Azul
            "MUY FRÍO": "#60a5fa",                # Azul claro
            "FRÍO": "#93c5fd",                   # Azul muy claro
            "ÓPTIMO": "#10b981",                 # Verde
            "CÁLIDO": "#fbbf24",                 # Amarillo
            "MUY CÁLIDO": "#f59e0b",             # Naranja
            "PELIGRO DE DESCOMPOSICIÓN": "#ef4444", # Rojo
        }
        return colores.get(estado, "#6b7280")  # Gris por defecto

    def _preparar_datos_websocket(self, temp, timestamp, estado, color, modo, eventos):
        """Prepara el diccionario de datos para WebSocket"""
        return {
            "valor": round(temp, 2),
            "temperatura": round(temp, 2),
            "fecha_hora": timestamp.strftime("%Y-%m-%d %H:%M:%S"),
            "timestamp_iso": timestamp.isoformat(),
            "unidad": "°C",
            "estado": estado,
            "estado_color": color,
            "rango_optimo_min": self.TEMP_OPTIMA_MIN,
            "rango_optimo_max": self.TEMP_OPTIMA_MAX,
            "modo_simulacion": modo,
            "eventos_activos": eventos,
            "hora_actual": timestamp.hour
        }

    def _guardar_en_bd(self, temperatura, timestamp, recurso_id):
        """Guarda la lectura en la base de datos (COMENTADO POR AHORA)"""
        # try:
        #     if recurso_id:
        #         recurso = Recurso.objects.get(id=recurso_id)
        #         TemperaturaAlimentos.objects.create(
        #             recurso=recurso,
        #             valor=round(temperatura, 2),
        #             fecha_hora=timestamp
        #         )
        #         return True
        # except Exception as e:
        #     self.stdout.write(self.style.ERROR(f"Error BD: {str(e)}"))
        #     return False
        return True  # Simular éxito por ahora

    def _mostrar_en_consola(self, ciclo, temperatura, estado, eventos):
        """Muestra la información en la consola con formato"""
        icono = "❄️" if "CONGELACIÓN" in estado else \
                "🔥" if "PELIGRO" in estado else \
                "⚠️" if "MUY" in estado else \
                "✅" if "ÓPTIMO" in estado else "🌡️"
        
        eventos_str = ""
        if eventos:
            eventos_str = " [" + ", ".join(eventos) + "]"
            
        self.stdout.write(
            f"[{ciclo:03d}] {icono} {temperatura:5.2f}°C | {estado:25s}{eventos_str}"
        )

    def _actualizar_eventos(self, eventos_actuales, ciclo):
        """Gestiona la aparición y desaparición de eventos"""
        # lógica para eventos aleatorios
        return []