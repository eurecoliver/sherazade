from django.contrib import admin

from .models import Gruppo, OrarioUscita


@admin.register(Gruppo)
class GruppoAdmin(admin.ModelAdmin):
    list_display = ('nome', 'colore', 'ordine', 'attivo')
    list_filter = ('attivo',)
    search_fields = ('nome',)


@admin.register(OrarioUscita)
class OrarioUscitaAdmin(admin.ModelAdmin):
    list_display = ('etichetta', 'orario', 'ordine', 'attivo')
    list_filter = ('attivo',)
