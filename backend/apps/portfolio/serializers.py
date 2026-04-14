from rest_framework import serializers
from .models import AnnoScolastico, Iscrizione, MediaPortfolio


class AnnoScolasticoSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnnoScolastico
        fields = ['id', 'nome', 'data_inizio', 'data_fine', 'attivo', 'descrizione']


class IscrizioneSerializer(serializers.ModelSerializer):
    bambino_nome = serializers.SerializerMethodField()
    anno_nome = serializers.SerializerMethodField()
    gruppo_nome = serializers.SerializerMethodField()
    gruppo_colore = serializers.SerializerMethodField()

    class Meta:
        model = Iscrizione
        fields = [
            'id', 'bambino', 'bambino_nome',
            'anno', 'anno_nome',
            'gruppo', 'gruppo_nome', 'gruppo_colore',
        ]

    def get_bambino_nome(self, obj):
        return f'{obj.bambino.nome} {obj.bambino.cognome}' if obj.bambino else ''

    def get_anno_nome(self, obj):
        return obj.anno.nome if obj.anno else ''

    def get_gruppo_nome(self, obj):
        return obj.gruppo.nome if obj.gruppo else ''

    def get_gruppo_colore(self, obj):
        return obj.gruppo.colore if obj.gruppo else '#6C5CE7'


class MediaPortfolioSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    autore_nome = serializers.SerializerMethodField()
    gruppo_nome = serializers.SerializerMethodField()
    gruppo_colore = serializers.SerializerMethodField()
    anno_nome = serializers.SerializerMethodField()

    class Meta:
        model = MediaPortfolio
        fields = [
            'id', 'anno', 'anno_nome',
            'gruppo', 'gruppo_nome', 'gruppo_colore',
            'file_url', 'thumbnail_url', 'tipo',
            'data', 'autore_nome', 'descrizione', 'caricato_at',
        ]

    def _abs_url(self, field_file):
        request = self.context.get('request')
        if not field_file:
            return None
        try:
            url = field_file.url
            return request.build_absolute_uri(url) if request else url
        except Exception:
            return None

    def get_file_url(self, obj):
        return self._abs_url(obj.file)

    def get_thumbnail_url(self, obj):
        # Se la thumbnail non è ancora pronta restituisce None — il frontend usa un placeholder
        return self._abs_url(obj.thumbnail) if obj.thumbnail else None

    def get_autore_nome(self, obj):
        if obj.autore:
            return obj.autore.get_full_name() or obj.autore.email
        return None

    def get_gruppo_nome(self, obj):
        return obj.gruppo.nome if obj.gruppo else None

    def get_gruppo_colore(self, obj):
        return obj.gruppo.colore if obj.gruppo else '#6C5CE7'

    def get_anno_nome(self, obj):
        return obj.anno.nome if obj.anno else None


class MediaPortfolioWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = MediaPortfolio
        fields = ['anno', 'gruppo', 'file', 'tipo', 'data', 'descrizione']
