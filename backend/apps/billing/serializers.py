from rest_framework import serializers
from .models import Fattura


class FatturaSerializer(serializers.ModelSerializer):
    genitore_nome = serializers.SerializerMethodField()
    genitore_email = serializers.SerializerMethodField()
    caricato_da_nome = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Fattura
        fields = (
            'id', 'genitore', 'genitore_nome', 'genitore_email',
            'anno', 'mese', 'importo', 'file', 'file_url',
            'note', 'caricato_da', 'caricato_da_nome',
            'caricato_at', 'aggiornato_at',
        )
        read_only_fields = ('caricato_da', 'caricato_at', 'aggiornato_at')

    def get_genitore_nome(self, obj):
        return obj.genitore.get_full_name() or obj.genitore.email

    def get_genitore_email(self, obj):
        return obj.genitore.email

    def get_caricato_da_nome(self, obj):
        if obj.caricato_da:
            return obj.caricato_da.get_full_name() or obj.caricato_da.email
        return None

    def get_file_url(self, obj):
        if not obj.file:
            return None
        request = self.context.get('request')
        try:
            from django.conf import settings
            if getattr(settings, 'USE_S3', False):
                url = obj.file.url
                internal = getattr(settings, 'AWS_S3_ENDPOINT_URL', '')
                external = getattr(settings, 'AWS_S3_ENDPOINT_URL_EXTERNAL', '')
                if external and internal and url.startswith(internal):
                    url = url.replace(internal, external, 1)
                return url
            else:
                base = getattr(settings, 'MEDIA_EXTERNAL_BASE_URL', '').rstrip('/')
                url = obj.file.url
                return f'{base}{url}' if base else (request.build_absolute_uri(url) if request else url)
        except Exception:
            return None
