import api from './api';

export const PUSH_SUBSCRIPTION_FLAG = 'push-notifications-subscribed';

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
};

const isSupported = () =>
  typeof window !== 'undefined' &&
  'Notification' in window &&
  'serviceWorker' in navigator &&
  'PushManager' in window;

const getRegistration = async () => {
  if (!isSupported()) return null;
  return navigator.serviceWorker.ready;
};

export const pushNotificationService = {
  isSupported,

  async getStatus() {
    if (!isSupported()) {
      return { supported: false, permission: 'denied' as NotificationPermission, subscribed: false, enabled: false };
    }

    const registration = await getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    const response = await api.get('/agenda/push/public-key');

    return {
      supported: true,
      permission: Notification.permission,
      subscribed: Boolean(subscription),
      enabled: Boolean(response.data?.enabled && response.data?.publicKey),
      publicKey: response.data?.publicKey as string | null,
    };
  },

  async subscribe() {
    if (!isSupported()) return { subscribed: false, reason: 'unsupported' as const };

    const permission =
      Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission();

    if (permission !== 'granted') {
      return { subscribed: false, reason: permission as 'default' | 'denied' };
    }

    const response = await api.get('/agenda/push/public-key');
    const publicKey = response.data?.publicKey as string | null;

    if (!response.data?.enabled || !publicKey) {
      return { subscribed: false, reason: 'disabled' as const };
    }

    const registration = await getRegistration();
    if (!registration) {
      return { subscribed: false, reason: 'unsupported' as const };
    }

    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ||
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      }));

    await api.post('/agenda/push/subscription', {
      subscription: subscription.toJSON(),
    });

    window.localStorage.setItem(PUSH_SUBSCRIPTION_FLAG, '1');

    return { subscribed: true };
  },

  async unsubscribe() {
    if (!isSupported()) return;

    const registration = await getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;

    await api.delete('/agenda/push/subscription', {
      data: { endpoint: subscription.endpoint },
    });
    await subscription.unsubscribe();
    window.localStorage.removeItem(PUSH_SUBSCRIPTION_FLAG);
  },

  async syncIfGranted() {
    if (!isSupported() || Notification.permission !== 'granted') return;

    try {
      const result = await this.subscribe();
      if (!result.subscribed && result.reason === 'disabled') {
        console.info('Push deshabilitado en backend o sin claves VAPID configuradas.');
      }
    } catch (error) {
      console.warn('No se pudo sincronizar la suscripción push', error);
    }
  },
};
