from django.contrib import admin
from .models import Circolare, LetturaCircolare


@admin.register(Circolare)
class CircolareAdmin(admin.ModelAdmin):
    list_display = ['titolo', 'autore', 'pubblicata', 'notifica_inviata', 'creato_at']
    list_filter = ['pubblicata', 'notifica_inviata']
    search_fields = ['titolo', 'testo']
    filter_horizontal = ['gruppi']


@admin.register(LetturaCircolare)
class LetturaCircolareAdmin(admin.ModelAdmin):
    list_display = ['circolare', 'utente', 'letto_at']
