from rest_framework import serializers
from apps.config.models import Gruppo
from .models import TipoEvento, EventoCalendario


class TipoEventoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoEvento
        fields = ['id', 'nome', 'colore', 'icona', 'attivo']

    def create(self, validated_data):
        validated_data['creato_da'] = self.context['request'].user
        return super().create(validated_data)


class EventoCalendarioSerializer(serializers.ModelSerializer):
    tipo_dettaglio = TipoEventoSerializer(source='tipo', read_only=True)
    gruppi_ids = serializers.PrimaryKeyRelatedField(
        source='gruppi',
        many=True,
        read_only=True,
    )
    gruppi = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Gruppo.objects.all(),
        required=False,
        write_only=True,
    )
    creato_da_nome = serializers.SerializerMethodField()

    class Meta:
        model = EventoCalendario
        fields = [
            'id', 'titolo', 'descrizione', 'tipo', 'tipo_dettaglio',
            'data_inizio', 'data_fine', 'tutto_il_giorno', 'ora_inizio', 'ora_fine',
            'chiusura_scolastica', 'gruppi', 'gruppi_ids', 'creato_da_nome',
            'creato_at', 'aggiornato_at',
        ]

    def get_creato_da_nome(self, obj):
        if obj.creato_da:
            return obj.creato_da.get_full_name() or obj.creato_da.email
        return None

    def create(self, validated_data):
        gruppi = validated_data.pop('gruppi', [])
        validated_data['creato_da'] = self.context['request'].user
        evento = super().create(validated_data)
        evento.gruppi.set(gruppi)
        return evento

    def update(self, instance, validated_data):
        gruppi = validated_data.pop('gruppi', None)
        evento = super().update(instance, validated_data)
        if gruppi is not None:
            evento.gruppi.set(gruppi)
        return evento
