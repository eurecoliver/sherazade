from rest_framework.routers import DefaultRouter
from .views import AllergiaIntolleranzaViewSet, MenuGiornalieroViewSet, RegistroPastoViewSet

router = DefaultRouter()
router.register(r'meals/allergie', AllergiaIntolleranzaViewSet, basename='allergia')
router.register(r'meals/menu', MenuGiornalieroViewSet, basename='menu')
router.register(r'meals/pasti', RegistroPastoViewSet, basename='pasto')

urlpatterns = router.urls
