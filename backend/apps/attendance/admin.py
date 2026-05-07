from django.contrib import admin
from .models import (
    Presenza,
    PresenzaInsegnante,
    ConfigurazioneCheckin,
    DailyQRCodeToken,
    DailyQRCodeTokenInsegnanti,
)


@admin.register(Presenza)
class PresenzaAdmin(admin.ModelAdmin):
    list_display = ('bambino', 'data', 'presente', 'ora_arrivo', 'assenza_comunicata', 'motivo_assenza', 'registrato_da')
    list_filter = ('data', 'presente', 'assenza_comunicata', 'motivo_assenza', 'bambino__gruppo')
    search_fields = ('bambino__nome', 'bambino__cognome')
    readonly_fields = ('registrato_da', 'creato_at', 'aggiornato_at')
    date_hierarchy = 'data'


@admin.register(PresenzaInsegnante)
class PresenzaInsegnanteAdmin(admin.ModelAdmin):
    list_display = ('insegnante', 'data', 'ora_entrata', 'ora_uscita', 'registrato_da')
    list_filter = ('data',)
    search_fields = ('insegnante__first_name', 'insegnante__last_name', 'insegnante__email')
    readonly_fields = ('creato_at', 'aggiornato_at')
    date_hierarchy = 'data'


@admin.register(ConfigurazioneCheckin)
class ConfigurazioneCheckinAdmin(admin.ModelAdmin):
    list_display = ('id', 'qr_abilitato', 'qr_insegnanti_abilitato')


@admin.register(DailyQRCodeToken)
class DailyQRCodeTokenAdmin(admin.ModelAdmin):
    list_display = ('data', 'creato_at', 'creato_da')
    list_filter = ('data',)
    readonly_fields = ('token', 'data', 'creato_at', 'creato_da')


@admin.register(DailyQRCodeTokenInsegnanti)
class DailyQRCodeTokenInsegnantiAdmin(admin.ModelAdmin):
    list_display = ('data', 'creato_at', 'creato_da')
    list_filter = ('data',)
    readonly_fields = ('token', 'data', 'creato_at', 'creato_da')
