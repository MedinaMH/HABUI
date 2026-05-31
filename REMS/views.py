from django.views.decorators.csrf import csrf_exempt
from django.contrib.admin.views.decorators import staff_member_required
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from .serializers import RecursoAguaSerializer, RecursoCO2Serializer, RecursoO2Serializer, MetricaMonitoreoSerializer
from .models import MetricaMonitoreo
from django.shortcuts import render
from django.http import HttpResponse, JsonResponse
from rest_framework.views import APIView
from django.utils import timezone
from django.db import transaction
from REMS.management.process_manager import process_manager
# from .utils.data_simulator import DataSimulator
import json, os
from .models import RecursoAgua, RecursoCO2, RecursoOxigeno, Recurso
from .import models, serializers
from django.conf import settings
from django.utils.translation import gettext as _

# Create your views here.

def panel_principal(request):
    return render(request, 'panel_principal.html')

def panel_all_resources(request):
    return render(request, 'all_resources.html')

# Energía
def panel_energia_rems(request):
    return render(request, 'panel_energia.html')

@api_view(['GET'])
@permission_classes([AllowAny])
def api_energia_get(request):
    datos = models.RecursoEnergia.objects.all().order_by('-fecha_hora')[:1000]
    serializer = serializers.RecursoEnergiaSerializer(datos, many=True)
    return Response(serializer.data)
#----------Recurso agua-----------------
def panel_agua_rems(request, recurso_id=None):
    contexto = {'recurso_id': recurso_id or ''}
    return render(request, 'panel_agua.html', contexto)

@api_view(['GET'])
@permission_classes([AllowAny])
def api_agua_unity(request):
    datos = RecursoAgua.objects.all().order_by('-fecha_hora')[:1000]
    serializer = RecursoAguaSerializer(datos, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([AllowAny])
def api_agua_post(request):
    serializer = RecursoAguaSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
#---------Fin recurso agua-----------------

#================O2===========
def panel_oxigeno_rems(request):
    return render(request, 'panel_oxigeno.html')

@api_view(['GET'])
@permission_classes([AllowAny])
def api_o2_get(request):
    datos = RecursoOxigeno.objects.all().order_by('-fecha_hora')[:1000]
    serializer = RecursoO2Serializer(datos, many=True)
    return Response(serializer.data)

# ============= CO2 =============
def panel_co2(request):
    return render(request, 'panel_CO2.html')

@api_view(['GET'])
@permission_classes([AllowAny])
def api_co2_get(request):
    datos = RecursoCO2.objects.all().order_by('-fecha_hora')[:1000]
    serializer = RecursoCO2Serializer(datos, many=True)
    return Response(serializer.data)

#-------------VISTAS DEL MODULO DE CONTROL------------------------
def control_inicial(request):
    return render(request, 'modulo_control/control_inicial.html')


# ================motor de simulacion =======================
def control_sensores(request):
    """Vista principal del panel de control de simulaciones"""
    escenarios = []
    json_path = os.path.join(
        settings.BASE_DIR,
        'REMS',
        'static',
        'data',
        'escenarios_simulacion.json'
    )

    try:
        with open(json_path, 'r', encoding='utf-8') as file:
            data = json.load(file)
            escenarios = data.get('escenarios', [])
    except FileNotFoundError:
        print(f"Archivo no encontrado: {json_path}")
    except json.JSONDecodeError:
        print(f"Error al decodificar JSON: {json_path}")

    context = {
        'comandos_disponibles': [
            {
                'nombre': 'sensor_agua',
                'descripcion': _('Simulador de Agua'),
                'modos': [
                    {'valor': 'normal', 'nombre': _('Normal')},
                    {'valor': 'llenado', 'nombre': _('Llenado')},
                    {'valor': 'consumo', 'nombre': _('Consumo')},
                    {'valor': 'critico', 'nombre': _('Crítico')},
                ],
                'requiere_id': True,
                'parametros_extra': ['interval', 'count']
            },
            {
                'nombre': 'sensor_CO2',
                'descripcion': _('Simulador de CO2'),
                'modos': [
                    {'valor': 'normal', 'nombre': _('Normal')},
                    {'valor': 'optimo', 'nombre': _('Óptimo')},
                    {'valor': 'advertencia', 'nombre': _('Advertencia')},
                    {'valor': 'critico', 'nombre': _('Crítico')},
                    {'valor': 'aleatorio', 'nombre': _('Aleatorio')},
                    {'valor': 'variacion', 'nombre': _('Variación')},
                ],
                'requiere_id': False,
                'parametros_extra': ['interval', 'count', 'drift', 'noise']
            },
            {
                'nombre': 'sensor_oxigeno',
                'descripcion': _('Simulador de Oxígeno'),
                'modos': [
                    {'valor': 'normal', 'nombre': _('Normal')},
                    {'valor': 'optimo', 'nombre': _('Óptimo')},
                    {'valor': 'critico_bajo', 'nombre': _('Crítico Bajo')},
                    {'valor': 'critico_alto', 'nombre': _('Crítico Alto')},
                    {'valor': 'advertencia_baja', 'nombre': _('Advertencia Baja')},
                    {'valor': 'advertencia_alta', 'nombre': _('Advertencia Alta')},
                    {'valor': 'aleatorio', 'nombre': _('Aleatorio')},
                ],
                'requiere_id': False,
                'parametros_extra': ['interval', 'count', 'drift']
            },
            {
                'nombre': 'simulador_fallas_energia',
                'descripcion': _('Simulador de Energía Solar'),
                'modos': [
                    {'valor': 'normal', 'nombre': _('Normal / Nominal')},
                    {'valor': 'warning', 'nombre': _('Advertencia')},
                    {'valor': 'critical', 'nombre': _('Crítico')},
                ],
                'requiere_id': False,
                'parametros_extra': [
                    'mode',
                    'interval',
                    'count',
                    'capacity',
                    'initial_soc',
                    'solar_max',
                    'low_energy_mode',
                    'soc_drift',
                    'noise_wh',
                ],
                'campos_extra': [
                    {
                        'nombre': 'mode',
                        'tipo': 'select',
                        'label': _('Modo energético'),
                        'default': 'normal',
                        'opciones': [
                            {'valor': 'normal', 'nombre': _('Normal / Nominal')},
                            {'valor': 'warning', 'nombre': _('Advertencia')},
                            {'valor': 'critical', 'nombre': _('Crítico')},
                        ],
                        'descripcion': _('Escenario operativo del subsistema energético')
                    },
                    {
                        'nombre': 'count',
                        'tipo': 'number',
                        'label': _('Número de iteraciones'),
                        'default': 0,
                        'step': 1,
                        'min': 0,
                        'descripcion': _('0 = ejecución continua')
                    },
                    {
                        'nombre': 'capacity',
                        'tipo': 'number',
                        'label': _('Capacidad batería (Wh)'),
                        'default': 12000,
                        'step': 100,
                        'min': 100,
                        'descripcion': _('Capacidad total del banco de baterías')
                    },
                    {
                        'nombre': 'initial_soc',
                        'tipo': 'number',
                        'label': _('SoC inicial'),
                        'default': 0.65,
                        'step': 0.01,
                        'min': 0,
                        'max': 1,
                        'descripcion': _('0.0 = 0%, 0.5 = 50%, 1.0 = 100%')
                    },
                    {
                        'nombre': 'solar_max',
                        'tipo': 'number',
                        'label': _('Potencia solar máxima (W)'),
                        'default': 3000,
                        'step': 100,
                        'min': 0,
                        'descripcion': _('Potencia máxima estimada del arreglo fotovoltaico')
                    },
                    {
                        'nombre': 'low_energy_mode',
                        'tipo': 'checkbox',
                        'label': _('Modo de baja energía'),
                        'default': False,
                        'descripcion': _('Fuerza baja generación solar y mayor consumo')
                    },
                    {
                        'nombre': 'soc_drift',
                        'tipo': 'number',
                        'label': _('Deriva SoC (%/min)'),
                        'default': 0,
                        'step': 0.1,
                        'descripcion': _('Valor negativo descarga la batería de forma forzada')
                    },
                    {
                        'nombre': 'noise_wh',
                        'tipo': 'number',
                        'label': _('Ruido batería (Wh/muestra)'),
                        'default': 2.5,
                        'step': 0.5,
                        'min': 0,
                        'descripcion': _('Perturbación aleatoria agregada al balance de batería por muestra')
                    },
                    {
                        'nombre': 'csv',
                        'tipo': 'text',
                        'label': _('Ruta CSV opcional'),
                        'default': '',
                        'descripcion': _('Si se deja vacío, usa data/energia.csv')
                    },
                ]
            },
        ],
        'escenarios_disponibles': escenarios,
    }
    return render(request, 'modulo_control/sensores.html', context)

@csrf_exempt
def api_iniciar_simulacion(request):
    """API para iniciar una simulación (sin BD)"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            comando = data.get('comando')
            argumentos = data.get('argumentos', {})
            
            # Validar comando existente
            comandos_validos = [
                'sensor_agua', 'sensor_CO2', 'sensor_oxigeno', 'simulador_fallas_energia'
            ]
            
            if comando not in comandos_validos:
                return JsonResponse({
                    'status': 'error',
                    'message': 'Comando no válido'
                }, status=400)
            
            # Validaciones específicas por comando
            if comando == 'sensor_agua' and 'recurso-id' not in argumentos:
                return JsonResponse({
                    'status': 'error',
                    'message': 'El simulador de agua requiere --recurso-id'
                }, status=400)
            
            # Iniciar proceso
            simulacion_id = process_manager.iniciar_simulacion(comando, argumentos)
            
            return JsonResponse({
                'status': 'success',
                'simulacion_id': simulacion_id,
                'message': f'Simulación {comando} iniciada'
            })
            
        except Exception as e:
            return JsonResponse({
                'status': 'error',
                'message': str(e)
            }, status=500)
    
    return JsonResponse({'error': 'Método no permitido'}, status=405)


def api_detener_simulacion(request, simulacion_id):
    """API para detener una simulación"""
    if request.method == 'POST':
        try:
            detenido = process_manager.detener_simulacion(simulacion_id)
            
            if detenido:
                return JsonResponse({
                    'status': 'success',
                    'message': 'Simulación detenida'
                })
            else:
                return JsonResponse({
                    'status': 'warning',
                    'message': 'La simulación no existe o ya terminó'
                })
                
        except Exception as e:
            return JsonResponse({
                'status': 'error',
                'message': str(e)
            }, status=500)
    
    return JsonResponse({'error': 'Método no permitido'}, status=405)


def api_listar_simulaciones(request):
    """API para listar simulaciones (activas e históricas)"""
    simulaciones = process_manager.listar_simulaciones()
    
    return JsonResponse({
        'simulaciones': simulaciones
    })


def api_detalle_simulacion(request, simulacion_id):
    """API para obtener detalles de una simulación"""
    simulacion = process_manager.obtener_simulacion(simulacion_id)
    
    if not simulacion:
        return JsonResponse({'error': 'Simulación no encontrada'}, status=404)
    
    # Obtener logs
    logs = process_manager.obtener_logs(simulacion_id, 100)
    
    data = {
        'id': simulacion['id'],
        'comando': simulacion['comando'],
        'argumentos': simulacion['argumentos'],
        'estado': simulacion['estado'],
        'inicio': simulacion['inicio'],
        'pid': simulacion['pid'],
        'logs': logs
    }
    
    return JsonResponse(data)

@api_view(['GET'])
@permission_classes([AllowAny])
def api_metricas_get(request):
    datos = MetricaMonitoreo.objects.all().order_by('-fecha_registro')[:1200]
    serializer = MetricaMonitoreoSerializer(datos, many=True)
    return Response(serializer.data)