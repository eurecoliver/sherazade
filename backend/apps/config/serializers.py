from rest_framework import serializers

from .models import Gruppo, OrarioUscita


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
