export type BrowserNotificationState = NotificationPermission | 'unsupported';

export function getNotificationPermission(): BrowserNotificationState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<BrowserNotificationState> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export async function showSystemNotification(
  title: string,
  body: string,
  tag?: string
): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.showNotification(title, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag,
        });
        return;
      }
    }

    new Notification(title, {
      body,
      icon: '/pwa-192x192.png',
      tag,
    });
  } catch {
    // Ignore notification errors in restricted contexts
  }
}
