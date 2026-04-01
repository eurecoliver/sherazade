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
    """Crea una Famiglia accettando email dei genitori invece degli ID."""
    bambino = serializers.PrimaryKeyRelatedField(queryset=Bambino.objects.all())
    genitore1_email = serializers.EmailField()
    genitore1_codice_fiscale = serializers.CharField(required=False, allow_blank=True, default='')
    genitore1_indirizzo = serializers.CharField(required=False, allow_blank=True, default='')
    genitore2_email = serializers.EmailField(required=False, allow_blank=True, default='')
    genitore2_codice_fiscale = serializers.CharField(required=False, allow_blank=True, default='')
    genitore2_indirizzo = serializers.CharField(required=False, allow_blank=True, default='')
    indirizzo = serializers.CharField(required=False, allow_blank=True, default='')
    telefono_emergenza = serializers.CharField()
    medico_base = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_genitore1_email(self, value):
        try:
            return User.objects.get(email__iexact=value)
        except User.DoesNotExist:
            raise serializers.ValidationError(f'Utente "{value}" non trovato.')

    def validate_genitore2_email(self, value):
        if not value:
            return None
        try:
            return User.objects.get(email__iexact=value)
        except User.DoesNotExist:
            raise serializers.ValidationError(f'Utente "{value}" non trovato.')

    def create(self, validated_data):
        return Famiglia.objects.create(
            bambino=validated_data['bambino'],
            genitore1=validated_data['genitore1_email'],
            genitore1_codice_fiscale=validated_data.get('genitore1_codice_fiscale', ''),
            genitore1_indirizzo=validated_data.get('genitore1_indirizzo', ''),
            genitore2=validated_data.get('genitore2_email'),
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
                url = instance.foto_profilo.url
                from django.conf import settings
                internal = getattr(settings, 'AWS_S3_ENDPOINT_URL', '')
                external = getattr(settings, 'AWS_S3_ENDPOINT_URL_EXTERNAL', '')
                if external and internal and internal != external and url.startswith(internal):
                    url = url.replace(internal, external, 1)
                data['foto_profilo'] = url
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
