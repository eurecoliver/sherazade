from django.contrib import admin
from .models import PushSubscription


@admin.register(PushSubscription)
class PushSubscriptionAdmin(admin.ModelAdmin):
    list_display = ['user', 'endpoint_short', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user__email', 'user__first_name', 'user__last_name']
    readonly_fields = ['created_at']

    def endpoint_short(self, obj):
        return obj.endpoint[:80] + '...' if len(obj.endpoint) > 80 else obj.endpoint
    endpoint_short.short_description = 'Endpoint'
