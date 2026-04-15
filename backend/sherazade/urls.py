from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
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
    path('api/v1/', include('apps.audit.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
