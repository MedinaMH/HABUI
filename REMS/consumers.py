# HABUI_APP/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from REMS.management.process_manager import process_manager 

class AguaConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.group_name = "agua"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        print("WebSocket conectado al grupo:", self.group_name)

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)
        print("WebSocket desconectado del grupo:", self.group_name)

    async def enviar_dato(self, event):
        data = event["data"]
        await self.send(text_data=json.dumps(data))
        print("Enviado al WebSocket agua:", data.get("sample_id"), data.get("nivel"))

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            print("AguaConsumer recibio mensaje del cliente:", data)

            if data.get("type") == "ack_metric":
                sample_id = data.get("sample_id")
                cliente = data.get("cliente", "web")
                await self.registrar_ack(sample_id, cliente)

        except Exception as e:
            print(f"Error al procesar ACK de agua: {str(e)}")

    @database_sync_to_async
    def registrar_ack(self, sample_id, cliente):
        from django.utils import timezone
        from REMS.models import MetricaMonitoreo

        try:
            metrica = MetricaMonitoreo.objects.get(sample_id=sample_id)

            tsync = timezone.now()
            metrica.tsync = tsync
            metrica.cliente = cliente
            metrica.lcr_ms = (tsync - metrica.tgen).total_seconds() * 1000.0 if metrica.tgen else None
            metrica.trs_ms = (tsync - metrica.tstart).total_seconds() * 1000.0 if metrica.tstart else None
            metrica.save()

            print(f"ACK guardado correctamente para agua: {sample_id} desde {cliente}")

        except MetricaMonitoreo.DoesNotExist:
            print(f"No se encontro metrica de agua para sample_id={sample_id}")
        except Exception as e:
            print(f"Error al registrar ACK en metricas de agua: {str(e)}")

class EnergiaConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.group_name = "energia"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        print("WebSocket conectado al grupo:", self.group_name)

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)
        print("WebSocket desconectado del grupo:", self.group_name)

    async def enviar_dato(self, event):
        data = event["data"]
        await self.send(text_data=json.dumps(data))
        print("Enviado dato de energia:", data.get("sample_id"), data.get("battery"))

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            print("EnergiaConsumer recibio mensaje del cliente:", data)

            if data.get("type") == "ack_metric":
                sample_id = data.get("sample_id")
                cliente = data.get("cliente", "web")
                await self.registrar_ack(sample_id, cliente)

        except Exception as e:
            print(f"Error al procesar ACK de energia: {str(e)}")

    @database_sync_to_async
    def registrar_ack(self, sample_id, cliente):
        from django.utils import timezone
        from REMS.models import MetricaMonitoreo

        try:
            metrica = MetricaMonitoreo.objects.get(sample_id=sample_id)

            tsync = timezone.now()
            metrica.tsync = tsync
            metrica.cliente = cliente
            metrica.lcr_ms = (tsync - metrica.tgen).total_seconds() * 1000.0 if metrica.tgen else None
            metrica.trs_ms = (tsync - metrica.tstart).total_seconds() * 1000.0 if metrica.tstart else None
            metrica.save()

            print(f"ACK guardado correctamente para energia: {sample_id} desde {cliente}")

        except MetricaMonitoreo.DoesNotExist:
            print(f"No se encontro metrica de energia para sample_id={sample_id}")
        except Exception as e:
            print(f"Error al registrar ACK en metricas de energia: {str(e)}")

class OxigenoConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        await self.channel_layer.group_add("oxigeno", self.channel_name)
        await self.accept()
        print("Cliente conectado al canal oxigeno")

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("oxigeno", self.channel_name)
        print("Cliente desconectado del canal oxigeno")

    async def enviar_dato(self, event):
        data = event["data"]
        await self.send(text_data=json.dumps(data))
        print("Enviado al WebSocket oxigeno:", data.get("sample_id"), data.get("nivel"))

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            print("OxigenoConsumer recibio mensaje del cliente:", data)

            if data.get("type") == "ack_metric":
                sample_id = data.get("sample_id")
                cliente = data.get("cliente", "web")
                await self.registrar_ack(sample_id, cliente)

        except Exception as e:
            print(f"Error al procesar ACK de oxigeno: {str(e)}")

    @database_sync_to_async
    def registrar_ack(self, sample_id, cliente):
        from django.utils import timezone
        from REMS.models import MetricaMonitoreo

        try:
            metrica = MetricaMonitoreo.objects.get(sample_id=sample_id)

            tsync = timezone.now()
            metrica.tsync = tsync
            metrica.cliente = cliente
            metrica.lcr_ms = (tsync - metrica.tgen).total_seconds() * 1000.0 if metrica.tgen else None
            metrica.trs_ms = (tsync - metrica.tstart).total_seconds() * 1000.0 if metrica.tstart else None
            metrica.save()

            print(f"ACK guardado correctamente para oxigeno: {sample_id} desde {cliente}")

        except MetricaMonitoreo.DoesNotExist:
            print(f"No se encontro metrica de oxigeno para sample_id={sample_id}")
        except Exception as e:
            print(f"Error al registrar ACK en metricas de oxigeno: {str(e)}")

class CO2Consumer(AsyncWebsocketConsumer):

    async def connect(self):
        await self.channel_layer.group_add("co2", self.channel_name)
        await self.accept()
        print("Cliente conectado al canal CO₂")

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("co2", self.channel_name)
        print("Cliente desconectado del canal CO₂")

    async def enviar_dato(self, event):
        data = event["data"]
        await self.send(text_data=json.dumps(data))

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)

            if data.get("type") == "ack_metric":
                sample_id = data.get("sample_id")
                cliente = data.get("cliente", "web")

                await self.registrar_ack(sample_id, cliente)

        except Exception as e:
            print(f"Error al procesar ACK de CO₂: {str(e)}")

    @database_sync_to_async
    def registrar_ack(self, sample_id, cliente):
        from django.utils import timezone
        from REMS.models import MetricaMonitoreo

        try:
            metrica = MetricaMonitoreo.objects.get(sample_id=sample_id)

            tsync = timezone.now()
            metrica.tsync = tsync
            metrica.cliente = cliente
            metrica.lcr_ms = (tsync - metrica.tgen).total_seconds() * 1000.0 if metrica.tgen else None
            metrica.trs_ms = (tsync - metrica.tstart).total_seconds() * 1000.0 if metrica.tstart else None
            metrica.save()

        except MetricaMonitoreo.DoesNotExist:
            print(f"No se encontró métrica para sample_id={sample_id}")
        except Exception as e:
            print(f"Error al registrar ACK en métricas CO₂: {str(e)}")

    async def connect(self):
        await self.channel_layer.group_add("co2", self.channel_name)
        await self.accept()
        print("Cliente conectado al canal CO₂")

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("co2", self.channel_name)
        print("Cliente desconectado del canal CO₂")

    async def enviar_dato(self, event):
        # El motor de simulación envía {"type": "enviar_dato", "data": {...}}
        data = event["data"]
        await self.send(text_data=json.dumps(data))

class TemperaturaConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        await self.channel_layer.group_add("temperatura", self.channel_name)
        await self.accept()
        print("Cliente conectado al canal temperatura")

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("temperatura", self.channel_name)
        print("Cliente desconectado del canal temperatura")

    async def enviar_dato(self, event):
        data = event["data"]
        await self.send(text_data=json.dumps(data))
        print("Enviado al WebSocket temperatura:", data.get("sample_id"), data.get("valor"))

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            print("TemperaturaConsumer recibio mensaje del cliente:", data)

            if data.get("type") == "ack_metric":
                sample_id = data.get("sample_id")
                cliente = data.get("cliente", "web")
                await self.registrar_ack(sample_id, cliente)

        except Exception as e:
            print(f"Error al procesar ACK de temperatura: {str(e)}")

    @database_sync_to_async
    def registrar_ack(self, sample_id, cliente):
        from django.utils import timezone
        from REMS.models import MetricaMonitoreo

        try:
            metrica = MetricaMonitoreo.objects.get(sample_id=sample_id)

            tsync = timezone.now()
            metrica.tsync = tsync
            metrica.cliente = cliente
            metrica.lcr_ms = (tsync - metrica.tgen).total_seconds() * 1000.0 if metrica.tgen else None
            metrica.trs_ms = (tsync - metrica.tstart).total_seconds() * 1000.0 if metrica.tstart else None
            metrica.save()

            print(f"ACK guardado correctamente para temperatura: {sample_id} desde {cliente}")

        except MetricaMonitoreo.DoesNotExist:
            print(f"No se encontro metrica de temperatura para sample_id={sample_id}")
        except Exception as e:
            print(f"Error al registrar ACK en metricas de temperatura: {str(e)}")

class HumedadConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        await self.channel_layer.group_add("humedad", self.channel_name)
        await self.accept()
        print("Cliente conectado al canal humedad")

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("humedad", self.channel_name)
        print("Cliente desconectado del canal humedad")

    async def enviar_dato(self, event):
        data = event["data"]
        await self.send(text_data=json.dumps(data))
        print("Enviado al WebSocket humedad:", data.get("sample_id"), data.get("valor"))

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            print("HumedadConsumer recibio mensaje del cliente:", data)

            if data.get("type") == "ack_metric":
                sample_id = data.get("sample_id")
                cliente = data.get("cliente", "web")
                await self.registrar_ack(sample_id, cliente)

        except Exception as e:
            print(f"Error al procesar ACK de humedad: {str(e)}")

    @database_sync_to_async
    def registrar_ack(self, sample_id, cliente):
        from django.utils import timezone
        from REMS.models import MetricaMonitoreo

        try:
            metrica = MetricaMonitoreo.objects.get(sample_id=sample_id)

            tsync = timezone.now()
            metrica.tsync = tsync
            metrica.cliente = cliente
            metrica.lcr_ms = (tsync - metrica.tgen).total_seconds() * 1000.0 if metrica.tgen else None
            metrica.trs_ms = (tsync - metrica.tstart).total_seconds() * 1000.0 if metrica.tstart else None
            metrica.save()

            print(f"ACK guardado correctamente para humedad: {sample_id} desde {cliente}")

        except MetricaMonitoreo.DoesNotExist:
            print(f"No se encontro metrica de humedad para sample_id={sample_id}")
        except Exception as e:
            print(f"Error al registrar ACK en metricas de humedad: {str(e)}")

class TemperaturaAlimentosConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        await self.channel_layer.group_add("temperatura_alimentos", self.channel_name)
        await self.accept()
        print("Cliente conectado al canal Temperatura Alimentos")

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("temperatura_alimentos", self.channel_name)
        print("Cliente desconectado del canal Temperatura Alimentos")

    async def enviar_dato(self, event):
        # El motor de simulación envía {"type": "enviar_dato", "data": {...}}
        data = event["data"]
        await self.send(text_data=json.dumps(data))

class SimulacionConsumer(AsyncWebsocketConsumer):
    """WebSocket para monitorear simulaciones"""
    
    async def connect(self):
        self.simulacion_id = self.scope['url_route']['kwargs']['simulacion_id']
        self.group_name = f'simulacion_{self.simulacion_id}'
        
        # Verificar que la simulación existe
        simulacion = process_manager.obtener_simulacion(self.simulacion_id)
        
        if simulacion:
            await self.channel_layer.group_add(
                self.group_name,
                self.channel_name
            )
            await self.accept()
            
            # Enviar logs históricos al conectar
            await self.enviar_logs_historicos()
        else:
            await self.close()
    
    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        """Recibe comandos desde el frontend"""
        try:
            data = json.loads(text_data)
            comando = data.get('comando')
            
            if comando == 'detener':
                await self.detener_simulacion()
        except:
            pass
    
    async def log_message(self, event):
        """Envía logs al cliente"""
        await self.send(text_data=json.dumps({
            'tipo': 'log',
            'message': event['message'],
            'timestamp': event.get('timestamp', '')
        }))
    
    async def estado_update(self, event):
        """Envía actualización de estado"""
        await self.send(text_data=json.dumps({
            'tipo': 'estado',
            'estado': event['estado']
        }))
    
    async def enviar_logs_historicos(self):
        """Envía logs históricos al cliente"""
        logs = process_manager.obtener_logs(self.simulacion_id, 50)
        
        if logs:
            await self.send(text_data=json.dumps({
                'tipo': 'logs_historicos',
                'logs': logs
            }))
    
    async def detener_simulacion(self):
        """Detiene la simulación"""
        detenido = process_manager.detener_simulacion(self.simulacion_id)
        
        if detenido:
            await self.send(text_data=json.dumps({
                'tipo': 'estado',
                'estado': 'detenida',
                'message': 'Simulación detenida'
            }))