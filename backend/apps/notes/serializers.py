from rest_framework import serializers
from .models import NotaGiornata


class NotaGiornataSerializer(serializers.ModelSerializer):
    autore_nome = serializers.SerializerMethodField()
    autore_ruolo = serializers.SerializerMethodField()
    gruppo_nome = serializers.SerializerMethodField()
    is_own = serializers.SerializerMethodField()

    class Meta:
        model = NotaGiornata
        fields = [
            'id', 'testo', 'data',
            'autore', 'autore_nome', 'autore_ruolo',
            'gruppo', 'gruppo_nome',
            'creato_at', 'is_own',
        ]
        read_only_fields = ['id', 'autore', 'creato_at']

    def get_autore_nome(self, obj):
        u = obj.autore
        full = f'{u.first_name} {u.last_name}'.strip()
        return full or u.email

    def get_autore_ruolo(self, obj):
        return obj.autore.get_role_display() if hasattr(obj.autore, 'get_role_display') else obj.autore.role

    def get_gruppo_nome(self, obj):
        return obj.gruppo.nome if obj.gruppo else None

    def get_is_own(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.autore_id == request.user.pk
        return False

    def create(self, validated_data):
        validated_data['autore'] = self.context['request'].user
        return super().create(validated_data)
