from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SessioneColloquiViewSet, PrenotazioneColloquioViewSet

router = DefaultRouter()
router.register(r'sessioni', SessioneColloquiViewSet, basename='sessioni-colloqui')
router.register(r'prenotazioni', PrenotazioneColloquioViewSet, basename='prenotazioni-colloquio')

urlpatterns = [
    path('colloqui/', include(router.urls)),
]
