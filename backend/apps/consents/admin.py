from django.contrib import admin
from .models import ConsensoFotografico


@admin.register(ConsensoFotografico)
class ConsensoFotograficoAdmin(admin.ModelAdmin):
    list_display = (
        'bambino', 'finalita', 'consenso_genitore1', 'consenso_genitore2',
        'revocato', 'creato_il',
    )
    list_filter = ('finalita', 'revocato', 'consenso_genitore1', 'consenso_genitore2')
    search_fields = ('bambino__nome', 'bambino__cognome')
    readonly_fields = ('creato_il', 'aggiornato_il')
