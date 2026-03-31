from rest_framework.routers import DefaultRouter
from .views import PresenzaViewSet

router = DefaultRouter()
router.register(r'presenze', PresenzaViewSet, basename='presenza')

urlpatterns = router.urls
