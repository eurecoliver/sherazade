from django.contrib import admin
from .models import RegistroDiario, MediaDiario


class MediaDiarioInline(admin.TabularInline):
    model = MediaDiario
    extra = 0
    readonly_fields = ('caricato_da', 'creato_at')


@admin.register(RegistroDiario)
class RegistroDiarioAdmin(admin.ModelAdmin):
    list_display = ('bambino', 'data', 'umore', 'autore', 'creato_at')
    list_filter = ('data', 'umore', 'bambino__sezione')
    search_fields = ('bambino__nome', 'bambino__cognome')
    inlines = [MediaDiarioInline]
    readonly_fields = ('creato_at', 'aggiornato_at')


@admin.register(MediaDiario)
class MediaDiarioAdmin(admin.ModelAdmin):
    list_display = ('registro', 'tipo', 'visibile_a_genitori', 'caricato_da', 'creato_at')
    list_filter = ('tipo', 'visibile_a_genitori')
    readonly_fields = ('caricato_da', 'creato_at')
