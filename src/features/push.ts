import { Platform } from 'react-native';

// NOT: expo-notifications, Expo Go SDK 53+ ile import edildiğinde hata fırlatır
// (remote push Expo Go'dan kaldırıldı). Bu yüzden modülü lazy + guard ile yüklüyoruz:
// - Geliştirme derlemesinde (dev build) tam çalışır.
// - Expo Go'da güvenle devre dışı kalır (uygulama çökmez), test butonu uyarı verir.
type NotifModule = typeof import('expo-notifications');
let mod: NotifModule | null = null;
let tried = false;
function load(): NotifModule | null {
  if (tried) return mod;
  tried = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('expo-notifications') as NotifModule;
  } catch {
    mod = null;
  }
  return mod;
}

export function notificationsAvailable(): boolean {
  return !!load();
}

let configured = false;
export function configureNotifications(): void {
  const N = load();
  if (!N || configured) return;
  configured = true;
  try {
    N.setNotificationHandler({
      handleNotification: async () =>
        ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }) as any,
    });
  } catch {
    /* Expo Go */
  }
}

export async function ensureNotificationPermission(): Promise<boolean> {
  const N = load();
  if (!N) return false;
  try {
    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync('default', {
        name: 'Destek bildirimleri',
        importance: N.AndroidImportance.HIGH,
        vibrationPattern: [0, 200, 100, 200],
      });
    }
    const current = await N.getPermissionsAsync();
    if (current.granted) return true;
    const req = await N.requestPermissionsAsync();
    return req.granted;
  } catch {
    return false;
  }
}

// Anında yerel bildirim. Başarılıysa true (Expo Go'da false döner).
export async function presentLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<boolean> {
  const N = load();
  if (!N) return false;
  try {
    await N.scheduleNotificationAsync({
      content: { title, body, data: data ?? {}, sound: 'default' },
      trigger: null,
    });
    return true;
  } catch {
    return false;
  }
}
