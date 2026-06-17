import * as SecureStore from 'expo-secure-store';
import { TOKEN_KEY, BIOMETRIC_ENABLED_KEY } from '@/config';

// JWT, cihazın güvenli anahtar zincirinde (Keychain / Keystore) saklanır — düz metin değil.
export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function isBiometricEnabled(): Promise<boolean> {
  return (await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY)) === '1';
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  if (enabled) await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, '1');
  else await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
}
