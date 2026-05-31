# REMS/serializers.py
from rest_framework import serializers
from .models import RecursoAgua, RecursoCO2, RecursoOxigeno, MetricaMonitoreo
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