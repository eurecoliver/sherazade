from django.contrib import admin
from .models import AllergiaIntolleranza, MenuGiornaliero, RegistroPasto


@admin.register(AllergiaIntolleranza)
class AllergiaIntolleranzaAdmin(admin.ModelAdmin):
    list_display = ('bambino', 'tipo', 'descrizione', 'gravita', 'attivo')
    list_filter = ('tipo', 'gravita', 'attivo')
    search_fields = ('bambino__nome', 'bambino__cognome', 'descrizione')


@admin.register(MenuGiornaliero)
class MenuGiornalieroAdmin(admin.ModelAdmin):
    list_display = ('data', 'sezione', 'primo', 'secondo', 'inserito_da')
    list_filter = ('data', 'sezione')
    readonly_fields = ('inserito_da', 'creato_il', 'aggiornato_il')


@admin.register(RegistroPasto)
class RegistroPastoAdmin(admin.ModelAdmin):
    list_display = ('bambino', 'data', 'primo_quantita', 'secondo_quantita', 'compilato_da')
    list_filter = ('data', 'bambino__sezione')
    search_fields = ('bambino__nome', 'bambino__cognome')
    readonly_fields = ('compilato_da', 'creato_at', 'aggiornato_at')
