from rest_framework import serializers
from .models import RegistroDiario, MediaDiario, TagCosaPortare


class TagCosaPortareSerializer(serializers.ModelSerializer):
    class Meta:
        model = TagCosaPortare
        fields = ('id', 'nome', 'colore', 'attivo', 'creato_at')
        read_only_fields = ('creato_at',)


class MediaDiarioSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = MediaDiario
        fields = (
            'id', 'registro', 'file', 'file_url', 'tipo',
            'thumbnail', 'thumbnail_url',
            'visibile_a_genitori', 'caricato_da', 'creato_at',
        )
        read_only_fields = ('caricato_da', 'creato_at', 'thumbnail')

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None

    def get_thumbnail_url(self, obj):
        request = self.context.get('request')
        if obj.thumbnail and request:
            return request.build_absolute_uri(obj.thumbnail.url)
        return None


class RegistroDiarioSerializer(serializers.ModelSerializer):
    media = MediaDiarioSerializer(many=True, read_only=True)
    tags_cosa_portare = TagCosaPortareSerializer(many=True, read_only=True)
    bambino_nome = serializers.SerializerMethodField()
    autore_nome = serializers.SerializerMethodField()
    umore_label = serializers.CharField(source='get_umore_display', read_only=True)

    class Meta:
        model = RegistroDiario
        fields = (
            'id', 'bambino', 'bambino_nome', 'data',
            'autore', 'autore_nome',
            'umore', 'umore_label',
            'attivita_descrizione', 'note_giornata',
            'sonno_inizio', 'sonno_fine',
            'popo',
            'tags_cosa_portare',
            'creato_at', 'aggiornato_at',
            'media',
        )
        read_only_fields = ('autore', 'creato_at', 'aggiornato_at')

    def get_bambino_nome(self, obj):
        return str(obj.bambino)

    def get_autore_nome(self, obj):
        return obj.autore.get_full_name() or obj.autore.email


class RegistroDiarioWriteSerializer(serializers.ModelSerializer):
    """Serializer per creazione/modifica — no media nested."""
    tags_cosa_portare = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=TagCosaPortare.objects.filter(attivo=True),
        required=False,
    )

    class Meta:
        model = RegistroDiario
        fields = (
            'id', 'bambino', 'data',
            'umore', 'attivita_descrizione', 'note_giornata',
            'sonno_inizio', 'sonno_fine',
            'popo',
            'tags_cosa_portare',
        )
