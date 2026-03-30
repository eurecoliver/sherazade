from rest_framework.routers import DefaultRouter
from .views import BambinoViewSet, FamigliaViewSet, DelegaRitiroViewSet

router = DefaultRouter()
router.register(r'bambini', BambinoViewSet, basename='bambino')
router.register(r'famiglie', FamigliaViewSet, basename='famiglia')
router.register(r'deleghe', DelegaRitiroViewSet, basename='delega')

urlpatterns = router.urls
