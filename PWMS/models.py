from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.validators import MinValueValidator, MaxValueValidator
from datetime import date, timedelta
from django.utils.translation import gettext_lazy as _

class PerfilPWMS(models.Model):
    """
    Perfil extendido para usuarios del sistema PWMS
    """
    usuario = models.OneToOneField(User, on_delete=models.CASCADE, related_name='perfil_pwms')
    # Foto de perfil 
    foto = models.ImageField(upload_to='foto_perfil/', null=True, blank=True, verbose_name="Foto de perfil")
    # Datos personales
    nombre_completo = models.CharField(max_length=150, null=True, blank=True)
    fecha_nacimiento = models.DateField(null=True, blank=True)
    genero = models.CharField(max_length=20, choices=[
        ('masculino', _('Masculino')),
        ('femenino', _('Femenino')),
        ('otro', _('Otro')),
        ('prefiero_no_decirlo', _('Prefiero no decirlo'))
    ], null=True, blank=True)
    telefono = models.CharField(max_length=20, null=True, blank=True)
    
    # PIN de 4 dígitos
    pin = models.CharField(max_length=4, help_text="PIN de 4 dígitos para acceso rápido")
    
    # Datos médicos básicos
    grupo_sanguineo = models.CharField(max_length=5, null=True, blank=True)
    alergias = models.TextField(null=True, blank=True)
    medicamentos = models.TextField(null=True, blank=True)
    condiciones_medicas = models.TextField(null=True, blank=True)
    
    # Datos psicológicos iniciales
    fecha_ingreso = models.DateField(auto_now_add=True)
    psicologo_asignado = models.CharField(max_length=100, null=True, blank=True)
    motivo_consulta = models.TextField(null=True, blank=True)
    
    # Configuración de privacidad
    compartir_datos_medicos = models.BooleanField(default=False)
    recibir_recordatorios = models.BooleanField(default=True)
    
    # Metadatos
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)
    
    # Nuevos campos para vocabulario
    role = models.CharField(max_length=20, choices=[
        ('Commander', 'Commander'),
        ('Pilot', 'Pilot'),
        ('Scientist', 'Scientist'),
        ('Engineer', 'Engineer'),
        ('MedicalOfficer', 'Medical Officer'),
        ('PayloadSpecialist', 'Payload Specialist'),
    ], null=True, blank=True)
    experience = models.CharField(max_length=20, choices=[
        ('Novice', 'Novice'),
        ('Experienced', 'Experienced'),
        ('Veteran', 'Veteran'),
    ], null=True, blank=True)
    baseline_stress = models.FloatField(null=True, blank=True, help_text="Baseline stress (1-10)")
    baseline_fatigue = models.FloatField(null=True, blank=True, help_text="Baseline fatigue (1-10)")
    baseline_cognitive = models.FloatField(null=True, blank=True, help_text="Baseline cognitive (0-100)")
    
    def __str__(self):
        return f"Perfil PWMS - {self.usuario.username}"
    
    class Meta:
        verbose_name = "Perfil PWMS"
        verbose_name_plural = "Perfiles PWMS"

# Señal para crear perfil automáticamente cuando se crea un usuario
@receiver(post_save, sender=User)
def crear_perfil_pwms(sender, instance, created, **kwargs):
    if created:
        PerfilPWMS.objects.create(usuario=instance)

class EvaluacionNASATLX(models.Model):
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="Usuario")
    fecha_creacion = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de evaluación")
    tarea_descripcion = models.TextField(verbose_name="Descripción de la tarea evaluada", blank=True)

    # Dimensiones (0-20)
    demanda_mental = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(20)], default=10)
    demanda_fisica = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(20)], default=10)
    demanda_temporal = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(20)], default=10)
    rendimiento = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(20)], default=10)
    esfuerzo = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(20)], default=10)
    frustracion = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(20)], default=10)

    # Pesos (0-5)
    peso_demanda_mental = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(5)], default=0)
    peso_demanda_fisica = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(5)], default=0)
    peso_demanda_temporal = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(5)], default=0)
    peso_rendimiento = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(5)], default=0)
    peso_esfuerzo = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(5)], default=0)
    peso_frustracion = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(5)], default=0)

    puntuacion_total = models.FloatField(default=0.0, help_text="Escala 0-100")

    # Video y metadatos
    video = models.FileField(upload_to='videos_nasa_tlx/%Y/%m/%d/', null=True, blank=True)
    video_metadata = models.JSONField(null=True, blank=True)
    fecha_inicio = models.DateTimeField(null=True, blank=True)

    notas_adicionales = models.TextField(blank=True)

    def calcular_puntuacion_total(self):
        suma_pesos = (self.peso_demanda_mental + self.peso_demanda_fisica +
                      self.peso_demanda_temporal + self.peso_rendimiento +
                      self.peso_esfuerzo + self.peso_frustracion)
        if suma_pesos > 0:
            suma_ponderada = (
                self.demanda_mental * self.peso_demanda_mental +
                self.demanda_fisica * self.peso_demanda_fisica +
                self.demanda_temporal * self.peso_demanda_temporal +
                self.rendimiento * self.peso_rendimiento +
                self.esfuerzo * self.peso_esfuerzo +
                self.frustracion * self.peso_frustracion
            )
            total = (suma_ponderada / (suma_pesos * 20)) * 100
        else:
            promedio = (self.demanda_mental + self.demanda_fisica +
                        self.demanda_temporal + self.rendimiento +
                        self.esfuerzo + self.frustracion) / 6
            total = (promedio / 20) * 100
        return round(total, 2)

    def save(self, *args, **kwargs):
        self.puntuacion_total = self.calcular_puntuacion_total()
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = "Evaluación NASA TLX"
        ordering = ['-fecha_creacion']
        

class ZungAnxietyScale(models.Model):
    """
    Modelo para la Escala de Ansiedad de Zung (Self-Rating Anxiety Scale - SAS)
    """
    
    # ============================================
    # OPCIONES DE RESPUESTA TRADUCIDAS
    # ============================================
    OPCIONES_ZUNG = [
        (1, _('Rara vez')),
        (2, _('Algunas veces')),
        (3, _('Buena parte del tiempo')),
        (4, _('La mayor parte del tiempo')),
    ]
    
    # Niveles de ansiedad traducidos
    NIVELES_ANSiedad = [
        ('normal', _('Dentro de lo normal (25-44)')),
        ('minima', _('Ansiedad mínima a moderada (45-59)')),
        ('marcada', _('Ansiedad marcada a severa (60-74)')),
        ('extrema', _('Ansiedad extrema (75-100)')),
    ]
    
    # Relación con el usuario
    usuario = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='pruebas_ansiedad_zung',
        verbose_name=_("Usuario")
    )
    
    # Fecha del registro
    fecha_registro = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Fecha de registro")
    )
    fecha_actualizacion = models.DateTimeField(
        auto_now=True,
        verbose_name=_("Última actualización")
    )
    
    # Preguntas de la escala (20 items)
    p01_me_siento_mas_nervioso = models.IntegerField(
        choices=OPCIONES_ZUNG,
        verbose_name=_("1. Me siento más nervioso y ansioso que de costumbre")
    )
    p02_siento_miedo_sin_razon = models.IntegerField(
        choices=OPCIONES_ZUNG,
        verbose_name=_("2. Siento miedo sin razón")
    )
    p03_me_siento_alterado = models.IntegerField(
        choices=OPCIONES_ZUNG,
        verbose_name=_("3. Me siento alterado o agitado")
    )
    p04_siento_que_me_desmorono = models.IntegerField(
        choices=OPCIONES_ZUNG,
        verbose_name=_("4. Siento que me estoy desmoronando")
    )
    p05_siento_que_todo_bien = models.IntegerField(
        choices=OPCIONES_ZUNG,
        verbose_name=_("5. Siento que todo está bien y no pasará nada malo")
    )
    p06_temblor_sacudidas = models.IntegerField(
        choices=OPCIONES_ZUNG,
        verbose_name=_("6. Tiemblan mis manos, brazos o piernas")
    )
    p07_dolores_cabeza_cuello = models.IntegerField(
        choices=OPCIONES_ZUNG,
        verbose_name=_("7. Tengo dolores de cabeza, cuello o espalda")
    )
    p08_debilidad_fatiga = models.IntegerField(
        choices=OPCIONES_ZUNG,
        verbose_name=_("8. Me siento débil y me canso fácilmente")
    )
    p09_siento_calma_tranquilidad = models.IntegerField(
        choices=OPCIONES_ZUNG,
        verbose_name=_("9. Me siento calmado y puedo permanecer en calma fácilmente")
    )
    p10_siento_latidos_corazon = models.IntegerField(
        choices=OPCIONES_ZUNG,
        verbose_name=_("10. Siento latidos del corazón rápidos")
    )
    p11_mareos = models.IntegerField(
        choices=OPCIONES_ZUNG,
        verbose_name=_("11. Tengo mareos o vértigo")
    )
    p12_desmayos = models.IntegerField(
        choices=OPCIONES_ZUNG,
        verbose_name=_("12. Siento que me voy a desmayar")
    )
    p13_respiracion_normal = models.IntegerField(
        choices=OPCIONES_ZUNG,
        verbose_name=_("13. Puedo respirar normal")
    )
    p14_entumecimiento_hormigueo = models.IntegerField(
        choices=OPCIONES_ZUNG,
        verbose_name=_("14. Tengo entumecimiento u hormigueo en dedos, manos o pies")
    )
    p15_dolores_estomacales = models.IntegerField(
        choices=OPCIONES_ZUNG,
        verbose_name=_("15. Tengo dolores de estómago o indigestión")
    )
    p16_necesidad_orinar = models.IntegerField(
        choices=OPCIONES_ZUNG,
        verbose_name=_("16. Tengo necesidad frecuente de orinar")
    )
    p17_manos_calidas_secas = models.IntegerField(
        choices=OPCIONES_ZUNG,
        verbose_name=_("17. Mis manos están normalmente calientes y secas")
    )
    p18_sonrojo_bochorno = models.IntegerField(
        choices=OPCIONES_ZUNG,
        verbose_name=_("18. Mi cara se sonroja y siento bochornos")
    )
    p19_duermo_bien_descanso = models.IntegerField(
        choices=OPCIONES_ZUNG,
        verbose_name=_("19. Duermo bien y descanso")
    )
    p20_pesadillas = models.IntegerField(
        choices=OPCIONES_ZUNG,
        verbose_name=_("20. Tengo pesadillas")
    )
    
    # Metadatos de la escala
    puntuacion_bruta = models.IntegerField(
        verbose_name=_("Puntuación bruta"),
        help_text=_("Suma total de las respuestas"),
        null=True, blank=True
    )
    puntuacion_indice = models.IntegerField(
        verbose_name=_("Índice de Ansiedad"),
        help_text=_("Puntuación bruta × 1.25 (escala de 25-100)"),
        null=True, blank=True
    )
    nivel_ansiedad = models.CharField(
        max_length=20,
        choices=NIVELES_ANSiedad,
        verbose_name=_("Nivel de ansiedad"),
        null=True, blank=True
    )
    observaciones = models.TextField(
        verbose_name=_("Observaciones"),
        blank=True,
        null=True
    )
    
    # Campos para video
    video_path = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        verbose_name=_("Ruta del video")
    )
    video_metadata = models.JSONField(
        blank=True,
        null=True,
        verbose_name=_("Metadatos del video (resolución, fps, etc.)")
    )
    video_size = models.IntegerField(
        blank=True,
        null=True,
        verbose_name=_("Tamaño del video (bytes)")
    )
    video_duration = models.IntegerField(
        blank=True,
        null=True,
        verbose_name=_("Duración del video (segundos)")
    )

    class Meta:
        verbose_name = _("Escala de Ansiedad de Zung")
        verbose_name_plural = _("Escalas de Ansiedad de Zung")
        ordering = ['-fecha_registro']
        
    def __str__(self):
        return f"Zung Anxiety - {self.usuario.username} - {self.fecha_registro.strftime('%d/%m/%Y')}"
    
    def calcular_puntuaciones(self):
        """
        Calcula las puntuaciones de la escala considerando los items inversos
        """
        items_inversos = ['p05_siento_que_todo_bien', 'p09_siento_calma_tranquilidad', 
                          'p13_respiracion_normal', 'p17_manos_calidas_secas', 
                          'p19_duermo_bien_descanso']
        puntuacion_total = 0
        
        campos = [
            self.p01_me_siento_mas_nervioso,
            self.p02_siento_miedo_sin_razon,
            self.p03_me_siento_alterado,
            self.p04_siento_que_me_desmorono,
            self.p05_siento_que_todo_bien,
            self.p06_temblor_sacudidas,
            self.p07_dolores_cabeza_cuello,
            self.p08_debilidad_fatiga,
            self.p09_siento_calma_tranquilidad,
            self.p10_siento_latidos_corazon,
            self.p11_mareos,
            self.p12_desmayos,
            self.p13_respiracion_normal,
            self.p14_entumecimiento_hormigueo,
            self.p15_dolores_estomacales,
            self.p16_necesidad_orinar,
            self.p17_manos_calidas_secas,
            self.p18_sonrojo_bochorno,
            self.p19_duermo_bien_descanso,
            self.p20_pesadillas,
        ]
        
        nombres_campos = [
            'p01_me_siento_mas_nervioso', 'p02_siento_miedo_sin_razon', 'p03_me_siento_alterado',
            'p04_siento_que_me_desmorono', 'p05_siento_que_todo_bien', 'p06_temblor_sacudidas',
            'p07_dolores_cabeza_cuello', 'p08_debilidad_fatiga', 'p09_siento_calma_tranquilidad',
            'p10_siento_latidos_corazon', 'p11_mareos', 'p12_desmayos', 'p13_respiracion_normal',
            'p14_entumecimiento_hormigueo', 'p15_dolores_estomacales', 'p16_necesidad_orinar',
            'p17_manos_calidas_secas', 'p18_sonrojo_bochorno', 'p19_duermo_bien_descanso',
            'p20_pesadillas'
        ]
        
        for i, valor in enumerate(campos):
            if valor:
                if nombres_campos[i] in items_inversos:
                    puntuacion_total += 5 - valor
                else:
                    puntuacion_total += valor
        
        self.puntuacion_bruta = puntuacion_total
        self.puntuacion_indice = int(puntuacion_total * 1.25)
        
        # Determinar nivel de ansiedad
        if self.puntuacion_indice <= 44:
            self.nivel_ansiedad = 'normal'
        elif self.puntuacion_indice <= 59:
            self.nivel_ansiedad = 'minima'
        elif self.puntuacion_indice <= 74:
            self.nivel_ansiedad = 'marcada'
        else:
            self.nivel_ansiedad = 'extrema'
        
        return self.puntuacion_bruta, self.puntuacion_indice
    
    def save(self, *args, **kwargs):
        self.calcular_puntuaciones()
        super().save(*args, **kwargs)

