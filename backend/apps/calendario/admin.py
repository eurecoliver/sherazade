from django.contrib import admin
from .models import TipoEvento, EventoCalendario


@admin.register(TipoEvento)
class TipoEventoAdmin(admin.ModelAdmin):
    list_display = ['nome', 'icona', 'colore', 'attivo']
    list_filter = ['attivo']


@admin.register(EventoCalendario)
class EventoCalendarioAdmin(admin.ModelAdmin):
    list_display = ['titolo', 'tipo', 'data_inizio', 'data_fine', 'chiusura_scolastica', 'creato_da']
    list_filter = ['chiusura_scolastica', 'tipo']
    search_fields = ['titolo', 'descrizione']
    filter_horizontal = ['gruppi']
