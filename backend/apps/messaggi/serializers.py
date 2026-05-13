from rest_framework import serializers
import mimetypes
from apps.config.models import Gruppo
from .models import Circolare, LetturaCircolare


class CircolareSerializer(serializers.ModelSerializer):
    autore_nome = serializers.SerializerMethodField()
    gruppi_ids = serializers.PrimaryKeyRelatedField(source='gruppi', many=True, read_only=True)
    gruppi_nomi = serializers.SerializerMethodField()
    gruppi = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Gruppo.objects.all(),
        required=False,
        write_only=True,
    )
    num_letture = serializers.SerializerMethodField()
    letta = serializers.SerializerMethodField()
    allegato_url = serializers.SerializerMethodField()

    class Meta:
        model = Circolare
        fields = [
            'id', 'titolo', 'testo', 'allegato', 'allegato_url',
            'autore_nome', 'gruppi', 'gruppi_ids', 'gruppi_nomi',
            'pubblicata', 'notifica_inviata', 'num_letture', 'letta',
            'creato_at', 'aggiornato_at',
        ]
        read_only_fields = ['notifica_inviata']

    def validate_allegato(self, value):
        if value:
            content_type = getattr(value, 'content_type', None)
            if not content_type:
                content_type, _ = mimetypes.guess_type(value.name)
            allowed = {'application/pdf', 'image/jpeg', 'image/png', 'image/webp'}
            if content_type not in allowed:
                raise serializers.ValidationError(
                    'Solo PDF e immagini (JPEG, PNG, WebP) sono supportati come allegato.'
                )
        return value

    def get_autore_nome(self, obj):
        return obj.autore.get_full_name() or obj.autore.email

    def get_gruppi_nomi(self, obj):
        return [g.nome for g in obj.gruppi.all()]

    def get_num_letture(self, obj):
        return obj.letture.count()

    def get_letta(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.letture.filter(utente=request.user).exists()

    def get_allegato_url(self, obj):
        if not obj.allegato:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.allegato.url)
        return obj.allegato.url

    def create(self, validated_data):
        gruppi = validated_data.pop('gruppi', [])
        validated_data['autore'] = self.context['request'].user
        circolare = super().create(validated_data)
        circolare.gruppi.set(gruppi)
        return circolare

    def update(self, instance, validated_data):
        gruppi = validated_data.pop('gruppi', None)
        circolare = super().update(instance, validated_data)
        if gruppi is not None:
            circolare.gruppi.set(gruppi)
        return circolare
