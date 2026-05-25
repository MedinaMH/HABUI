# REMS/serializers.py
from rest_framework import serializers
from .models import RecursoAgua, RecursoAlimentos, ConsumoAlimentos, RecursoCO2, RecursoOxigeno, MetricaMonitoreo
from .import models

class RecursoAguaSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecursoAgua
        fields = ['id', 'recurso', 'nivel', 'fecha_hora']

class RecursoEnergiaSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.RecursoEnergia
        fields = [
            'id',
            'recurso',

            # Variables heredadas / técnicas
            'voltaje',
            'corriente',
            'potencia',
            'factor_potencia',
            'frecuencia',

            # Generación solar
            'potencia_generada_w',
            'energia_generada_wh',
            'temperatura_panel_c',

            # Consumo
            'potencia_consumida_w',
            'energia_consumida_wh',

            # Balance
            'balance_w',
            'balance_acumulado_wh',

            # Batería
            'soc_bateria_pct',
            'energia_bateria_wh',
            'capacidad_bateria_wh',
            'autonomia_h',
            'temperatura_bateria_c',

            # Estado operativo
            'estado_energia',
            'modo_baja_energia',

            # Tiempo
            'fecha_hora',
        ]

class RecursoO2Serializer(serializers.ModelSerializer):
    class Meta:
        model = RecursoOxigeno
        fields = ['id', 'recurso', 'nivel', 'fecha_hora']

class RecursoCO2Serializer(serializers.ModelSerializer):
    class Meta:
        model = RecursoCO2
        fields = ['id', 'recurso', 'concentracion', 'fecha_hora']

class RecursoTemperaturaSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.RecursoTemperatura
        fields = ['id', 'recurso', 'valor', 'fecha_hora']

class RecursoHumedadSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.RecursoHumedad
        fields = ['id', 'recurso', 'valor', 'fecha_hora']

class ConsumoAlimentosSerializer(serializers.ModelSerializer):
    tipo_comida_display = serializers.CharField(source='get_tipo_comida_display', read_only=True)
    
    class Meta:
        model = ConsumoAlimentos
        fields = ['id', 'recurso_alimentos', 'tipo_comida', 'tipo_comida_display', 
                'personas', 'porciones', 'fecha_registro']

class RecursoAlimentosSerializer(serializers.ModelSerializer):
    consumos = ConsumoAlimentosSerializer(many=True, read_only=True)
    porcentaje_restante = serializers.SerializerMethodField()
    dias_autonomia = serializers.SerializerMethodField()
    consumo_diario_estimado = serializers.SerializerMethodField()
    
    class Meta:
        model = RecursoAlimentos
        fields = ['id', 'recurso', 'porciones_iniciales', 'porciones_actuales',
                'num_tripulantes', 'porciones_por_persona_dia', 'duracion_mision_dias',
                'fecha_registro', 'consumos', 'porcentaje_restante', 
                'dias_autonomia', 'consumo_diario_estimado']
    
    def get_porcentaje_restante(self, obj):
        if obj.porciones_iniciales > 0:
            return round((obj.porciones_actuales / obj.porciones_iniciales) * 100, 1)
        return 0
    
    def get_dias_autonomia(self, obj):
        consumo_diario = obj.num_tripulantes * obj.porciones_por_persona_dia
        if consumo_diario > 0:
            return max(0, obj.porciones_actuales // consumo_diario)
        return 0
    
    def get_consumo_diario_estimado(self, obj):
        return obj.num_tripulantes * obj.porciones_por_persona_dia
    

class MetricaMonitoreoSerializer(serializers.ModelSerializer):
    class Meta:
        model = MetricaMonitoreo
        fields = [
            'id',
            'recurso',
            'escenario',
            'sample_id',
            'valor',
            'estado_esperado',
            'estado_clasificado',
            'clasificacion_correcta',
            'alerta_esperada',
            'alerta_activada',
            'alerta_correcta',
            'tstart',
            'tgen',
            'tsync',
            'lp_ms',
            'lcr_ms',
            'trs_ms',
            'cliente',
            'fecha_registro',
        ]