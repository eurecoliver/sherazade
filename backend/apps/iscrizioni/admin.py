from django.contrib import admin
from .models import ConfigurazioneIscrizioni, RichiestaIscrizione


@admin.register(ConfigurazioneIscrizioni)
class ConfigurazioneIscrizioniAdmin(admin.ModelAdmin):
    list_display = ['anno_scolastico', 'aperto', 'data_apertura', 'data_chiusura']


@admin.register(RichiestaIscrizione)
class RichiestaIscrizioneAdmin(admin.ModelAdmin):
    list_display = ['bambino_cognome', 'bambino_nome', 'g1_email', 'stato',
                    'anno_scolastico', 'creato_at']
    list_filter = ['stato', 'anno_scolastico']
    search_fields = ['bambino_nome', 'bambino_cognome', 'g1_email']
    readonly_fields = ['creato_at', 'aggiornato_at', 'ip_address']
