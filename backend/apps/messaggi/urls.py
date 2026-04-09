from rest_framework.routers import DefaultRouter
from .views import CircolareViewSet

router = DefaultRouter()
router.register(r'circolari', CircolareViewSet, basename='circolare')

urlpatterns = router.urls
