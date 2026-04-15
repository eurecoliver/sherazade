from rest_framework import serializers
from .models import LogAccesso


class LogAccessoSerializer(serializers.ModelSerializer):
    class Meta:
        model = LogAccesso
        fields = [
            'id', 'timestamp', 'utente_email', 'utente_ruolo',
            'azione', 'risorsa', 'oggetto_id', 'dettagli', 'ip_address',
        ]
        read_only_fields = fields
