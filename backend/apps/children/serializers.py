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
    genitore2_email = serializers.EmailField(source='genitore2.email', read_only=True, allow_null=True)
    genitore2_nome = serializers.CharField(source='genitore2.get_full_name', read_only=True, allow_null=True)

    class Meta:
        model = Famiglia
        fields = '__all__'


class FamigliaCreateSerializer(serializers.Serializer):
    """Crea una Famiglia accettando email dei genitori invece degli ID."""
    bambino = serializers.PrimaryKeyRelatedField(queryset=Bambino.objects.all())
    genitore1_email = serializers.EmailField()
    genitore2_email = serializers.EmailField(required=False, allow_blank=True, default='')
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
            genitore2=validated_data.get('genitore2_email'),
            indirizzo=validated_data.get('indirizzo', ''),
            telefono_emergenza=validated_data['telefono_emergenza'],
            medico_base=validated_data.get('medico_base', ''),
        )


class BambinoSerializer(serializers.ModelSerializer):
    famiglia = FamigliaSerializer(read_only=True)
    deleghe_ritiro = DelegaRitiroSerializer(many=True, read_only=True)
    eta = serializers.SerializerMethodField()

    class Meta:
        model = Bambino
        fields = '__all__'

    def get_eta(self, obj):
        today = date.today()
        return (today - obj.data_nascita).days // 365


class BambinoNoteSerializer(serializers.ModelSerializer):
    """Solo note_mediche è scrivibile — per Coordinatrice/Insegnante."""

    class Meta:
        model = Bambino
        fields = ['id', 'nome', 'cognome', 'sezione', 'attivo', 'note_mediche', 'data_nascita']
        read_only_fields = ['nome', 'cognome', 'sezione', 'attivo', 'data_nascita']


class BambinoCuocaSerializer(serializers.ModelSerializer):
    """Campi limitati per la Cuoca: nome, sezione, note mediche/allergie."""

    class Meta:
        model = Bambino
        fields = ['id', 'nome', 'cognome', 'sezione', 'note_mediche', 'attivo']
