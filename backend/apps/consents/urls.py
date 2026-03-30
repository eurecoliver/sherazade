from rest_framework.routers import DefaultRouter
from .views import ConsensoFotograficoViewSet

router = DefaultRouter()
router.register(r'consensi', ConsensoFotograficoViewSet, basename='consenso')

urlpatterns = router.urls
