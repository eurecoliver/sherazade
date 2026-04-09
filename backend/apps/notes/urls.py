from rest_framework.routers import DefaultRouter
from .views import NotaGiornataViewSet

router = DefaultRouter()
router.register(r'note', NotaGiornataViewSet, basename='nota')

urlpatterns = router.urls
