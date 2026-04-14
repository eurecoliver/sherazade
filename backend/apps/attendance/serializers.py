from rest_framework import serializers
from .models import Presenza, DailyQRCodeToken, ConfigurazioneCheckin


class ConfigurazioneCheckinSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfigurazioneCheckin
        fields = ('qr_abilitato',)


class DailyQRCodeTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyQRCodeToken
        fields = ('token', 'data', 'creato_at')


class PresenzaSerializer(serializers.ModelSerializer):
    bambino_nome = serializers.SerializerMethodField()
    bambino_sezione = serializers.SerializerMethodField()
    registrato_da_nome = serializers.SerializerMethodField()

    class Meta:
        model = Presenza
        fields = (
            'id', 'bambino', 'bambino_nome', 'bambino_sezione', 'data',
            'presente', 'ora_arrivo', 'ora_uscita',
            'minuti_ritardo_arrivo', 'minuti_ritardo_uscita',
            'assenza_comunicata', 'motivo_assenza', 'note',
            'registrato_da', 'registrato_da_nome',
            'creato_at', 'aggiornato_at',
        )
        read_only_fields = ('registrato_da', 'creato_at', 'aggiornato_at',
                            'minuti_ritardo_arrivo', 'minuti_ritardo_uscita')

    def get_bambino_nome(self, obj):
        return str(obj.bambino)

    def get_bambino_sezione(self, obj):
        return obj.bambino.sezione

    def get_registrato_da_nome(self, obj):
        return obj.registrato_da.get_full_name() or obj.registrato_da.email


class PresenzaWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Presenza
        fields = (
            'id', 'bambino', 'data',
            'presente', 'ora_arrivo', 'ora_uscita',
            'assenza_comunicata', 'motivo_assenza', 'note',
        )
