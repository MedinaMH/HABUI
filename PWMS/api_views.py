from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.conf import settings
from django.views.decorators.http import require_http_methods
from django.views.decorators.cache import never_cache
from django.urls import reverse
from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Avg
from django.utils import timezone
from django.http import JsonResponse, HttpResponse, HttpResponseRedirect
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.core.paginator import Paginator
from django.core.serializers.json import DjangoJSONEncoder
from xml.sax.saxutils import escape

import csv
import io
import json
import os
import time
from datetime import date, datetime, timedelta

from .models import (
    PerfilPWMS,
    ZungAnxietyScale,
    EvaluacionNASATLX,
)
from .forms import NASATLXForm, ZungAnxietyScaleForm


# ============================================================
# REGISTRO DE USUARIO
# ============================================================

@never_cache
def registro_usuario(request):
    """Registro de usuario completo con formulario de 2 pasos."""
    if request.user.is_authenticated:
        return redirect('PWMS:pwms_dashboard')

    if request.method == 'POST':
        try:
            username = request.POST.get('username')
            password = request.POST.get('password')
            pin = request.POST.get('pin')
            email = request.POST.get('email', '')
            telefono = request.POST.get('telefono')
            fecha_nacimiento = request.POST.get('fecha_nacimiento')
            genero = request.POST.get('genero')

            if User.objects.filter(username=username).exists():
                messages.error(request, 'El usuario ya existe')
                return render(request, 'registro.html')

            if not pin or len(pin) != 4 or not pin.isdigit():
                messages.error(request, 'El PIN debe tener 4 dígitos numéricos')
                return render(request, 'registro.html')

            if not telefono:
                messages.error(request, 'El teléfono es requerido')
                return render(request, 'registro.html')

            if not fecha_nacimiento:
                messages.error(request, 'La fecha de nacimiento es requerida')
                return render(request, 'registro.html')

            if not genero:
                messages.error(request, 'El género es requerido')
                return render(request, 'registro.html')

            with transaction.atomic():
                user = User.objects.create_user(
                    username=username,
                    password=password,
                    email=email
                )

                if hasattr(user, 'perfil_pwms'):
                    perfil = user.perfil_pwms
                    perfil.pin = pin
                    perfil.telefono = telefono
                    perfil.fecha_nacimiento = fecha_nacimiento
                    perfil.genero = genero
                    perfil.save()

                messages.success(request, 'Usuario registrado exitosamente. Ahora puedes iniciar sesión.')
                return redirect('PWMS:panel_login')

        except Exception as e:
            messages.error(request, f'Error al registrar usuario: {str(e)}')
            return render(request, 'registro.html')

    return render(request, 'registro.html')


# ============================================================
# LOGIN / LOGOUT
# ============================================================

@require_http_methods(["GET", "POST"])
def panel_login(request):
    """Login con PIN para PWMS."""
    if request.GET.get('logout') == '1':
        messages.info(request, 'Has cerrado sesión exitosamente.')

    if request.user.is_authenticated:
        return redirect('PWMS:pwms_dashboard')

    if request.method == 'POST':
        username = request.POST.get('username')
        pin = request.POST.get('pin')

        try:
            user = User.objects.get(username=username)

            if hasattr(user, 'perfil_pwms') and user.perfil_pwms.pin == pin:
                login(request, user)
                messages.success(request, f'¡Bienvenido {user.username}!')
                return redirect('PWMS:pwms_dashboard')

            messages.error(request, 'PIN incorrecto')

        except User.DoesNotExist:
            messages.error(request, 'Usuario no encontrado')

    response = render(request, 'login.html')
    response['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response['Pragma'] = 'no-cache'
    response['Expires'] = 'Fri, 01 Jan 1990 00:00:00 GMT'
    return response


def panel_logout(request):
    username = request.user.username if request.user.is_authenticated else "Usuario"
    user_id = request.user.id if request.user.is_authenticated else None

    logout(request)

    if request.session.session_key:
        try:
            from django.contrib.sessions.models import Session
            Session.objects.filter(session_key=request.session.session_key).delete()
        except Exception:
            pass

    if user_id:
        try:
            from django.contrib.sessions.models import Session
            active_sessions = Session.objects.filter(expire_date__gte=timezone.now())
            for session in active_sessions:
                session_data = session.get_decoded()
                if str(user_id) == session_data.get('_auth_user_id', ''):
                    session.delete()
        except Exception:
            pass

    request.session.flush()

    login_url = reverse('PWMS:panel_login')
    redirect_url = f"{login_url}?t={int(time.time())}&logout=1"
    response = HttpResponseRedirect(redirect_url)
    response['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response['Pragma'] = 'no-cache'
    response['Expires'] = 'Fri, 01 Jan 1990 00:00:00 GMT'
    response.delete_cookie('sessionid')
    response.delete_cookie('sessionid', path='/pwms/')
    response.delete_cookie('csrftoken')
    response.delete_cookie('csrftoken', path='/pwms/')
    messages.success(request, f'Sesión cerrada. Adiós {username}.')
    return response


# ============================================================
# DASHBOARD
# ============================================================

@never_cache
@login_required
def pwms_dashboard(request):
    ultimas_evaluaciones_nasa = EvaluacionNASATLX.objects.filter(
        usuario=request.user
    ).order_by('-fecha_creacion')[:5]

    ultimas_evaluaciones_zung = ZungAnxietyScale.objects.filter(
        usuario=request.user
    ).order_by('-fecha_registro')[:5]


    ultimo_tlx = EvaluacionNASATLX.objects.filter(
        usuario=request.user
    ).order_by('-fecha_creacion').first()

    ultimo_zung = ZungAnxietyScale.objects.filter(
        usuario=request.user
    ).order_by('-fecha_registro').first()


    response = render(request, 'dashboard.html', {
        'usuario': request.user,
        'perfil': request.user.perfil_pwms,
        'ultimas_evaluaciones_nasa': ultimas_evaluaciones_nasa,
        'ultimas_evaluaciones_zung': ultimas_evaluaciones_zung,
        'ultimo_tlx': ultimo_tlx,
        'ultimo_zung': ultimo_zung,
    })
    response['Cache-Control'] = 'no-store, no-cache, must-revalidate'
    return response


# ============================================================
# EVALUACIONES PSICOLÓGICAS: NASA-TLX + ZUNG
# ============================================================

@never_cache
@login_required
def nuevo_registro_psicologico(request):
    """Selector de prueba psicológica: NASA-TLX o Zung."""
    return render(request, 'nuevo_registro_psicologico.html', {
        'titulo': 'Nueva evaluación psicológica'
    })


@never_cache
@login_required
def historial_psicologico(request):
    from django.db.models import Avg
    
    evaluaciones_nasa = EvaluacionNASATLX.objects.filter(usuario=request.user).order_by('-fecha_creacion')
    pruebas_zung = ZungAnxietyScale.objects.filter(usuario=request.user).order_by('-fecha_registro')
    
    total_nasa = evaluaciones_nasa.count()
    total_zung = pruebas_zung.count()
    
    promedio_carga = evaluaciones_nasa.aggregate(promedio=Avg('puntuacion_total'))['promedio'] or 0
    promedio_ansiedad = pruebas_zung.aggregate(promedio=Avg('puntuacion_indice'))['promedio'] or 0
    
    distribucion_carga = {
        'baja': evaluaciones_nasa.filter(puntuacion_total__lt=30).count(),
        'moderada': evaluaciones_nasa.filter(puntuacion_total__gte=30, puntuacion_total__lt=60).count(),
        'alta': evaluaciones_nasa.filter(puntuacion_total__gte=60).count(),
    }
    
    distribucion_zung = {
        'normal': pruebas_zung.filter(nivel_ansiedad='normal').count(),
        'minima': pruebas_zung.filter(nivel_ansiedad='minima').count(),
        'marcada': pruebas_zung.filter(nivel_ansiedad='marcada').count(),
        'extrema': pruebas_zung.filter(nivel_ansiedad='extrema').count(),
    }
    
    context = {
        'evaluaciones_nasa': evaluaciones_nasa,
        'pruebas_zung': pruebas_zung,
        'total_nasa': total_nasa,
        'total_zung': total_zung,
        'promedio_carga': round(promedio_carga, 1),
        'promedio_ansiedad': round(promedio_ansiedad, 1),
        'distribucion_carga': distribucion_carga,
        'distribucion_zung': distribucion_zung,
    }
    
    return render(request, 'historial_psicologico.html', context)

@never_cache
@login_required
def historial_psic_integrado(request):
    """Alias para compatibilidad con URL anterior."""
    return historial_psicologico(request)

# ============================================================
# NASA-TLX
# ============================================================

@login_required
def nasa_tlx_create(request):
    if request.method == 'POST':
        form = NASATLXForm(request.POST)

        if form.is_valid():
            evaluacion = form.save(commit=False)
            evaluacion.usuario = request.user

            comparaciones = [f'comparacion_{i}' for i in range(1, 16)]
            pesos = {
                'demanda_mental': 0,
                'demanda_fisica': 0,
                'demanda_temporal': 0,
                'rendimiento': 0,
                'esfuerzo': 0,
                'frustracion': 0,
            }

            for c in comparaciones:
                seleccion = request.POST.get(c)
                if seleccion in pesos:
                    pesos[seleccion] += 1

            for key, value in pesos.items():
                setattr(evaluacion, f'peso_{key}', value)

            evaluacion.save()
            messages.success(request, 'Evaluación NASA-TLX guardada correctamente')
            return redirect('PWMS:nasa_tlx_resultado', pk=evaluacion.pk)

        messages.error(request, 'Error en el formulario')
    else:
        form = NASATLXForm()

    return render(request, 'PWMS:nasa_tlx_form.html', {'form': form})


@login_required
def nasa_tlx_historial(request):
    evaluaciones = EvaluacionNASATLX.objects.filter(
        usuario=request.user
    ).order_by('-id')

    total = evaluaciones.count()
    promedio = evaluaciones.aggregate(
        Avg('puntuacion_total')
    )['puntuacion_total__avg'] or 0

    paginator = Paginator(evaluaciones, 10)
    page = request.GET.get('page')

    return render(request, 'nasa_tlx_historial.html', {
        'evaluaciones': paginator.get_page(page),
        'total_evaluaciones': total,
        'promedio_carga': round(promedio, 1),
    })


@login_required
def nasa_tlx_resultado(request, pk):
    evaluacion = get_object_or_404(
        EvaluacionNASATLX,
        pk=pk,
        usuario=request.user
    )

    punt = evaluacion.puntuacion_total

    if punt < 30:
        color, icono, interpretacion = 'success', 'bi-emoji-smile', 'Carga BAJA'
    elif punt < 60:
        color, icono, interpretacion = 'warning', 'bi-emoji-neutral', 'Carga MODERADA'
    else:
        color, icono, interpretacion = 'danger', 'bi-emoji-frown', 'Carga ALTA'

    dimensiones = [
        {'dimension': 'Demanda Mental', 'puntuacion': evaluacion.demanda_mental, 'peso': evaluacion.peso_demanda_mental},
        {'dimension': 'Demanda Física', 'puntuacion': evaluacion.demanda_fisica, 'peso': evaluacion.peso_demanda_fisica},
        {'dimension': 'Demanda Temporal', 'puntuacion': evaluacion.demanda_temporal, 'peso': evaluacion.peso_demanda_temporal},
        {'dimension': 'Rendimiento', 'puntuacion': evaluacion.rendimiento, 'peso': evaluacion.peso_rendimiento},
        {'dimension': 'Esfuerzo', 'puntuacion': evaluacion.esfuerzo, 'peso': evaluacion.peso_esfuerzo},
        {'dimension': 'Frustración', 'puntuacion': evaluacion.frustracion, 'peso': evaluacion.peso_frustracion},
    ]

    return render(request, 'nasa_tlx_resultado.html', {
        'evaluacion': evaluacion,
        'color': color,
        'icono': icono,
        'interpretacion': interpretacion,
        'dimensiones': dimensiones,
    })


# ============================================================
# ZUNG SAS
# ============================================================

@login_required
def zung_anxiety_nuevo(request):
    if request.method == 'POST':
        form = ZungAnxietyScaleForm(request.POST)

        if form.is_valid():
            evaluacion = form.save(commit=False)
            evaluacion.usuario = request.user
            evaluacion.save()

            messages.success(request, 'Evaluación Zung guardada correctamente')
            return redirect('PWMS:zung_anxiety_resultados', pk=evaluacion.pk)

        messages.error(request, f'Error: {form.errors}')
    else:
        form = ZungAnxietyScaleForm()

    return render(request, 'zung_anxiety_form.html', {'form': form})


@login_required
def zung_anxiety_resultados(request, pk):
    prueba = get_object_or_404(
        ZungAnxietyScale,
        pk=pk,
        usuario=request.user
    )

    respuestas = [
        prueba.p01_me_siento_mas_nervioso,
        prueba.p02_siento_miedo_sin_razon,
        prueba.p03_me_siento_alterado,
        prueba.p04_siento_que_me_desmorono,
        prueba.p05_siento_que_todo_bien,
        prueba.p06_temblor_sacudidas,
        prueba.p07_dolores_cabeza_cuello,
        prueba.p08_debilidad_fatiga,
        prueba.p09_siento_calma_tranquilidad,
        prueba.p10_siento_latidos_corazon,
        prueba.p11_mareos,
        prueba.p12_desmayos,
        prueba.p13_respiracion_normal,
        prueba.p14_entumecimiento_hormigueo,
        prueba.p15_dolores_estomacales,
        prueba.p16_necesidad_orinar,
        prueba.p17_manos_calidas_secas,
        prueba.p18_sonrojo_bochorno,
        prueba.p19_duermo_bien_descanso,
        prueba.p20_pesadillas,
    ]

    return render(request, 'zung_anxiety_resultados.html', {
        'prueba': prueba,
        'conteo_r1': respuestas.count(1),
        'conteo_r2': respuestas.count(2),
        'conteo_r3': respuestas.count(3),
        'conteo_r4': respuestas.count(4),
    })


@login_required
def zung_anxiety_historial(request):
    pruebas = ZungAnxietyScale.objects.filter(
        usuario=request.user
    ).order_by('-id')

    total = pruebas.count()
    promedio = pruebas.aggregate(
        Avg('puntuacion_indice')
    )['puntuacion_indice__avg'] or 0

    paginator = Paginator(pruebas, 10)
    page = request.GET.get('page')

    return render(request, 'zung_anxiety_historial.html', {
        'pruebas': paginator.get_page(page),
        'total_evaluaciones': total,
        'promedio_indice': round(promedio, 1),
    })
@never_cache
@login_required
def grafica_psicologico(request):
    return historial_psicologico(request)


# ============================================================
# PERFIL
# ============================================================

@never_cache
@login_required
def perfil(request):
    perfil_obj, _ = PerfilPWMS.objects.get_or_create(
        usuario=request.user,
        defaults={'pin': '0000'}
    )

    context = {
        'perfil': perfil_obj,
        'total_psicologico': (
            EvaluacionNASATLX.objects.filter(usuario=request.user).count()
            + ZungAnxietyScale.objects.filter(usuario=request.user).count()
        ),

    }

    return render(request, 'perfil.html', context)


@never_cache
@login_required
def completar_perfil(request):
    perfil_obj, _ = PerfilPWMS.objects.get_or_create(
        usuario=request.user,
        defaults={'pin': '0000'}
    )

    if request.method == 'POST':
        if request.FILES.get('foto'):
            perfil_obj.foto = request.FILES.get('foto')

        perfil_obj.nombre_completo = request.POST.get('nombre_completo')
        perfil_obj.telefono = request.POST.get('telefono')
        perfil_obj.fecha_nacimiento = request.POST.get('fecha_nacimiento') or None
        perfil_obj.genero = request.POST.get('genero')

        pin = request.POST.get('pin')
        if pin and len(pin) == 4 and pin.isdigit():
            perfil_obj.pin = pin
        else:
            messages.error(request, "El PIN debe tener exactamente 4 números.")
            return redirect('PWMS:completar_perfil')

        perfil_obj.grupo_sanguineo = request.POST.get('grupo_sanguineo')
        perfil_obj.alergias = request.POST.get('alergias')
        perfil_obj.medicamentos = request.POST.get('medicamentos')
        perfil_obj.condiciones_medicas = request.POST.get('condiciones_medicas')
        perfil_obj.psicologo_asignado = request.POST.get('psicologo_asignado')
        perfil_obj.motivo_consulta = request.POST.get('motivo_consulta')
        perfil_obj.compartir_datos_medicos = 'compartir_datos_medicos' in request.POST
        perfil_obj.recibir_recordatorios = 'recibir_recordatorios' in request.POST

        perfil_obj.save()
        messages.success(request, "Perfil actualizado correctamente.")
        return redirect('PWMS:perfil')

    return render(request, 'completar_perfil.html', {
        'perfil': perfil_obj
    })


# ============================================================
# ENDPOINTS API
# ============================================================

@csrf_exempt
@require_POST
def upload_health_csv(request):
    try:
        auth_header = request.headers.get('Authorization', '')

        if not auth_header.startswith('Token '):
            return JsonResponse({
                'status': 'error',
                'message': 'Token de autenticación requerido'
            }, status=401)

        if 'csv_file' not in request.FILES:
            return JsonResponse({
                'status': 'error',
                'message': 'No se envió archivo CSV'
            }, status=400)

        csv_file = request.FILES['csv_file']
        file_content = csv_file.read().decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(file_content))

        records = []
        for row in csv_reader:
            try:
                records.append({
                    'id': row.get('id', ''),
                    'timestamp': row.get('timestamp_unix', ''),
                    'fecha_hora': row.get('fecha_hora', ''),
                    'pasos': int(row.get('pasos', 0)),
                    'ritmo_cardiaco': int(row.get('ritmo_cardiaco', 0)),
                    'estres_nivel': float(row.get('estres_nivel_calculado', 0)),
                    'estres_categoria': row.get('estres_categoria', '')
                })
            except (ValueError, KeyError):
                continue

        return JsonResponse({
            'status': 'success',
            'message': 'CSV procesado correctamente',
            'records_processed': len(records),
            'total_records_in_csv': len(records),
            'server_timestamp': timezone.now().isoformat(),
            'sample_record': records[0] if records else None
        }, status=200)

    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': f'Error procesando CSV: {str(e)}'
        }, status=500)

@login_required
def api_ml_datos_psicologicos(request):
    try:
        desde = request.GET.get('desde')
        hasta = request.GET.get('hasta')
        limite = int(request.GET.get('limite', 1000))

        nasa_qs = EvaluacionNASATLX.objects.filter(usuario=request.user)
        zung_qs = ZungAnxietyScale.objects.filter(usuario=request.user)

        if desde:
            fecha_desde = datetime.strptime(desde, '%Y-%m-%d')
            nasa_qs = nasa_qs.filter(fecha_creacion__gte=fecha_desde)
            zung_qs = zung_qs.filter(fecha_registro__gte=fecha_desde)

        if hasta:
            fecha_hasta = datetime.strptime(hasta, '%Y-%m-%d') + timedelta(days=1)
            nasa_qs = nasa_qs.filter(fecha_creacion__lte=fecha_hasta)
            zung_qs = zung_qs.filter(fecha_registro__lte=fecha_hasta)

        data = {'nasa_tlx': [], 'zung_sas': []}

        for e in nasa_qs.order_by('fecha_creacion')[:limite]:
            data['nasa_tlx'].append({
                'id': e.id,
                'fecha_unix': int(e.fecha_creacion.timestamp()),
                'fecha': e.fecha_creacion.isoformat(),
                'demanda_mental': e.demanda_mental,
                'demanda_fisica': e.demanda_fisica,
                'demanda_temporal': e.demanda_temporal,
                'rendimiento': e.rendimiento,
                'esfuerzo': e.esfuerzo,
                'frustracion': e.frustracion,
                'puntuacion_total': e.puntuacion_total,
            })

        for z in zung_qs.order_by('fecha_registro')[:limite]:
            data['zung_sas'].append({
                'id': z.id,
                'fecha_unix': int(z.fecha_registro.timestamp()),
                'fecha': z.fecha_registro.isoformat(),
                'puntuacion_bruta': z.puntuacion_bruta,
                'puntuacion_indice': z.puntuacion_indice,
                'nivel_ansiedad': z.nivel_ansiedad,
            })

        return JsonResponse({'data': data})

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


def _scale_zung_to_1_10(value):
    if value is None:
        return ''
    try:
        # Zung índice: 25-100. Se normaliza a 1-10.
        return f"{((float(value) - 25.0) / 75.0 * 9.0 + 1.0):.1f}"
    except (TypeError, ValueError, ZeroDivisionError):
        return ''

