// API taban adresi. Cihaz/emülatörden erişilebilir olmalı:
//  - iOS simülatör:        http://localhost:3000
//  - Android emülatör:     http://10.0.2.2:3000
//  - Fiziksel cihaz:       http://<bilgisayarın-LAN-IP'si>:3000
// `.env` dosyasına EXPO_PUBLIC_API_URL koyarak geçersiz kılabilirsiniz.
export const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:3000';

// SecureStore anahtarları.
export const TOKEN_KEY = 'support_token';
export const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
