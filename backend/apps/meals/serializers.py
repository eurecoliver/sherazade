from rest_framework import serializers
from .models import AllergiaIntolleranza, MenuGiornaliero, RegistroPasto


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


class RegistroPastoSerializer(serializers.ModelSerializer):
    bambino_nome = serializers.SerializerMethodField()
    compilato_da_nome = serializers.SerializerMethodField()

    class Meta:
        model = RegistroPasto
        fields = (
            'id', 'bambino', 'bambino_nome', 'data',
            'primo_quantita', 'secondo_quantita', 'contorno_quantita',
            'frutta_quantita', 'merenda_quantita',
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
            'primo_quantita', 'secondo_quantita', 'contorno_quantita',
            'frutta_quantita', 'merenda_quantita',
            'note_pasto',
        )
