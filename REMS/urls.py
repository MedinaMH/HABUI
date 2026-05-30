from django.urls import path
from .import views

urlpatterns = [
    path('inicio_control', views.control_inicial, name='control_inicial'),
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

    #========apis motor de simulacion ============
    path('api/simulaciones/iniciar/', views.api_iniciar_simulacion, name='api_iniciar_simulacion'),
    path('api/simulaciones/listar/', views.api_listar_simulaciones, name='api_listar_simulaciones'),
    path('api/simulaciones/detener/<str:simulacion_id>/', views.api_detener_simulacion, name='api_detener_simulacion'),
    path('api/simulaciones/<str:simulacion_id>/', views.api_detalle_simulacion, name='api_detalle_simulacion'),

    #===========metricas=========
    path('api/metricas_monitoreo/', views.api_metricas_get, name='api_metricas_get'),# GET

]