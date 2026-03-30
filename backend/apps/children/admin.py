from django.contrib import admin
from .models import Bambino, Famiglia, DelegaRitiro


class FamigliaInline(admin.StackedInline):
    model = Famiglia
    extra = 0


class DelegaRitiroInline(admin.TabularInline):
    model = DelegaRitiro
    extra = 0


@admin.register(Bambino)
class BambinoAdmin(admin.ModelAdmin):
    list_display = ('cognome', 'nome', 'sezione', 'data_nascita', 'attivo')
    list_filter = ('sezione', 'attivo')
    search_fields = ('nome', 'cognome', 'codice_fiscale')
    inlines = [FamigliaInline, DelegaRitiroInline]


@admin.register(Famiglia)
class FamigliaAdmin(admin.ModelAdmin):
    list_display = ('bambino', 'genitore1', 'genitore2', 'telefono_emergenza')
    search_fields = ('bambino__nome', 'bambino__cognome')


@admin.register(DelegaRitiro)
class DelegaRitiroAdmin(admin.ModelAdmin):
    list_display = ('cognome_delegato', 'nome_delegato', 'bambino', 'rapporto_familiare', 'attivo')
    list_filter = ('attivo',)
