from django.contrib import admin
from .models import LogAccesso


@admin.register(LogAccesso)
class LogAccessoAdmin(admin.ModelAdmin):
    list_display = ['timestamp', 'utente_email', 'utente_ruolo', 'azione', 'risorsa', 'oggetto_id', 'ip_address']
    list_filter = ['azione', 'risorsa', 'utente_ruolo']
    search_fields = ['utente_email', 'oggetto_id', 'dettagli']
    readonly_fields = ['timestamp', 'utente', 'utente_email', 'utente_ruolo', 'azione',
                       'risorsa', 'oggetto_id', 'dettagli', 'ip_address']
    ordering = ['-timestamp']
    date_hierarchy = 'timestamp'

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
