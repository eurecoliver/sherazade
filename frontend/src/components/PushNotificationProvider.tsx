'use client';

import { useEffect } from 'react';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationProvider() {
  useEffect(() => {
    // Supporto browser
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    // Solo se l'utente è loggato
    if (!document.cookie.includes('access_token')) return;

    async function initPush() {
      try {
        // 1. Ottieni la chiave VAPID pubblica dal server
        const keyRes = await fetch('/api/notifiche/vapid-key');
        if (!keyRes.ok) return;
        const { key: vapidPublicKey } = await keyRes.json();
        if (!vapidPublicKey) return; // VAPID non configurato

        // 2. Registra il service worker
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        await navigator.serviceWorker.ready;

        // 3. Controlla se già sottoscritto
        const existingSub = await registration.pushManager.getSubscription();
        if (existingSub) {
          // Già sottoscritto — aggiorna silenziosamente il server
          await syncSubscription(existingSub);
          return;
        }

        // 4. Chiedi permesso
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        // 5. Sottoscrivi
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });

        await syncSubscription(subscription);
      } catch (err) {
        // Notifiche opzionali — non bloccare l'app
        console.debug('[Push] Subscription failed:', err);
      }
    }

    async function syncSubscription(subscription: PushSubscription) {
      const sub = subscription.toJSON();
      if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return;

      await fetch('/api/notifiche/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth,
        }),
      });
    }

    initPush();
  }, []);

  return null;
}
