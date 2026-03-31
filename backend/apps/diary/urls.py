from rest_framework.routers import DefaultRouter
from .views import RegistroDiarioViewSet, MediaDiarioViewSet

router = DefaultRouter()
router.register(r'diario/registri', RegistroDiarioViewSet, basename='registro-diario')
router.register(r'diario/media', MediaDiarioViewSet, basename='media-diario')

urlpatterns = router.urls
