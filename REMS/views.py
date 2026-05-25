from django.views.decorators.csrf import csrf_exempt
from django.contrib.admin.views.decorators import staff_member_required
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from .serializers import RecursoAguaSerializer, RecursoAlimentosSerializer, ConsumoAlimentosSerializer, RecursoCO2Serializer, RecursoO2Serializer, MetricaMonitoreoSerializer
from .models import RecursoAlimentos, ConsumoAlimentos, MetricaMonitoreo
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
# ----------recurso alimentos-----------------

def panel_alimentos_rems(request, recurso_id=None):
    contexto = {'recurso_id': recurso_id or ''}
    return render(request, 'panel_alimentos.html', contexto)

@api_view(['GET'])
@permission_classes([AllowAny])
def api_alimentos_estado(request):
    try:
        recurso = Recurso.objects.first()

        if not recurso:
            return Response({'error': 'No existe recurso base'}, status=404)

        recurso_alimentos, _ = RecursoAlimentos.objects.get_or_create(
            recurso=recurso,
            defaults={
                'porciones_iniciales': 112,
                'porciones_actuales': 112,
                'num_tripulantes': 4,
                'porciones_por_persona_dia': 4,
                'duracion_mision_dias': 7
            }
        )

        serializer = RecursoAlimentosSerializer(recurso_alimentos)
        return Response(serializer.data)

    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def api_alimentos_consumos_recientes(request):
    """
    Obtiene los consumos más recientes
    """
    try:
        consumos = ConsumoAlimentos.objects.all().order_by('-fecha_registro')[:50]
        serializer = ConsumoAlimentosSerializer(consumos, many=True)
        return Response(serializer.data)
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([AllowAny])
def api_alimentos_consumos_diarios(request):
    """
    Obtiene el resumen de consumo del día actual
    """
    try:
        hoy = timezone.now().date()
        consumos_hoy = ConsumoAlimentos.objects.filter(fecha_registro__date=hoy)
        
        # Obtener recurso de alimentos para configuración
        recurso_alimentos = RecursoAlimentos.objects.first()
        
        # Calcular resumen por tipo de comida
        resumen = {
            'desayuno': {'porciones': 0, 'personas': 0},
            'almuerzo': {'porciones': 0, 'personas': 0},
            'comida': {'porciones': 0, 'personas': 0},
            'cena': {'porciones': 0, 'personas': 0},
            'total_porciones': 0,
            'total_personas': 0
        }
        
        for consumo in consumos_hoy:
            tipo = consumo.tipo_comida
            if tipo in resumen:
                resumen[tipo]['porciones'] += consumo.porciones
                resumen[tipo]['personas'] += consumo.personas
                resumen['total_porciones'] += consumo.porciones
                resumen['total_personas'] += consumo.personas
        
        # Configuración actual
        configuracion = {
            'tripulantes': recurso_alimentos.num_tripulantes if recurso_alimentos else 4,
            'porciones_por_persona_dia': recurso_alimentos.porciones_por_persona_dia if recurso_alimentos else 4,
            'consumo_esperado_diario': (recurso_alimentos.num_tripulantes * recurso_alimentos.porciones_por_persona_dia) if recurso_alimentos else 16
        }
        
        return Response({
            'fecha': hoy.isoformat(),
            'configuracion': configuracion,  # Agregar configuración
            'resumen': resumen,
            'detalles': ConsumoAlimentosSerializer(consumos_hoy, many=True).data
        })
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([AllowAny])
def api_alimentos_registrar_consumo(request):
    """
    Registra un nuevo consumo de alimentos y actualiza las porciones disponibles
    """
    try:
        data = request.data
        
        # Validar datos requeridos
        tipo_comida = data.get('tipo_comida')
        personas = data.get('personas')
        porciones = data.get('porciones')
        
        if not tipo_comida or tipo_comida not in ['desayuno', 'almuerzo', 'comida', 'cena']:
            return Response(
                {'error': 'Tipo de comida inválido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not personas or int(personas) <= 0:
            return Response(
                {'error': 'Número de personas inválido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not porciones or int(porciones) <= 0:
            return Response(
                {'error': 'Número de porciones inválido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        personas = int(personas)
        porciones = int(porciones)
        
        # Usar transacción atómica para evitar inconsistencias
        with transaction.atomic():
            # Obtener recurso de alimentos (bloquear para evitar condiciones de carrera)
            recurso_alimentos = RecursoAlimentos.objects.select_for_update().first()
            
            if not recurso_alimentos:
                return Response(
                    {'error': 'No se encontró recurso de alimentos'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Verificar si hay suficientes porciones
            if porciones > recurso_alimentos.porciones_actuales:
                return Response({
                    'error': f'No hay suficientes porciones. Disponibles: {recurso_alimentos.porciones_actuales}',
                    'porciones_disponibles': recurso_alimentos.porciones_actuales
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 1. Crear registro del consumo
            consumo = ConsumoAlimentos.objects.create(
                recurso_alimentos=recurso_alimentos,
                tipo_comida=tipo_comida,
                personas=personas,
                porciones=porciones
            )
            
            # 2. Actualizar porciones disponibles
            recurso_alimentos.porciones_actuales -= porciones
            recurso_alimentos.save()
        
        # Serializar respuesta
        consumo_serializer = ConsumoAlimentosSerializer(consumo)
        recurso_serializer = RecursoAlimentosSerializer(recurso_alimentos)
        
        return Response({
            'success': True,
            'message': f'Consumo registrado: {porciones} porciones en {tipo_comida}',
            'consumo': consumo_serializer.data,
            'recurso_alimentos': recurso_serializer.data
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([AllowAny])
def api_alimentos_reset(request):
    """
    Resetea las porciones disponibles a su valor inicial
    """
    try:
        recurso_alimentos = RecursoAlimentos.objects.first()
        
        if not recurso_alimentos:
            return Response(
                {'error': 'No se encontró recurso de alimentos'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Resetear porciones
        recurso_alimentos.porciones_actuales = recurso_alimentos.porciones_iniciales
        recurso_alimentos.save()
        
        serializer = RecursoAlimentosSerializer(recurso_alimentos)
        
        return Response({
            'success': True,
            'message': f'Porciones reseteadas a {recurso_alimentos.porciones_actuales}',
            'data': serializer.data
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
# ---------- Funciones de Administración para Alimentos ----------

@api_view(['POST'])
@permission_classes([AllowAny])
def api_alimentos_configurar_tripulacion(request):
    """
    Configura el número de tripulantes para la misión
    """
    try:
        data = request.data
        tripulantes = data.get('tripulantes')
        
        if not tripulantes:
            return Response(
                {'error': 'Se requiere el número de tripulantes'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        tripulantes = int(tripulantes)
        
        if tripulantes < 1 or tripulantes > 6:
            return Response(
                {'error': 'El número de tripulantes debe estar entre 1 y 6'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Obtener el recurso de alimentos
        recurso_alimentos = RecursoAlimentos.objects.first()
        
        if not recurso_alimentos:
            return Response(
                {'error': 'No se encontró recurso de alimentos'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        with transaction.atomic():
            # Actualizar número de tripulantes
            recurso_alimentos.num_tripulantes = tripulantes
            recurso_alimentos.save()
        
        serializer = RecursoAlimentosSerializer(recurso_alimentos)
        
        return Response({
            'success': True,
            'message': f'Tripulación configurada a {tripulantes} personas',
            'tripulantes': tripulantes,
            'recurso_alimentos': serializer.data
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([AllowAny])
def api_alimentos_configurar_suministros(request):
    """
    Configura las porciones iniciales totales
    """
    try:
        data = request.data
        porciones_iniciales = data.get('porciones_iniciales')
        
        if not porciones_iniciales:
            return Response(
                {'error': 'Se requiere el número de porciones iniciales'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        porciones_iniciales = int(porciones_iniciales)
        
        if porciones_iniciales <= 0:
            return Response(
                {'error': 'Las porciones iniciales deben ser mayores a 0'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Obtener el recurso de alimentos
        recurso_alimentos = RecursoAlimentos.objects.first()
        
        if not recurso_alimentos:
            return Response(
                {'error': 'No se encontró recurso de alimentos'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Calcular la diferencia para ajustar las porciones actuales
        diferencia = porciones_iniciales - recurso_alimentos.porciones_iniciales
        
        with transaction.atomic():
            # Actualizar porciones iniciales
            recurso_alimentos.porciones_iniciales = porciones_iniciales
            
            # Ajustar porciones actuales manteniendo la misma proporción de consumo
            recurso_alimentos.porciones_actuales += diferencia
            
            # Asegurarse de que no haya valores negativos
            if recurso_alimentos.porciones_actuales < 0:
                recurso_alimentos.porciones_actuales = 0
            
            recurso_alimentos.save()
        
        serializer = RecursoAlimentosSerializer(recurso_alimentos)
        
        return Response({
            'success': True,
            'message': f'Suministros configurados: {porciones_iniciales} porciones iniciales',
            'recurso_alimentos': serializer.data
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([AllowAny])
def api_alimentos_configurar_mision(request):
    """
    Configura todos los parámetros de la misión
    """
    try:
        data = request.data
        
        # Obtener el recurso de alimentos
        recurso_alimentos = RecursoAlimentos.objects.first()
        
        if not recurso_alimentos:
            return Response(
                {'error': 'No se encontró recurso de alimentos'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        with transaction.atomic():
            # Actualizar tripulantes si se proporciona
            if 'tripulantes' in data:
                tripulantes = int(data['tripulantes'])
                if 1 <= tripulantes <= 6:
                    recurso_alimentos.num_tripulantes = tripulantes
            
            # Actualizar porciones por persona si se proporciona
            if 'porciones_por_persona_dia' in data:
                porciones_pp = int(data['porciones_por_persona_dia'])
                if porciones_pp > 0:
                    recurso_alimentos.porciones_por_persona_dia = porciones_pp
            
            # Actualizar duración de misión si se proporciona
            if 'duracion_mision_dias' in data:
                duracion = int(data['duracion_mision_dias'])
                if duracion > 0:
                    recurso_alimentos.duracion_mision_dias = duracion
            
            # Actualizar porciones iniciales si se proporciona
            if 'porciones_iniciales' in data:
                porciones_iniciales = int(data['porciones_iniciales'])
                if porciones_iniciales > 0:
                    # Calcular diferencia para ajustar porciones actuales
                    diferencia = porciones_iniciales - recurso_alimentos.porciones_iniciales
                    recurso_alimentos.porciones_iniciales = porciones_iniciales
                    recurso_alimentos.porciones_actuales += diferencia
                    
                    # Asegurarse de que no haya valores negativos
                    if recurso_alimentos.porciones_actuales < 0:
                        recurso_alimentos.porciones_actuales = 0
            
            recurso_alimentos.save()
        
        serializer = RecursoAlimentosSerializer(recurso_alimentos)
        
        return Response({
            'success': True,
            'message': 'Configuración de misión actualizada',
            'recurso_alimentos': serializer.data
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([AllowAny])
def api_alimentos_borrar_registros(request):
    """
    Borra todos los registros de consumo
    """
    try:
        # Obtener el recurso de alimentos
        recurso_alimentos = RecursoAlimentos.objects.first()
        
        if not recurso_alimentos:
            return Response(
                {'error': 'No se encontró recurso de alimentos'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Contar registros antes de borrar
        total_registros = ConsumoAlimentos.objects.count()
        
        with transaction.atomic():
            # Borrar todos los registros
            ConsumoAlimentos.objects.all().delete()
        
        return Response({
            'success': True,
            'message': f'{total_registros} registros de consumo han sido eliminados',
            'registros_eliminados': total_registros
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['DELETE'])
@permission_classes([AllowAny])
def api_alimentos_eliminar_registro(request, registro_id):
    """
    Elimina un registro específico de consumo y restaura las porciones
    """
    try:
        # Buscar el registro
        try:
            registro = ConsumoAlimentos.objects.get(id=registro_id)
        except ConsumoAlimentos.DoesNotExist:
            return Response(
                {'error': 'Registro no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        with transaction.atomic():
            # Obtener el recurso de alimentos
            recurso_alimentos = registro.recurso_alimentos
            
            # Restaurar las porciones consumidas
            recurso_alimentos.porciones_actuales += registro.porciones
            
            # Asegurarse de que no exceda las porciones iniciales
            if recurso_alimentos.porciones_actuales > recurso_alimentos.porciones_iniciales:
                recurso_alimentos.porciones_actuales = recurso_alimentos.porciones_iniciales
            
            recurso_alimentos.save()
            
            # Eliminar el registro
            registro.delete()
        
        return Response({
            'success': True,
            'message': f'Registro eliminado y {registro.porciones} porciones restauradas'
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([AllowAny])
def api_alimentos_reiniciar_completo(request):
    """
    Reinicia completamente el sistema: suministros, registros y configuración
    """
    try:
        data = request.data
        
        # Obtener el recurso de alimentos
        recurso_alimentos = RecursoAlimentos.objects.first()
        
        if not recurso_alimentos:
            # Crear uno nuevo si no existe
            recurso_alimentos = RecursoAlimentos.objects.create(
                nombre='Alimentos Misión Espacial',
                porciones_iniciales=112,
                porciones_actuales=112,
                num_tripulantes=4,
                porciones_por_persona_dia=4,
                duracion_mision_dias=7
            )
        
        with transaction.atomic():
            # 1. Borrar todos los registros de consumo
            ConsumoAlimentos.objects.all().delete()
            
            # 2. Resetear valores por defecto o usar los proporcionados
            recurso_alimentos.num_tripulantes = int(data.get('tripulantes', 4))
            recurso_alimentos.porciones_por_persona_dia = int(data.get('porciones_por_persona_dia', 4))
            recurso_alimentos.duracion_mision_dias = int(data.get('duracion_mision_dias', 7))
            
            # 3. Configurar porciones
            porciones_iniciales = int(data.get('porciones_iniciales', 112))
            recurso_alimentos.porciones_iniciales = porciones_iniciales
            recurso_alimentos.porciones_actuales = porciones_iniciales
            
            # 4. Guardar
            recurso_alimentos.save()
        
        serializer = RecursoAlimentosSerializer(recurso_alimentos)
        
        return Response({
            'success': True,
            'message': 'Sistema reiniciado completamente',
            'recurso_alimentos': serializer.data
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([AllowAny])
def api_alimentos_obtener_configuracion(request):
    """
    Obtiene la configuración actual del sistema
    """
    try:
        # Obtener recurso de alimentos
        recurso_alimentos = RecursoAlimentos.objects.first()
        
        if not recurso_alimentos:
            return Response({
                'success': True,
                'configuracion': {
                    'tripulantes': 4,
                    'porciones_por_persona_dia': 4,
                    'duracion_mision_dias': 7,
                    'porciones_iniciales': 112,
                    'porciones_actuales': 112,
                    'consumo_diario_estimado': 16,  # 4×4
                    'dias_autonomia': 7  # 112÷16
                }
            })
        
        serializer = RecursoAlimentosSerializer(recurso_alimentos)
        
        return Response({
            'success': True,
            'configuracion': serializer.data
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
#----------------Fin recurso alimentos----------------------------

#=============== Temperatura ===============
def panel_temperatura_rems(request):
    return render(request, 'REMS/panel_temperatura.html')

@api_view(['GET'])
@permission_classes([AllowAny])
def api_temperatura_get(request):
    datos = models.RecursoTemperatura.objects.all().order_by('-fecha_hora')[:1000]
    serializer = serializers.RecursoTemperaturaSerializer(datos, many=True)
    return Response(serializer.data)

#=============== Humedad ===============
def panel_humedad_rems(request):
    return render(request, 'REMS/panel_humedad.html')

@api_view(['GET'])
@permission_classes([AllowAny])
def api_humedad_get(request):
    datos = models.RecursoHumedad.objects.all().order_by('-fecha_hora')[:1000]
    serializer = serializers.RecursoHumedadSerializer(datos, many=True)
    return Response(serializer.data)


#-------------VISTAS DEL MODULO DE CONTROL------------------------
def control_inicial(request):
    return render(request, 'modulo_control/control_inicial.html')

def control_alimentos(request):
    return render(request, 'modulo_control/control_alimentos.html')


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
                'nombre': 'sensor_humedad',
                'descripcion': _('Simulador de Humedad'),
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
                'nombre': 'sensor_temperatura',
                'descripcion': _('Simulador de Temperatura'),
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
                'sensor_agua', 'sensor_CO2', 'sensor_oxigeno', 
                'sensor_humedad', 'sensor_temperatura', 'simulador_fallas_energia'
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