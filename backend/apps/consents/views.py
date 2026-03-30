from django.db.models import Q
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.children.models import Bambino
from apps.users.models import Role
from apps.consents.permissions import ConsensoPermission
from .models import ConsensoFotografico
from .serializers import ConsensoFotograficoSerializer


def _calcola_stato(c, has_g2, non_fotografabile):
    if non_fotografabile:
        return 'non_fotografabile'
    if c.revocato:
        return 'revocato'
    if has_g2:
        if c.consenso_genitore1 and c.consenso_genitore2:
            return 'completo'
        if c.consenso_genitore1 or c.consenso_genitore2:
            return 'parziale'
    else:
        if c.consenso_genitore1:
            return 'completo'
    return 'nessuno'


class ConsensoFotograficoViewSet(viewsets.ModelViewSet):
    serializer_class = ConsensoFotograficoSerializer
    permission_classes = [IsAuthenticated, ConsensoPermission]

    def get_queryset(self):
        user = self.request.user
        qs = ConsensoFotografico.objects.select_related(
            'bambino__famiglia__genitore1',
            'bambino__famiglia__genitore2',
        )
        if user.role == Role.GENITORE:
            return qs.filter(
                Q(bambino__famiglia__genitore1=user)
                | Q(bambino__famiglia__genitore2=user)
            )
        if user.role not in (Role.ADMIN, Role.DIRETTRICE, Role.COORDINATRICE, Role.INSEGNANTE):
            return qs.none()
        return qs

    # ── Custom actions ────────────────────────────────────────────────────────

    @action(detail=False, methods=['get'])
    def stato(self, request):
        """Riepilogo per admin: lista bambini con stato consensi per finalità."""
        bambini = (
            Bambino.objects
            .filter(attivo=True)
            .select_related('famiglia__genitore1', 'famiglia__genitore2')
            .prefetch_related('consensi')
            .order_by('cognome', 'nome')
        )

        result = []
        for b in bambini:
            try:
                has_g2 = b.famiglia is not None and b.famiglia.genitore2 is not None
            except Exception:
                has_g2 = False

            consensi_map = {c.finalita: c for c in b.consensi.all()}
            consensi = {}

            for val, _label in ConsensoFotografico.Finalita.choices:
                c = consensi_map.get(val)
                if c is None:
                    consensi[val] = {
                        'id': None,
                        'stato': 'non_fotografabile' if b.non_fotografabile else 'nessuno',
                        'consenso_genitore1': False,
                        'consenso_genitore2': None,
                        'data_consenso_genitore1': None,
                        'data_consenso_genitore2': None,
                        'revocato': False,
                        'data_revoca': None,
                        'note': '',
                    }
                else:
                    consensi[val] = {
                        'id': c.id,
                        'stato': _calcola_stato(c, has_g2, b.non_fotografabile),
                        'consenso_genitore1': c.consenso_genitore1,
                        'consenso_genitore2': c.consenso_genitore2 if has_g2 else None,
                        'data_consenso_genitore1': c.data_consenso_genitore1,
                        'data_consenso_genitore2': c.data_consenso_genitore2 if has_g2 else None,
                        'revocato': c.revocato,
                        'data_revoca': c.data_revoca,
                        'note': c.note,
                    }

            result.append({
                'id': b.id,
                'nome': b.nome,
                'cognome': b.cognome,
                'non_fotografabile': b.non_fotografabile,
                'ha_famiglia': hasattr(b, 'famiglia') and b.famiglia is not None,
                'has_genitore2': has_g2,
                'consensi': consensi,
            })

        return Response(result)

    @action(detail=False, methods=['get'])
    def miei(self, request):
        """Genitore: stato consensi per i propri figli."""
        if request.user.role != Role.GENITORE:
            return Response({'detail': 'Riservato ai genitori.'}, status=status.HTTP_403_FORBIDDEN)

        user = request.user
        figli = (
            Bambino.objects
            .filter(Q(famiglia__genitore1=user) | Q(famiglia__genitore2=user))
            .select_related('famiglia__genitore1', 'famiglia__genitore2')
            .prefetch_related('consensi')
            .order_by('cognome', 'nome')
        )

        result = []
        for b in figli:
            try:
                is_genitore2 = b.famiglia.genitore2 == user
            except Exception:
                is_genitore2 = False

            consensi = []
            for val, label in ConsensoFotografico.Finalita.choices:
                try:
                    c = b.consensi.get(finalita=val)
                    mio_consenso = c.consenso_genitore2 if is_genitore2 else c.consenso_genitore1
                    mia_data = c.data_consenso_genitore2 if is_genitore2 else c.data_consenso_genitore1
                    consenso_id = c.id
                    revocato = c.revocato
                    data_revoca = c.data_revoca
                except ConsensoFotografico.DoesNotExist:
                    mio_consenso = False
                    mia_data = None
                    consenso_id = None
                    revocato = False
                    data_revoca = None

                consensi.append({
                    'id': consenso_id,
                    'finalita': val,
                    'finalita_label': label,
                    'mio_consenso': bool(mio_consenso),
                    'mia_data_consenso': mia_data,
                    'revocato': revocato,
                    'data_revoca': data_revoca,
                })

            result.append({
                'id': b.id,
                'nome': b.nome,
                'cognome': b.cognome,
                'non_fotografabile': b.non_fotografabile,
                'is_genitore2': is_genitore2,
                'consensi': consensi,
            })

        return Response(result)

    @action(detail=True, methods=['post'])
    def dai_consenso(self, request, pk=None):
        """Genitore dà il proprio consenso. Admin imposta entrambi."""
        c = self.get_object()
        user = request.user
        now = timezone.now()

        if user.role == Role.GENITORE:
            try:
                if c.bambino.famiglia.genitore1 == user:
                    c.consenso_genitore1 = True
                    c.data_consenso_genitore1 = now
                elif c.bambino.famiglia.genitore2 == user:
                    c.consenso_genitore2 = True
                    c.data_consenso_genitore2 = now
                else:
                    return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)
            except Exception:
                return Response({'detail': 'Famiglia non trovata.'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            # Admin/Direttrice: imposta genitore1; genitore2 se presente
            c.consenso_genitore1 = True
            c.data_consenso_genitore1 = now
            try:
                if c.bambino.famiglia.genitore2 is not None:
                    c.consenso_genitore2 = True
                    c.data_consenso_genitore2 = now
            except Exception:
                pass

        c.save()
        return Response(ConsensoFotograficoSerializer(c).data)

    @action(detail=True, methods=['post'])
    def revoca_consenso(self, request, pk=None):
        """Genitore revoca il proprio consenso. Admin revoca il record intero."""
        c = self.get_object()
        user = request.user
        now = timezone.now()

        if user.role == Role.GENITORE:
            try:
                if c.bambino.famiglia.genitore1 == user:
                    c.consenso_genitore1 = False
                    c.data_consenso_genitore1 = None
                elif c.bambino.famiglia.genitore2 == user:
                    c.consenso_genitore2 = False
                    c.data_consenso_genitore2 = None
                else:
                    return Response({'detail': 'Non autorizzato.'}, status=status.HTTP_403_FORBIDDEN)
            except Exception:
                return Response({'detail': 'Famiglia non trovata.'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            c.revocato = True
            c.data_revoca = now

        c.save()
        return Response(ConsensoFotograficoSerializer(c).data)

    @action(detail=False, methods=['post'])
    def revoca_tutti(self, request):
        """Admin: revoca tutti i consensi di un bambino."""
        bambino_id = request.data.get('bambino')
        if not bambino_id:
            return Response({'detail': 'Campo "bambino" obbligatorio.'}, status=status.HTTP_400_BAD_REQUEST)
        now = timezone.now()
        count = ConsensoFotografico.objects.filter(bambino_id=bambino_id).update(
            revocato=True,
            data_revoca=now,
        )
        return Response({'revocati': count})
