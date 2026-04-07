from rest_framework import serializers
from .models import (
    AllergiaIntolleranza, MenuGiornaliero, RegistroPasto,
    ConfigMenuCiclo, Piatto, PiattoAssegnazione, SostituzionePiatto,
)


class AllergiaIntolleranzaSerializer(serializers.ModelSerializer):
    tipo_label = serializers.CharField(source='get_tipo_display', read_only=True)
    gravita_label = serializers.CharField(source='get_gravita_display', read_only=True)
    bambino_nome = serializers.SerializerMethodField()

    class Meta:
        model = AllergiaIntolleranza
        fields = (
            'id', 'bambino', 'bambino_nome',
            'tipo', 'tipo_label',
            'descrizione',
            'gravita', 'gravita_label',
            'note_mediche', 'attivo', 'creato_il',
        )
        read_only_fields = ('creato_il',)

    def get_bambino_nome(self, obj):
        return str(obj.bambino)


class MenuGiornalieroSerializer(serializers.ModelSerializer):
    inserito_da_nome = serializers.SerializerMethodField()

    class Meta:
        model = MenuGiornaliero
        fields = (
            'id', 'data', 'sezione',
            'primo', 'secondo', 'contorno', 'frutta', 'merenda', 'bibita',
            'inserito_da', 'inserito_da_nome',
            'creato_il', 'aggiornato_il',
        )
        read_only_fields = ('inserito_da', 'creato_il', 'aggiornato_il')

    def get_inserito_da_nome(self, obj):
        return obj.inserito_da.get_full_name() or obj.inserito_da.email


QUANTITA_FIELDS = (
    'colazione_quantita', 'primo_quantita', 'secondo_quantita',
    'monopiatto_quantita', 'contorno_quantita', 'pane_quantita',
    'frutta_quantita', 'merenda_quantita',
)


class RegistroPastoSerializer(serializers.ModelSerializer):
    bambino_nome = serializers.SerializerMethodField()
    compilato_da_nome = serializers.SerializerMethodField()

    class Meta:
        model = RegistroPasto
        fields = (
            'id', 'bambino', 'bambino_nome', 'data',
            *QUANTITA_FIELDS,
            'note_pasto',
            'compilato_da', 'compilato_da_nome',
            'creato_at', 'aggiornato_at',
        )
        read_only_fields = ('compilato_da', 'creato_at', 'aggiornato_at')

    def get_bambino_nome(self, obj):
        return str(obj.bambino)

    def get_compilato_da_nome(self, obj):
        return obj.compilato_da.get_full_name() or obj.compilato_da.email


class RegistroPastoWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegistroPasto
        fields = (
            'id', 'bambino', 'data',
            *QUANTITA_FIELDS,
            'note_pasto',
        )


# ── Menu ciclico v2 ──────────────────────────────────────────────────────────

class ConfigMenuCicloSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfigMenuCiclo
        fields = ('id', 'data_inizio_ciclo', 'aggiornato_il')
        read_only_fields = ('aggiornato_il',)


class PiattoSerializer(serializers.ModelSerializer):
    tipo_label = serializers.CharField(source='get_tipo_display', read_only=True)

    class Meta:
        model = Piatto
        fields = ('id', 'descrizione', 'tipo', 'tipo_label', 'note', 'attivo', 'creato_il')
        read_only_fields = ('creato_il',)


class PiattoAssegnazioneSerializer(serializers.ModelSerializer):
    piatto_descrizione = serializers.CharField(source='piatto.descrizione', read_only=True)
    piatto_tipo = serializers.CharField(source='piatto.tipo', read_only=True)
    gruppo_nome = serializers.CharField(source='gruppo.nome', read_only=True)

    class Meta:
        model = PiattoAssegnazione
        fields = (
            'id', 'piatto', 'piatto_descrizione', 'piatto_tipo',
            'gruppo', 'gruppo_nome',
            'sempre', 'giorni_per_settimana',
        )


class SostituzionePiattoSerializer(serializers.ModelSerializer):
    tipo_label = serializers.CharField(source='get_tipo_display', read_only=True)
    gruppi_nomi = serializers.SerializerMethodField()

    class Meta:
        model = SostituzionePiatto
        fields = (
            'id', 'gruppi', 'gruppi_nomi',
            'data', 'tipo', 'tipo_label',
            'descrizione', 'note',
            'inserito_da', 'creato_il',
        )
        read_only_fields = ('inserito_da', 'creato_il')

    def get_gruppi_nomi(self, obj):
        return [g.nome for g in obj.gruppi.all()]
