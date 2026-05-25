from django.urls import path
from .import views

urlpatterns = [
    path('inicio_control', views.control_inicial, name='control_inicial'),
    path('control_alimentos', views.control_alimentos, name='control_alimentos'),
    path('control_sensores', views.control_sensores, name='control_sensores'),

    path('', views.panel_principal, name='panel_principal'),
    path('todos_los_recursos', views.panel_all_resources, name='all_resources'),
    path('energia_rems', views.panel_energia_rems, name='panel_energia_rems'),
    path('agua_rems', views.panel_agua_rems, name='panel_agua_rems'),
    path('agua/<int:recurso_id>/', views.panel_agua_rems, name='vista_agua'),
    path('api/agua/', views.api_agua_unity, name='api_agua_unity'), # GET
    path('api/agua/post/', views.api_agua_post, name='api_agua_post'),  # POST
    path('oxigeno_rems', views.panel_oxigeno_rems, name='panel_oxigeno_rems'),
    path('api/o2/', views.api_o2_get, name='api_o2_get'), # GET
    path('co2_rems', views.panel_co2, name='panel_co2_rems'),
    path('api/co2/', views.api_co2_get, name='api_co2_get'),# GET
    path('api/energia_get/', views.api_energia_get, name='api_energia_get'),# GET
    # ---------------Alimentos--------------------
    path('alimentos_rems', views.panel_alimentos_rems, name='panel_alimentos_rems'),
    path('alimentos-rems/<int:recurso_id>/', views.panel_alimentos_rems, name='panel_alimentos_id'),
    # API endpoints
    path('api/alimentos/estado/', views.api_alimentos_estado, name='api_alimentos_estado'),  # GET
    path('api/alimentos/consumos/recientes/', views.api_alimentos_consumos_recientes, name='api_alimentos_consumos_recientes'),  # GET
    path('api/alimentos/consumos/diarios/', views.api_alimentos_consumos_diarios, name='api_alimentos_consumos_diarios'),  # GET
    path('api/alimentos/registrar-consumo/', views.api_alimentos_registrar_consumo, name='api_alimentos_registrar_consumo'),  # POST
    path('api/alimentos/reset/', views.api_alimentos_reset, name='api_alimentos_reset'),  # POST
    # NUEVAS APIs de Administración
    path('api/alimentos/configurar-tripulacion/', views.api_alimentos_configurar_tripulacion, name='api_alimentos_configurar_tripulacion'),
    path('api/alimentos/configurar-suministros/', views.api_alimentos_configurar_suministros, name='api_alimentos_configurar_suministros'),
    path('api/alimentos/configurar-mision/', views.api_alimentos_configurar_mision, name='api_alimentos_configurar_mision'),  # Nueva
    path('api/alimentos/borrar-registros/', views.api_alimentos_borrar_registros, name='api_alimentos_borrar_registros'),
    path('api/alimentos/eliminar-registro/<int:registro_id>/', views.api_alimentos_eliminar_registro, name='api_alimentos_eliminar_registro'),
    path('api/alimentos/reiniciar-completo/', views.api_alimentos_reiniciar_completo, name='api_alimentos_reiniciar_completo'),
    path('api/alimentos/obtener-configuracion/', views.api_alimentos_obtener_configuracion, name='api_alimentos_obtener_configuracion'),
    #---------------------------------------------
    path('temperatura_rems', views.panel_temperatura_rems, name='temperatura_rems'),
    path('api/temperatura/', views.api_temperatura_get, name='api_temperatura_get'),# GET
    path('humedad_rems', views.panel_humedad_rems, name='humedad_rems'),
    path('api/humedad/', views.api_humedad_get, name='api_humedad_get'),# GET

    #========apis motor de simulacion ============
    path('api/simulaciones/iniciar/', views.api_iniciar_simulacion, name='api_iniciar_simulacion'),
    path('api/simulaciones/listar/', views.api_listar_simulaciones, name='api_listar_simulaciones'),
    path('api/simulaciones/detener/<str:simulacion_id>/', views.api_detener_simulacion, name='api_detener_simulacion'),
    path('api/simulaciones/<str:simulacion_id>/', views.api_detalle_simulacion, name='api_detalle_simulacion'),

    #===========metricas=========
    path('api/metricas_monitoreo/', views.api_metricas_get, name='api_metricas_get'),# GET

]