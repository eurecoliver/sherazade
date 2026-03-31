from django.contrib import admin
from .models import Presenza


@admin.register(Presenza)
class PresenzaAdmin(admin.ModelAdmin):
    list_display = ('bambino', 'data', 'presente', 'ora_arrivo', 'assenza_comunicata', 'motivo_assenza', 'registrato_da')
    list_filter = ('data', 'presente', 'assenza_comunicata', 'motivo_assenza', 'bambino__sezione')
    search_fields = ('bambino__nome', 'bambino__cognome')
    readonly_fields = ('registrato_da', 'creato_at', 'aggiornato_at')
    date_hierarchy = 'data'
