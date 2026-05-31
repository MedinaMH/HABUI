from django import forms
from django.contrib.auth.models import User
from django.contrib.auth.forms import UserCreationForm
from django.utils.translation import gettext_lazy as _
from .models import PerfilPWMS,  EvaluacionNASATLX, ZungAnxietyScale

# ============================================
# REGISTRO Y LOGIN
# ============================================

class RegistroUsuarioForm(UserCreationForm):
    """
    Formulario para registro de nuevo usuario con PIN
    """
    email = forms.EmailField(required=True, label=_("Correo electrónico"))
    pin = forms.CharField(
        max_length=4,
        min_length=4,
        widget=forms.PasswordInput(attrs={'placeholder': _('4 dígitos')}),
        help_text=_("PIN de 4 dígitos para acceso rápido"),
        label=_("PIN")
    )
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password1', 'password2', 'pin']
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['username'].label = _("Nombre de usuario")
        self.fields['password1'].label = _("Contraseña")
        self.fields['password2'].label = _("Confirmar contraseña")
    
    def clean_pin(self):
        pin = self.cleaned_data.get('pin')
        if not pin.isdigit():
            raise forms.ValidationError(_("El PIN debe contener solo números"))
        if len(pin) != 4:
            raise forms.ValidationError(_("El PIN debe tener exactamente 4 dígitos"))
        return pin
    
    def save(self, commit=True):
        user = super().save(commit=False)
        user.email = self.cleaned_data['email']
        
        if commit:
            user.save()
            perfil = user.perfil_pwms
            perfil.pin = self.cleaned_data['pin']
            perfil.save()
        
        return user

class LoginConPINForm(forms.Form):
    """
    Formulario de login con usuario y PIN
    """
    username = forms.CharField(max_length=150, label=_("Nombre de usuario"))
    pin = forms.CharField(
        max_length=4,
        min_length=4,
        widget=forms.PasswordInput(attrs={'placeholder': _('PIN de 4 dígitos')}),
        label=_("PIN")
    )

# ============================================
# PERFIL PWMS
# ============================================

class PerfilPWMSForm(forms.ModelForm):
    """
    Formulario para completar/actualizar perfil PWMS
    """
    class Meta:
        model = PerfilPWMS
        fields = [
            'nombre_completo',
            'fecha_nacimiento', 'genero', 'telefono', 
            'grupo_sanguineo', 'alergias', 'medicamentos',
            'condiciones_medicas', 'psicologo_asignado',
            'motivo_consulta', 'compartir_datos_medicos',
            'recibir_recordatorios'
        ]
        widgets = {
            'nombre_completo': forms.TextInput(attrs={'placeholder': _('Tu nombre completo')}),
            'fecha_nacimiento': forms.DateInput(attrs={'type': 'date'}),
            'alergias': forms.Textarea(attrs={'rows': 3}),
            'medicamentos': forms.Textarea(attrs={'rows': 3}),
            'condiciones_medicas': forms.Textarea(attrs={'rows': 3}),
            'motivo_consulta': forms.Textarea(attrs={'rows': 4}),
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['nombre_completo'].label = _("Nombre completo")
        self.fields['fecha_nacimiento'].label = _("Fecha de nacimiento")
        self.fields['genero'].label = _("Género")
        self.fields['telefono'].label = _("Teléfono")
        self.fields['grupo_sanguineo'].label = _("Grupo sanguíneo")
        self.fields['alergias'].label = _("Alergias")
        self.fields['medicamentos'].label = _("Medicamentos actuales")
        self.fields['condiciones_medicas'].label = _("Condiciones médicas")
        self.fields['psicologo_asignado'].label = _("Psicólogo asignado")
        self.fields['motivo_consulta'].label = _("Motivo de consulta")
        self.fields['compartir_datos_medicos'].label = _("Compartir datos médicos")
        self.fields['recibir_recordatorios'].label = _("Recibir recordatorios")

# ============================================
# NASA TLX FORM (TRADUCIDO)
# ============================================

class NASATLXForm(forms.ModelForm):
    # ==================== 15 COMPARACIONES POR PARES ====================
    comparacion_1 = forms.ChoiceField(
        choices=[('demanda_mental', _('Demanda Mental')), ('demanda_fisica', _('Demanda Física'))],
        widget=forms.RadioSelect(attrs={'class': 'form-check-input'}),
        label=_("1. Demanda Mental vs Demanda Física"),
        required=True
    )
    comparacion_2 = forms.ChoiceField(
        choices=[('demanda_mental', _('Demanda Mental')), ('demanda_temporal', _('Demanda Temporal'))],
        widget=forms.RadioSelect(attrs={'class': 'form-check-input'}),
        label=_("2. Demanda Mental vs Demanda Temporal"),
        required=True
    )
    comparacion_3 = forms.ChoiceField(
        choices=[('demanda_mental', _('Demanda Mental')), ('rendimiento', _('Rendimiento'))],
        widget=forms.RadioSelect(attrs={'class': 'form-check-input'}),
        label=_("3. Demanda Mental vs Rendimiento"),
        required=True
    )
    comparacion_4 = forms.ChoiceField(
        choices=[('demanda_mental', _('Demanda Mental')), ('esfuerzo', _('Esfuerzo'))],
        widget=forms.RadioSelect(attrs={'class': 'form-check-input'}),
        label=_("4. Demanda Mental vs Esfuerzo"),
        required=True
    )
    comparacion_5 = forms.ChoiceField(
        choices=[('demanda_mental', _('Demanda Mental')), ('frustracion', _('Frustración'))],
        widget=forms.RadioSelect(attrs={'class': 'form-check-input'}),
        label=_("5. Demanda Mental vs Frustración"),
        required=True
    )
    comparacion_6 = forms.ChoiceField(
        choices=[('demanda_fisica', _('Demanda Física')), ('demanda_temporal', _('Demanda Temporal'))],
        widget=forms.RadioSelect(attrs={'class': 'form-check-input'}),
        label=_("6. Demanda Física vs Demanda Temporal"),
        required=True
    )
    comparacion_7 = forms.ChoiceField(
        choices=[('demanda_fisica', _('Demanda Física')), ('rendimiento', _('Rendimiento'))],
        widget=forms.RadioSelect(attrs={'class': 'form-check-input'}),
        label=_("7. Demanda Física vs Rendimiento"),
        required=True
    )
    comparacion_8 = forms.ChoiceField(
        choices=[('demanda_fisica', _('Demanda Física')), ('esfuerzo', _('Esfuerzo'))],
        widget=forms.RadioSelect(attrs={'class': 'form-check-input'}),
        label=_("8. Demanda Física vs Esfuerzo"),
        required=True
    )
    comparacion_9 = forms.ChoiceField(
        choices=[('demanda_fisica', _('Demanda Física')), ('frustracion', _('Frustración'))],
        widget=forms.RadioSelect(attrs={'class': 'form-check-input'}),
        label=_("9. Demanda Física vs Frustración"),
        required=True
    )
    comparacion_10 = forms.ChoiceField(
        choices=[('demanda_temporal', _('Demanda Temporal')), ('rendimiento', _('Rendimiento'))],
        widget=forms.RadioSelect(attrs={'class': 'form-check-input'}),
        label=_("10. Demanda Temporal vs Rendimiento"),
        required=True
    )
    comparacion_11 = forms.ChoiceField(
        choices=[('demanda_temporal', _('Demanda Temporal')), ('esfuerzo', _('Esfuerzo'))],
        widget=forms.RadioSelect(attrs={'class': 'form-check-input'}),
        label=_("11. Demanda Temporal vs Esfuerzo"),
        required=True
    )
    comparacion_12 = forms.ChoiceField(
        choices=[('demanda_temporal', _('Demanda Temporal')), ('frustracion', _('Frustración'))],
        widget=forms.RadioSelect(attrs={'class': 'form-check-input'}),
        label=_("12. Demanda Temporal vs Frustración"),
        required=True
    )
    comparacion_13 = forms.ChoiceField(
        choices=[('rendimiento', _('Rendimiento')), ('esfuerzo', _('Esfuerzo'))],
        widget=forms.RadioSelect(attrs={'class': 'form-check-input'}),
        label=_("13. Rendimiento vs Esfuerzo"),
        required=True
    )
    comparacion_14 = forms.ChoiceField(
        choices=[('rendimiento', _('Rendimiento')), ('frustracion', _('Frustración'))],
        widget=forms.RadioSelect(attrs={'class': 'form-check-input'}),
        label=_("14. Rendimiento vs Frustración"),
        required=True
    )
    comparacion_15 = forms.ChoiceField(
        choices=[('esfuerzo', _('Esfuerzo')), ('frustracion', _('Frustración'))],
        widget=forms.RadioSelect(attrs={'class': 'form-check-input'}),
        label=_("15. Esfuerzo vs Frustración"),
        required=True
    )

    class Meta:
        model = EvaluacionNASATLX
        fields = [
            'tarea_descripcion',
            'demanda_mental', 'demanda_fisica', 'demanda_temporal',
            'rendimiento', 'esfuerzo', 'frustracion',
            'notas_adicionales'
        ]
        widgets = {
            'tarea_descripcion': forms.Textarea(attrs={
                'rows': 3,
                'class': 'form-control',
                'placeholder': _('Ej: Realizar informe mensual, Reunión de equipo...')
            }),
            'demanda_mental': forms.NumberInput(attrs={
                'type': 'range', 'min': 0, 'max': 20, 'step': 1,
                'class': 'form-range tlx-slider', 'id': 'demanda_mental_slider'
            }),
            'demanda_fisica': forms.NumberInput(attrs={
                'type': 'range', 'min': 0, 'max': 20, 'step': 1,
                'class': 'form-range tlx-slider', 'id': 'demanda_fisica_slider'
            }),
            'demanda_temporal': forms.NumberInput(attrs={
                'type': 'range', 'min': 0, 'max': 20, 'step': 1,
                'class': 'form-range tlx-slider', 'id': 'demanda_temporal_slider'
            }),
            'rendimiento': forms.NumberInput(attrs={
                'type': 'range', 'min': 0, 'max': 20, 'step': 1,
                'class': 'form-range tlx-slider', 'id': 'rendimiento_slider'
            }),
            'esfuerzo': forms.NumberInput(attrs={
                'type': 'range', 'min': 0, 'max': 20, 'step': 1,
                'class': 'form-range tlx-slider', 'id': 'esfuerzo_slider'
            }),
            'frustracion': forms.NumberInput(attrs={
                'type': 'range', 'min': 0, 'max': 20, 'step': 1,
                'class': 'form-range tlx-slider', 'id': 'frustracion_slider'
            }),
            'notas_adicionales': forms.Textarea(attrs={
                'rows': 3,
                'class': 'form-control',
                'placeholder': _('Observaciones adicionales sobre tu experiencia...')
            }),
        }
        labels = {
            'tarea_descripcion': _('Descripción de la tarea'),
            'demanda_mental': _('Demanda Mental (0-20)'),
            'demanda_fisica': _('Demanda Física (0-20)'),
            'demanda_temporal': _('Demanda Temporal (0-20)'),
            'rendimiento': _('Rendimiento (0-20)'),
            'esfuerzo': _('Esfuerzo (0-20)'),
            'frustracion': _('Frustración (0-20)'),
            'notas_adicionales': _('Notas adicionales'),
        }

    def clean(self):
        cleaned_data = super().clean()
        dimension_fields = ['demanda_mental', 'demanda_fisica', 'demanda_temporal',
                            'rendimiento', 'esfuerzo', 'frustracion']
        for field in dimension_fields:
            value = cleaned_data.get(field)
            if value is not None and (value < 0 or value > 20):
                self.add_error(field, _('El valor debe estar entre 0 y 20'))
        return cleaned_data


# ============================================
# ESCALA DE ANSIEDAD DE ZUNG (TRADUCIDA)
# ============================================

class ZungAnxietyScaleForm(forms.ModelForm):
    """
    Formulario para la Escala de Ansiedad de Zung
    """
    
    class Meta:
        model = ZungAnxietyScale
        fields = [
            'p01_me_siento_mas_nervioso',
            'p02_siento_miedo_sin_razon',
            'p03_me_siento_alterado',
            'p04_siento_que_me_desmorono',
            'p05_siento_que_todo_bien',
            'p06_temblor_sacudidas',
            'p07_dolores_cabeza_cuello',
            'p08_debilidad_fatiga',
            'p09_siento_calma_tranquilidad',
            'p10_siento_latidos_corazon',
            'p11_mareos',
            'p12_desmayos',
            'p13_respiracion_normal',
            'p14_entumecimiento_hormigueo',
            'p15_dolores_estomacales',
            'p16_necesidad_orinar',
            'p17_manos_calidas_secas',
            'p18_sonrojo_bochorno',
            'p19_duermo_bien_descanso',
            'p20_pesadillas',
            'observaciones',
        ]
        widgets = {
            'observaciones': forms.Textarea(attrs={
                'class': 'form-control',
                'rows': 3,
                'placeholder': _('Observaciones adicionales (opcional)')
            }),
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Configurar widgets para todas las preguntas
        for field_name, field in self.fields.items():
            if field_name.startswith('p'):
                field.widget = forms.Select(choices=field.choices, attrs={
                    'class': 'form-select',
                    'required': True,
                })
                field.required = True
        
        # Textos personalizados para las preguntas (TRADUCIDOS)
        self.fields['p01_me_siento_mas_nervioso'].label = _("1. Me siento más nervioso y ansioso que de costumbre")
        self.fields['p02_siento_miedo_sin_razon'].label = _("2. Siento miedo sin razón")
        self.fields['p03_me_siento_alterado'].label = _("3. Me siento alterado o agitado")
        self.fields['p04_siento_que_me_desmorono'].label = _("4. Siento que me estoy desmoronando")
        self.fields['p05_siento_que_todo_bien'].label = _("5. Siento que todo está bien y no pasará nada malo")
        self.fields['p06_temblor_sacudidas'].label = _("6. Tiemblan mis manos, brazos o piernas")
        self.fields['p07_dolores_cabeza_cuello'].label = _("7. Tengo dolores de cabeza, cuello o espalda")
        self.fields['p08_debilidad_fatiga'].label = _("8. Me siento débil y me canso fácilmente")
        self.fields['p09_siento_calma_tranquilidad'].label = _("9. Me siento calmado y puedo permanecer en calma fácilmente")
        self.fields['p10_siento_latidos_corazon'].label = _("10. Siento latidos del corazón rápidos")
        self.fields['p11_mareos'].label = _("11. Tengo mareos o vértigo")
        self.fields['p12_desmayos'].label = _("12. Siento que me voy a desmayar")
        self.fields['p13_respiracion_normal'].label = _("13. Puedo respirar normal")
        self.fields['p14_entumecimiento_hormigueo'].label = _("14. Tengo entumecimiento u hormigueo en dedos, manos o pies")
        self.fields['p15_dolores_estomacales'].label = _("15. Tengo dolores de estómago o indigestión")
        self.fields['p16_necesidad_orinar'].label = _("16. Tengo necesidad frecuente de orinar")
        self.fields['p17_manos_calidas_secas'].label = _("17. Mis manos están normalmente calientes y secas")
        self.fields['p18_sonrojo_bochorno'].label = _("18. Mi cara se sonroja y siento bochornos")
        self.fields['p19_duermo_bien_descanso'].label = _("19. Duermo bien y descanso")
        self.fields['p20_pesadillas'].label = _("20. Tengo pesadillas")
        self.fields['observaciones'].label = _("Observaciones")