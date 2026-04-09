from django.contrib import admin
from .models import NotaGiornata

@admin.register(NotaGiornata)
class NotaGiornataAdmin(admin.ModelAdmin):
    list_display = ('data', 'autore', 'gruppo', 'testo_breve', 'creato_at', 'attivo')
    list_filter = ('data', 'gruppo', 'attivo')
    search_fields = ('testo', 'autore__first_name', 'autore__last_name')
    date_hierarchy = 'data'

    def testo_breve(self, obj):
        return obj.testo[:60] + '…' if len(obj.testo) > 60 else obj.testo
    testo_breve.short_description = 'Testo'
