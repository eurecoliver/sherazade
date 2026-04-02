from rest_framework.routers import DefaultRouter
from .views import RegistroDiarioViewSet, MediaDiarioViewSet, TagCosaPortareViewSet

router = DefaultRouter()
router.register(r'diario/registri', RegistroDiarioViewSet, basename='registro-diario')
router.register(r'diario/media', MediaDiarioViewSet, basename='media-diario')
router.register(r'diario/tags', TagCosaPortareViewSet, basename='tag-cosa-portare')

urlpatterns = router.urls
