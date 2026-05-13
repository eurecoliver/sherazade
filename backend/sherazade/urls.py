from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.db import connection


def health_check(request):
    try:
        connection.ensure_connection()
        db_ok = True
    except Exception:
        db_ok = False
    status = 200 if db_ok else 503
    return JsonResponse({'status': 'ok' if db_ok else 'degraded', 'db': db_ok}, status=status)


urlpatterns = [
    path('api/v1/health/', health_check, name='health_check'),
    path('admin/', admin.site.urls),
    path('api/v1/auth/', include('apps.users.urls')),
    path('api/v1/', include('apps.config.urls')),
    path('api/v1/', include('apps.children.urls')),
    path('api/v1/', include('apps.consents.urls')),
    path('api/v1/', include('apps.diary.urls')),
    path('api/v1/', include('apps.meals.urls')),
    path('api/v1/', include('apps.attendance.urls')),
    path('api/v1/', include('apps.billing.urls')),
    path('api/v1/', include('apps.notes.urls')),
    path('api/v1/', include('apps.calendario.urls')),
    path('api/v1/', include('apps.messaggi.urls')),
    path('api/v1/', include('apps.portfolio.urls')),
    path('api/v1/', include('apps.notifications.urls')),
    path('api/v1/', include('apps.audit.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
