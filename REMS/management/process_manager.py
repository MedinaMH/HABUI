# HABUI_APP/management/process_manager.py
import subprocess
import threading
import queue
import os
import sys
import time
import uuid
from datetime import datetime
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

class ProcessManager:
    """Gestor de procesos sin persistencia en BD"""
    
    _instance = None
    _processes = {}  # Dict {simulacion_id: process_info}
    _log_queues = {}  # Dict {simulacion_id: queue}
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def iniciar_simulacion(self, comando, argumentos):
        """Ejecuta un management command y retorna ID único"""
        try:
            # Generar ID único para esta simulación
            simulacion_id = str(uuid.uuid4())[:8]
            
            # Construir comando: python manage.py  --args
            cmd = [
                sys.executable,
                'manage.py',
                comando
            ]
            
            # Añadir argumentos
            for key, value in argumentos.items():
                cmd.append(f'--{key}')
                if value != '':
                    cmd.append(str(value))
            
            # Iniciar proceso
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1,
                cwd=os.getcwd()
            )
            
            # Crear cola para logs
            log_queue = queue.Queue()
            logs_historicos = []
            
            # Guardar información del proceso
            self._processes[simulacion_id] = {
                'id': simulacion_id,
                'process': process,
                'comando': comando,
                'argumentos': argumentos,
                'inicio': datetime.now(),
                'logs': logs_historicos,
                'estado': 'activa',
                'pid': process.pid
            }
            
            self._log_queues[simulacion_id] = log_queue
            
            # Hilos para capturar salida
            threading.Thread(
                target=self._capturar_salida,
                args=(simulacion_id, process.stdout, 'stdout'),
                daemon=True
            ).start()
            
            threading.Thread(
                target=self._capturar_salida,
                args=(simulacion_id, process.stderr, 'stderr'),
                daemon=True
            ).start()
            
            # Hilo para monitorear estado del proceso
            threading.Thread(
                target=self._monitorear_proceso,
                args=(simulacion_id,),
                daemon=True
            ).start()
            
            return simulacion_id
            
        except Exception as e:
            raise Exception(f"Error iniciando simulación: {str(e)}")
    
    def _capturar_salida(self, simulacion_id, pipe, tipo):
        """Captura líneas de salida del proceso"""
        channel_layer = get_channel_layer()
        
        for linea in iter(pipe.readline, ''):
            if linea:
                linea = linea.strip()
                
                # Guardar en lista histórica
                if simulacion_id in self._processes:
                    timestamp = datetime.now().strftime('%H:%M:%S')
                    linea_con_timestamp = f"[{timestamp}] {linea}"
                    self._processes[simulacion_id]['logs'].append(linea_con_timestamp)
                    
                    # Limitar tamaño de logs (mantener últimas 500)
                    if len(self._processes[simulacion_id]['logs']) > 500:
                        self._processes[simulacion_id]['logs'] = self._processes[simulacion_id]['logs'][-500:]
                
                # Guardar en cola para consumo inmediato
                if simulacion_id in self._log_queues:
                    self._log_queues[simulacion_id].put(linea)
                
                # Enviar por WebSocket
                try:
                    async_to_sync(channel_layer.group_send)(
                        f'simulacion_{simulacion_id}',
                        {
                            'type': 'log_message',
                            'message': linea,
                            'tipo': tipo,
                            'timestamp': datetime.now().isoformat()
                        }
                    )
                except:
                    pass
        
        pipe.close()
    
    def _monitorear_proceso(self, simulacion_id):
        """Monitorea si el proceso sigue vivo"""
        if simulacion_id not in self._processes:
            return
            
        process = self._processes[simulacion_id]['process']
        process.wait()  # Espera a que termine
        
        # Actualizar estado cuando termina
        if simulacion_id in self._processes:
            self._processes[simulacion_id]['estado'] = 'finalizada'
            
            # Notificar por WebSocket
            try:
                channel_layer = get_channel_layer()
                async_to_sync(channel_layer.group_send)(
                    f'simulacion_{simulacion_id}',
                    {
                        'type': 'estado_update',
                        'estado': 'finalizada'
                    }
                )
            except:
                pass
    
    def detener_simulacion(self, simulacion_id):
        """Detiene una simulación en ejecución"""
        if simulacion_id in self._processes:
            process_data = self._processes[simulacion_id]
            process = process_data['process']
            
            # Verificar si ya terminó
            if process.poll() is not None:
                # Ya terminó, solo limpiar
                self._limpiar_simulacion(simulacion_id)
                return True
            
            # Intentar terminar gracefulmente
            process.terminate()
            
            # Esperar hasta 3 segundos
            try:
                process.wait(timeout=3)
            except subprocess.TimeoutExpired:
                # Forzar kill si no responde
                process.kill()
                process.wait()
            
            # Actualizar estado
            if simulacion_id in self._processes:
                self._processes[simulacion_id]['estado'] = 'detenida'
            
            # Limpiar recursos
            self._limpiar_simulacion(simulacion_id)
            
            return True
        return False
    
    def _limpiar_simulacion(self, simulacion_id):
        """Limpia recursos de una simulación"""
        if simulacion_id in self._log_queues:
            del self._log_queues[simulacion_id]
    
    def obtener_simulacion(self, simulacion_id):
        """Obtiene información de una simulación"""
        if simulacion_id in self._processes:
            data = self._processes[simulacion_id].copy()
            # No necesitamos enviar el objeto process
            if 'process' in data:
                del data['process']
            return data
        return None
    
    def listar_simulaciones(self):
        """Lista todas las simulaciones (activas e inactivas)"""
        resultado = []
        for sim_id, data in self._processes.items():
            # Verificar estado actual del proceso
            process = data.get('process')
            if process and process.poll() is None:
                estado = 'activa'
            else:
                estado = data.get('estado', 'finalizada')
            
            resultado.append({
                'id': sim_id,
                'comando': data['comando'],
                'argumentos': data['argumentos'],
                'inicio': data['inicio'].isoformat() if data['inicio'] else None,
                'estado': estado,
                'pid': data['pid'],
                'logs_count': len(data['logs'])
            })
        
        # Ordenar por fecha (más recientes primero)
        resultado.sort(key=lambda x: x['inicio'], reverse=True)
        return resultado
    
    def obtener_logs(self, simulacion_id, ultimas_n=100):
        """Obtiene logs de una simulación"""
        if simulacion_id in self._processes:
            return self._processes[simulacion_id]['logs'][-ultimas_n:]
        return []

# Instancia global
process_manager = ProcessManager()