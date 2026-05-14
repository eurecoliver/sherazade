from rest_framework import serializers
from .models import SessioneColloqui, PrenotazioneColloquio
from apps.config.models import Gruppo


class GruppoSlimSerializer(serializers.ModelSerializer):
    class Meta:
        model = Gruppo
        fields = ['id', 'nome', 'colore']


class PrenotazioneColloquioSerializer(serializers.ModelSerializer):
    genitore_nome = serializers.SerializerMethodField()
    bambino_nome = serializers.SerializerMethodField()

    class Meta:
        model = PrenotazioneColloquio
        fields = [
            'id', 'sessione', 'genitore', 'genitore_nome',
            'bambino', 'bambino_nome',
            'slot_index', 'note_genitore', 'disdetta', 'creato_at',
        ]
        read_only_fields = ['id', 'creato_at', 'genitore_nome', 'bambino_nome']

    def get_genitore_nome(self, obj):
        u = obj.genitore
        parts = [u.first_name, u.last_name]
        nome = ' '.join(p for p in parts if p).strip()
        return nome or u.email

    def get_bambino_nome(self, obj):
        if not obj.bambino:
            return None
        b = obj.bambino
        if b.alias_attivo and b.alias_nome:
            return f'{b.alias_nome} {b.cognome}'
        return f'{b.nome} {b.cognome}'


class SessioneColloquiSerializer(serializers.ModelSerializer):
    gruppi = GruppoSlimSerializer(many=True, read_only=True)
    gruppi_ids = serializers.PrimaryKeyRelatedField(
        queryset=Gruppo.objects.all(),
        many=True,
        write_only=True,
        source='gruppi',
        required=False,
    )
    creato_da_nome = serializers.SerializerMethodField()
    num_slot = serializers.SerializerMethodField()
    num_prenotati = serializers.SerializerMethodField()

    class Meta:
        model = SessioneColloqui
        fields = [
            'id', 'titolo', 'descrizione', 'data',
            'ora_inizio', 'ora_fine', 'durata_slot',
            'aperto', 'gruppi', 'gruppi_ids',
            'creato_da_nome', 'num_slot', 'num_prenotati', 'creato_at',
        ]
        read_only_fields = ['id', 'creato_at', 'creato_da_nome', 'num_slot', 'num_prenotati']

    def get_creato_da_nome(self, obj):
        if not obj.creato_da:
            return None
        u = obj.creato_da
        parts = [u.first_name, u.last_name]
        nome = ' '.join(p for p in parts if p).strip()
        return nome or u.email

    def get_num_slot(self, obj):
        return obj.get_num_slots()

    def get_num_prenotati(self, obj):
        return obj.prenotazioni.filter(disdetta=False).count()
