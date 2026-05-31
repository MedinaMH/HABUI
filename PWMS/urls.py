from django.urls import path
from . import api_views, views
from django.conf import settings
from django.conf.urls.static import static

app_name = 'PWMS'
# ===== URLs WEB (interfaz HTML) =====
urlpatterns = [
    
    # Autenticación web
    path('', api_views.panel_login, name='panel_login'),
    path('login/', api_views.panel_login, name='panel_login'),
    path('logout/', api_views.panel_logout, name='panel_logout'),
    path('registro/', api_views.registro_usuario, name='registro_usuario'),
    
    # Perfil web
    path('perfil/', api_views.perfil, name='perfil'),
    path('completar_perfil/', api_views.completar_perfil, name='completar_perfil'),
    
    # Dashboard web
    path('dashboard/', api_views.pwms_dashboard, name='pwms_dashboard'),
    
    # Registros web
    path('nuevo_registro_psicologico/', api_views.nuevo_registro_psicologico, name='nuevo_registro_psicologico'),
    path('historial_psicologico/', api_views.historial_psicologico, name='historial_psicologico'),
    path('historial-psic-integrado/', api_views.historial_psicologico, name='historial_psic_integrado'),
    
    # NASA TLX (web)
    path('nasa-tlx/', api_views.nasa_tlx_create, name='nasa_tlx_create'),
    path('nasa-tlx/resultado/<int:pk>/', api_views.nasa_tlx_resultado, name='nasa_tlx_resultado'),
    path('nasa-tlx/historial/', api_views.nasa_tlx_historial, name='nasa_tlx_historial'),
    
    # Zung Anxiety (web)
    path('zung-anxiety/nuevo/', api_views.zung_anxiety_nuevo, name='zung_anxiety_nuevo'),
    path('zung-anxiety/<int:pk>/resultados/', api_views.zung_anxiety_resultados, name='zung_anxiety_resultados'),
    path('zung-anxiety/historial/', api_views.zung_anxiety_historial, name='zung_anxiety_historial'),
]
