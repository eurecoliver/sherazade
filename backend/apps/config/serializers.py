from rest_framework import serializers

from .models import Gruppo, OrarioUscita, PermessoRuolo, Ruolo


class GruppoSerializer(serializers.ModelSerializer):
    bambini_count = serializers.SerializerMethodField()

    class Meta:
        model = Gruppo
        fields = ['id', 'nome', 'colore', 'ordine', 'attivo', 'creato_da', 'creato_il', 'bambini_count']
        read_only_fields = ['id', 'creato_da', 'creato_il']

    def get_bambini_count(self, obj):
        return obj.bambini.filter(attivo=True).count()


class OrarioUscitaSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrarioUscita
        fields = ['id', 'etichetta', 'orario', 'attivo', 'ordine']


class RuoloSerializer(serializers.ModelSerializer):
    user_count = serializers.SerializerMethodField()

    class Meta:
        model = Ruolo
        fields = ['id', 'codice', 'nome', 'sistema', 'ordine', 'creato_at', 'user_count']
        read_only_fields = ['id', 'sistema', 'creato_at', 'user_count']

    def get_user_count(self, obj):
        from apps.users.models import User
        return User.objects.filter(role=obj.codice).count()

    def validate_codice(self, value):
        # Impedisce la creazione di un ruolo con codice 'admin'
        if value == 'admin':
            raise serializers.ValidationError("Il codice 'admin' è riservato al ruolo di sistema.")
        return value


class PermessoRuoloSerializer(serializers.ModelSerializer):
    class Meta:
        model = PermessoRuolo
        fields = ['id', 'ruolo', 'risorsa', 'azione', 'consentito']
        read_only_fields = ['id', 'ruolo', 'risorsa', 'azione']
