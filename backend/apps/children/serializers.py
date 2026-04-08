from datetime import date

from rest_framework import serializers

from apps.users.models import User
from .models import Bambino, Famiglia, DelegaRitiro


class DelegaRitiroSerializer(serializers.ModelSerializer):
    class Meta:
        model = DelegaRitiro
        fields = '__all__'


class FamigliaSerializer(serializers.ModelSerializer):
    genitore1_email = serializers.EmailField(source='genitore1.email', read_only=True)
    genitore1_nome = serializers.CharField(source='genitore1.get_full_name', read_only=True)
    genitore1_telefono = serializers.CharField(source='genitore1.phone', read_only=True)
    genitore2_email = serializers.EmailField(source='genitore2.email', read_only=True, allow_null=True)
    genitore2_nome = serializers.CharField(source='genitore2.get_full_name', read_only=True, allow_null=True)
    genitore2_telefono = serializers.SerializerMethodField()

    class Meta:
        model = Famiglia
        fields = '__all__'

    def get_genitore2_telefono(self, obj):
        return obj.genitore2.phone if obj.genitore2_id and obj.genitore2 else None


class FamigliaCreateSerializer(serializers.Serializer):
    """Crea una Famiglia accettando email dei genitori invece degli ID.
    Se l'utente non esiste viene creato automaticamente con ruolo GENITORE.
    """
    bambino = serializers.PrimaryKeyRelatedField(queryset=Bambino.objects.all())
    genitore1_email = serializers.EmailField()
    genitore1_nome = serializers.CharField(required=False, allow_blank=True, default='')
    genitore1_cognome = serializers.CharField(required=False, allow_blank=True, default='')
    genitore1_codice_fiscale = serializers.CharField(required=False, allow_blank=True, default='')
    genitore1_indirizzo = serializers.CharField(required=False, allow_blank=True, default='')
    genitore2_email = serializers.EmailField(required=False, allow_blank=True, default='')
    genitore2_nome = serializers.CharField(required=False, allow_blank=True, default='')
    genitore2_cognome = serializers.CharField(required=False, allow_blank=True, default='')
    genitore2_codice_fiscale = serializers.CharField(required=False, allow_blank=True, default='')
    genitore2_indirizzo = serializers.CharField(required=False, allow_blank=True, default='')
    indirizzo = serializers.CharField(required=False, allow_blank=True, default='')
    telefono_emergenza = serializers.CharField()
    medico_base = serializers.CharField(required=False, allow_blank=True, default='')

    def _get_or_create_user(self, email):
        from apps.users.models import Role
        try:
            return User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            user = User(email=email, username=email, role=Role.GENITORE, is_active=True)
            user.set_unusable_password()
            user.save()
            return user

    def validate_genitore1_email(self, value):
        return self._get_or_create_user(value)

    def validate_genitore2_email(self, value):
        if not value:
            return None
        return self._get_or_create_user(value)

    def _update_user_name(self, user, nome, cognome):
        changed = False
        if nome and not user.first_name:
            user.first_name = nome
            changed = True
        if cognome and not user.last_name:
            user.last_name = cognome
            changed = True
        if changed:
            user.save(update_fields=['first_name', 'last_name'])

    def validate(self, attrs):
        g1 = attrs.get('genitore1_email')
        g2 = attrs.get('genitore2_email')
        if g1 and g2 and g1.pk == g2.pk:
            raise serializers.ValidationError(
                {'genitore2_email': 'Il genitore 2 non può essere lo stesso del genitore 1.'}
            )
        return attrs

    def create(self, validated_data):
        g1 = validated_data['genitore1_email']
        self._update_user_name(g1, validated_data.get('genitore1_nome', ''), validated_data.get('genitore1_cognome', ''))

        g2 = validated_data.get('genitore2_email')
        if g2:
            self._update_user_name(g2, validated_data.get('genitore2_nome', ''), validated_data.get('genitore2_cognome', ''))

        return Famiglia.objects.create(
            bambino=validated_data['bambino'],
            genitore1=g1,
            genitore1_codice_fiscale=validated_data.get('genitore1_codice_fiscale', ''),
            genitore1_indirizzo=validated_data.get('genitore1_indirizzo', ''),
            genitore2=g2,
            genitore2_codice_fiscale=validated_data.get('genitore2_codice_fiscale', ''),
            genitore2_indirizzo=validated_data.get('genitore2_indirizzo', ''),
            indirizzo=validated_data.get('indirizzo', ''),
            telefono_emergenza=validated_data['telefono_emergenza'],
            medico_base=validated_data.get('medico_base', ''),
        )


class BambinoSerializer(serializers.ModelSerializer):
    famiglia = FamigliaSerializer(read_only=True)
    deleghe_ritiro = DelegaRitiroSerializer(many=True, read_only=True)
    eta = serializers.SerializerMethodField()
    gruppo_nome = serializers.SerializerMethodField()
    gruppo_colore = serializers.SerializerMethodField()
    orario_uscita_label = serializers.SerializerMethodField()

    class Meta:
        model = Bambino
        fields = '__all__'

    def get_eta(self, obj):
        today = date.today()
        return (today - obj.data_nascita).days // 365

    def get_gruppo_nome(self, obj):
        return obj.gruppo.nome if obj.gruppo_id and obj.gruppo else ''

    def get_gruppo_colore(self, obj):
        return obj.gruppo.colore if obj.gruppo_id and obj.gruppo else '#6B7280'

    def get_orario_uscita_label(self, obj):
        if obj.orario_uscita_id and obj.orario_uscita:
            return f'{obj.orario_uscita.etichetta} ({obj.orario_uscita.orario})'
        return ''

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.foto_profilo:
            try:
                from django.conf import settings
                if getattr(settings, 'USE_S3', False):
                    # MinIO: sostituisce endpoint interno con URL esterno per presigned URL
                    url = instance.foto_profilo.url
                    internal = getattr(settings, 'AWS_S3_ENDPOINT_URL', '')
                    external = getattr(settings, 'AWS_S3_ENDPOINT_URL_EXTERNAL', '')
                    if external and internal and internal != external and url.startswith(internal):
                        url = url.replace(internal, external, 1)
                    data['foto_profilo'] = url
                else:
                    # Storage locale: percorso relativo → URL assoluto con host esterno
                    base = getattr(settings, 'MEDIA_EXTERNAL_BASE_URL', '').rstrip('/')
                    url = instance.foto_profilo.url  # es. /media/bambini/foto/test.jpg
                    data['foto_profilo'] = f'{base}{url}' if base else url
            except Exception:
                data['foto_profilo'] = None
        return data


class BambinoNoteSerializer(serializers.ModelSerializer):
    """Solo note_mediche è scrivibile — per Coordinatrice/Insegnante."""
    gruppo_nome = serializers.SerializerMethodField()

    class Meta:
        model = Bambino
        fields = ['id', 'nome', 'cognome', 'gruppo', 'gruppo_nome', 'attivo', 'note_mediche', 'data_nascita']
        read_only_fields = ['nome', 'cognome', 'gruppo', 'attivo', 'data_nascita']

    def get_gruppo_nome(self, obj):
        return obj.gruppo.nome if obj.gruppo_id and obj.gruppo else ''


class BambinoCuocaSerializer(serializers.ModelSerializer):
    """Campi limitati per la Cuoca: nome, gruppo, note mediche/allergie."""
    gruppo_nome = serializers.SerializerMethodField()

    class Meta:
        model = Bambino
        fields = ['id', 'nome', 'cognome', 'gruppo', 'gruppo_nome', 'note_mediche', 'attivo']

    def get_gruppo_nome(self, obj):
        return obj.gruppo.nome if obj.gruppo_id and obj.gruppo else ''
