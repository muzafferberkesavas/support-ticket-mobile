import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

export interface BiometricCapability {
  available: boolean;
  // Cihazda kayıtlı bir biyometri (yüz / parmak izi) olup olmadığı.
  enrolled: boolean;
  // Kullanıcıya gösterilecek tip etiketi.
  label: string;
}

// Cihazın biyometrik donanımını ve kayıtlı biyometri olup olmadığını sorgular.
export async function getBiometricCapability(): Promise<BiometricCapability> {
  if (Platform.OS === 'web') return { available: false, enrolled: false, label: 'Biyometri' };
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  let label = 'Biyometri';
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    label = Platform.OS === 'ios' ? 'Face ID' : 'Yüz tanıma';
  } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    label = Platform.OS === 'ios' ? 'Touch ID' : 'Parmak izi';
  }
  return { available: hasHardware, enrolled, label };
}

// Biyometrik doğrulama ister. Cihaz parolasına geri düşmeye (fallback) izin verir.
export async function authenticateBiometric(reason = 'Kimliğinizi doğrulayın'): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: reason,
    cancelLabel: 'İptal',
    disableDeviceFallback: false,
  });
  return result.success;
}
