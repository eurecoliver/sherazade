from rest_framework import serializers
from .models import ConfigurazioneIscrizioni, RichiestaIscrizione


class ConfigurazioneIscrizioniSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfigurazioneIscrizioni
        fields = '__all__'


class RichiestaIscrizioneSerializer(serializers.ModelSerializer):
    stato_display = serializers.CharField(source='get_stato_display', read_only=True)
    assegnato_a_nome = serializers.SerializerMethodField()
    bambino_nome_completo = serializers.SerializerMethodField()

    class Meta:
        model = RichiestaIscrizione
        fields = '__all__'
        read_only_fields = ['stato', 'assegnato_a', 'bambino', 'ip_address',
                            'creato_at', 'aggiornato_at']

    def get_assegnato_a_nome(self, obj):
        if obj.assegnato_a:
            return f'{obj.assegnato_a.first_name} {obj.assegnato_a.last_name}'.strip() or obj.assegnato_a.email
        return None

    def get_bambino_nome_completo(self, obj):
        return f'{obj.bambino_nome} {obj.bambino_cognome}'

    def validate_g1_email(self, value):
        return value.lower().strip()

    def validate_g2_email(self, value):
        return value.lower().strip() if value else value

    def validate(self, data):
        g2_nome = data.get('g2_nome', '')
        g2_email = data.get('g2_email', '')
        # Se il genitore 2 è parzialmente compilato, richiede email + nome
        if (g2_nome or g2_email) and not (g2_nome and g2_email):
            raise serializers.ValidationError(
                'Per il genitore 2 indicare almeno nome, cognome ed email.'
            )
        return data


class RichiestaIscrizioneWriteSerializer(serializers.ModelSerializer):
    """Usato solo per il POST pubblico — include tutti i campi editabili."""
    class Meta:
        model = RichiestaIscrizione
        fields = [
            'bambino_nome', 'bambino_cognome', 'bambino_data_nascita',
            'bambino_codice_fiscale', 'bambino_note_mediche',
            'g1_nome', 'g1_cognome', 'g1_email', 'g1_telefono',
            'g1_codice_fiscale', 'g1_indirizzo',
            'g2_nome', 'g2_cognome', 'g2_email', 'g2_telefono',
            'note_genitore',
        ]

    def validate_g1_email(self, value):
        return value.lower().strip()

    def validate_g2_email(self, value):
        return value.lower().strip() if value else value

    def validate(self, data):
        g2_nome = data.get('g2_nome', '')
        g2_email = data.get('g2_email', '')
        if (g2_nome or g2_email) and not (g2_nome and g2_email):
            raise serializers.ValidationError(
                'Per il genitore 2 indicare almeno nome, cognome ed email.'
            )
        return data
