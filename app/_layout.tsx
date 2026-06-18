import React, { useEffect } from 'react';
import { ActivityIndicator, Appearance, DevSettings, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { useShake } from '@/features/useShake';
import { ToastProvider } from '@/components/Toast';
import { GradientHeader } from '@/components/GradientHeader';
import { RealtimeBridge } from '@/realtime/RealtimeBridge';
import { applyInterFont } from '@/theme/fonts';
import { configureNotifications } from '@/features/push';
import { colors, isDark, scheme } from '@/theme';

// Web ile aynı Inter fontunu tüm metinlere uygula (font yüklenince devreye girer).
applyInterFont();
// Uygulama açıkken de bildirim banner'ı göster.
configureNotifications();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 15_000 } },
});

const screenOptions = {
  // Web markasıyla aynı indigo/mor gradyan başlık (geri/başlık/aksiyon ortak).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  header: (props: any) => <GradientHeader {...props} />,
  contentStyle: { backgroundColor: colors.bg },
};

// Cihaz sallandığında hızlıca "Yeni Talep" ekranını açar (mobile özgü kısayol).
function ShakeReporter() {
  const router = useRouter();
  useShake(true, () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/new');
  });
  return null;
}

// Auth durumuna göre hangi ekran grubunun erişilebilir olduğunu belirler.
function RootNavigator() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={screenOptions}>
        {/* Kimlik doğrulanmamış */}
        <Stack.Protected guard={status === 'noauth'}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ title: 'Kayıt Ol' }} />
        </Stack.Protected>

        {/* Token var ama biyometrik kilit açık değil */}
        <Stack.Protected guard={status === 'locked'}>
          <Stack.Screen name="lock" options={{ headerShown: false }} />
        </Stack.Protected>

        {/* Kimlik doğrulandı — alt sekmeler + modal/detay ekranları */}
        <Stack.Protected guard={status === 'ready'}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="scan" options={{ headerShown: false, presentation: 'modal' }} />
          <Stack.Screen name="ticket/[id]" options={{ title: 'Talep' }} />
          <Stack.Screen name="edit/[id]" options={{ title: 'Talebi Düzenle', presentation: 'modal' }} />
          <Stack.Screen name="admin/users" options={{ title: 'Kullanıcılar' }} />
          <Stack.Screen name="admin/departments" options={{ title: 'Departmanlar' }} />
          <Stack.Screen name="admin/analytics" options={{ title: 'Analitik' }} />
          <Stack.Screen name="admin/sla" options={{ title: 'SLA Ayarları' }} />
          <Stack.Screen name="admin/canned" options={{ title: 'Hazır Yanıtlar' }} />
          <Stack.Screen name="admin/operations" options={{ title: 'Operasyonlar' }} />
          <Stack.Screen name="notifications" options={{ title: 'Bildirimler' }} />
          <Stack.Screen name="features" options={{ title: 'Mobil Özellikler' }} />
        </Stack.Protected>
      </Stack>

      {/* Sallama kısayolu + gerçek zamanlı bağlantı yalnızca oturum açıkken aktif */}
      {status === 'ready' ? <ShakeReporter /> : null}
      {status === 'ready' ? <RealtimeBridge /> : null}
    </>
  );
}

export default function RootLayout() {
  // OS teması (açık/koyu) değişince paleti uygulamak için uygulamayı yeniden yükle.
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      const next = colorScheme === 'dark' ? 'dark' : 'light';
      if (next !== scheme) {
        try {
          DevSettings.reload();
        } catch {
          /* prod build'de expo-updates gerekir */
        }
      }
    });
    return () => sub.remove();
  }, []);

  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  // Inter yüklenene kadar boş zemin; ama hata olursa (asset cache sorunu) yine de
  // sistem fontuyla devam et — sonsuz boş ekranda takılma.
  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ToastProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <StatusBar style={isDark ? 'light' : 'dark'} />
              <RootNavigator />
            </AuthProvider>
          </QueryClientProvider>
        </ToastProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
