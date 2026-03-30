from django.utils import timezone
from rest_framework import serializers
from .models import ConsensoFotografico


class ConsensoFotograficoSerializer(serializers.ModelSerializer):
    bambino_nome = serializers.SerializerMethodField()
    stato = serializers.ReadOnlyField()
    finalita_label = serializers.CharField(source='get_finalita_display', read_only=True)

    class Meta:
        model = ConsensoFotografico
        fields = '__all__'
        read_only_fields = ('creato_il', 'aggiornato_il')

    def get_bambino_nome(self, obj):
        return str(obj.bambino)

    def update(self, instance, validated_data):
        now = timezone.now()

        # Auto-gestione timestamp al cambio di stato
        if 'consenso_genitore1' in validated_data:
            if validated_data['consenso_genitore1'] and not instance.consenso_genitore1:
                validated_data.setdefault('data_consenso_genitore1', now)
            elif not validated_data['consenso_genitore1']:
                validated_data['data_consenso_genitore1'] = None

        if 'consenso_genitore2' in validated_data:
            if validated_data['consenso_genitore2'] and not instance.consenso_genitore2:
                validated_data.setdefault('data_consenso_genitore2', now)
            elif not validated_data['consenso_genitore2']:
                validated_data['data_consenso_genitore2'] = None

        if 'revocato' in validated_data:
            if validated_data['revocato'] and not instance.revocato:
                validated_data.setdefault('data_revoca', now)
            elif not validated_data['revocato']:
                validated_data['data_revoca'] = None

        return super().update(instance, validated_data)
