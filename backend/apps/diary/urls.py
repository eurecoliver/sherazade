from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse

# Il famoso heartbeat che il frontend sta cercando disperatamente
def heartbeat(request):
    return JsonResponse({"status": "alive", "version": "v2"})

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # ROTTE V1 (Lasciate per sicurezza/retrocompatibilità)
    path('api/v1/auth/', include('apps.users.urls')),
    path('api/v1/', include('apps.config.urls')),
    path('api/v1/', include('apps.children.urls')),
    path('api/v1/', include('apps.consents.urls')),
    path('api/v1/', include('apps.diary.urls')),
    path('api/v1/', include('apps.meals.urls')),
    path('api/v1/', include('apps.attendance.urls')),

    # ROTTE V2 (La nuova casa del codice aggiornato da Claude)
    path('api/v2/heartbeat', heartbeat),
    path('api/v2/auth/', include('apps.users.urls')),
    path('api/v2/', include('apps.config.urls')),
    path('api/v2/', include('apps.children.urls')),
    path('api/v2/', include('apps.consents.urls')),
    path('api/v2/', include('apps.diary.urls')),
    path('api/v2/', include('apps.meals.urls')),
    path('api/v2/', include('apps.attendance.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)