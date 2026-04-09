from rest_framework.routers import DefaultRouter
from .views import FatturaViewSet

router = DefaultRouter()
router.register('fatture', FatturaViewSet, basename='fattura')

urlpatterns = router.urls
