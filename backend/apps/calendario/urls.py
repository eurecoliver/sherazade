from rest_framework.routers import DefaultRouter
from .views import TipoEventoViewSet, EventoCalendarioViewSet

router = DefaultRouter()
router.register(r'calendario/tipi', TipoEventoViewSet, basename='tipo-evento')
router.register(r'calendario', EventoCalendarioViewSet, basename='evento-calendario')

urlpatterns = router.urls
