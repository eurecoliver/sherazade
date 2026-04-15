"""
Genera le chiavi VAPID per le notifiche push PWA.

Utilizzo:
    python manage.py generate_vapid_keys

Le chiavi generate vanno aggiunte al file .env del backend e al .env del frontend.
IMPORTANTE: genera le chiavi UNA SOLA VOLTA e salvale in modo sicuro.
Cambiare le chiavi invalida tutte le sottoscrizioni push esistenti.
"""
import base64

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Genera le chiavi VAPID per le notifiche push PWA'

    def handle(self, *args, **options):
        try:
            from cryptography.hazmat.primitives.asymmetric import ec
            from cryptography.hazmat.primitives import serialization
        except ImportError:
            self.stderr.write(self.style.ERROR(
                'Libreria cryptography non trovata. Installa pywebpush prima: pip install pywebpush'
            ))
            return

        key = ec.generate_private_key(ec.SECP256R1())

        private_bytes = key.private_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PrivateFormat.Raw,
            encryption_algorithm=serialization.NoEncryption(),
        )
        public_bytes = key.public_key().public_bytes(
            encoding=serialization.Encoding.X962,
            format=serialization.PublicFormat.UncompressedPoint,
        )

        private_b64 = base64.urlsafe_b64encode(private_bytes).decode().rstrip('=')
        public_b64 = base64.urlsafe_b64encode(public_bytes).decode().rstrip('=')

        self.stdout.write(self.style.SUCCESS('\n=== Chiavi VAPID generate con successo ===\n'))
        self.stdout.write('Aggiungi al file backend/.env:\n')
        self.stdout.write(f'VAPID_PRIVATE_KEY={private_b64}')
        self.stdout.write(f'VAPID_PUBLIC_KEY={public_b64}')
        self.stdout.write(f'VAPID_ADMIN_EMAIL=noreply@sherazade.it')
        self.stdout.write('')
        self.stdout.write('Aggiungi al file frontend/.env (o docker-compose.yml → frontend → environment):')
        self.stdout.write(f'NEXT_PUBLIC_VAPID_PUBLIC_KEY={public_b64}')
        self.stdout.write(self.style.WARNING(
            '\nIMPORTANTE: Salva queste chiavi in modo sicuro!\n'
            'Cambiarle in futuro invaliderà tutte le sottoscrizioni push esistenti.\n'
        ))
