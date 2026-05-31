from django.contrib import admin

# Register your models here.
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User

from .models import (
    PerfilPWMS,
    EvaluacionNASATLX,
    ZungAnxietyScale,
)

class PerfilPWMSInline(admin.StackedInline):
    model = PerfilPWMS
    can_delete = False
    verbose_name_plural = 'Perfil PWMS'
    fields = ('pin', 'fecha_nacimiento', 'genero', 'telefono', 'grupo_sanguineo')

class CustomUserAdmin(UserAdmin):
    inlines = (PerfilPWMSInline,)

@admin.register(EvaluacionNASATLX)
class EvaluacionNASATLXAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'fecha_creacion', 'demanda_mental', 'demanda_fisica', 'puntuacion_total')
    list_filter = ('usuario', 'fecha_creacion')
    search_fields = ('usuario__username', 'tarea_descripcion')
    date_hierarchy = 'fecha_creacion'
    ordering = ('-fecha_creacion',)

@admin.register(ZungAnxietyScale)
class ZungAnxietyScaleAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'fecha_registro', 'puntuacion_bruta', 'puntuacion_indice', 'nivel_ansiedad')
    list_filter = ('usuario', 'fecha_registro', 'nivel_ansiedad')
    search_fields = ('usuario__username', 'observaciones')
    date_hierarchy = 'fecha_registro'
    ordering = ('-fecha_registro',)

admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)