from django.contrib import admin
from .models import SessioneColloqui, PrenotazioneColloquio


@admin.register(SessioneColloqui)
class SessioneColloquiAdmin(admin.ModelAdmin):
    list_display = ['titolo', 'data', 'ora_inizio', 'ora_fine', 'durata_slot', 'aperto', 'creato_da']
    list_filter = ['aperto', 'data']
    search_fields = ['titolo']


@admin.register(PrenotazioneColloquio)
class PrenotazioneColloquioAdmin(admin.ModelAdmin):
    list_display = ['sessione', 'genitore', 'bambino', 'slot_index', 'disdetta', 'creato_at']
    list_filter = ['disdetta', 'sessione__data']
    search_fields = ['genitore__email', 'genitore__first_name', 'genitore__last_name']
