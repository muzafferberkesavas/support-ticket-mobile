import * as SecureStore from 'expo-secure-store';
import { Appearance, DevSettings } from 'react-native';

export type ThemePref = 'system' | 'light' | 'dark';
const KEY = 'theme_pref';

export async function getThemePref(): Promise<ThemePref> {
  try {
    const v = await SecureStore.getItemAsync(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

async function persist(p: ThemePref): Promise<void> {
  try {
    if (p === 'system') await SecureStore.deleteItemAsync(KEY);
    else await SecureStore.setItemAsync(KEY, p);
  } catch {
    /* ignore */
  }
}

// Kullanıcı temayı değiştirince: kaydet + Appearance override (getColorScheme'i değiştirir)
// + uygulamayı yeniden yükle ki tüm StyleSheet'ler/META yeni paletle yeniden değerlensin.
export async function applyThemePref(p: ThemePref): Promise<void> {
  await persist(p);
  // null → override'ı temizle (RN runtime davranışı; tipler fazla katı).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Appearance.setColorScheme(p === 'system' ? (null as any) : p);
  try {
    DevSettings.reload();
  } catch {
    /* prod build'de expo-updates gerekir */
  }
}
