import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Appearance, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
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
import { ToastProvider } from '@/components/Toast';
import { GradientHeader } from '@/components/GradientHeader';
import { RealtimeBridge } from '@/realtime/RealtimeBridge';
import { OfflineProvider } from '@/offline/OfflineContext';
import { applyInterFont } from '@/theme/fonts';
import { getThemePref } from '@/theme/pref';
import { colors, isDark } from '@/theme';

// Web ile aynı Inter fontunu tüm metinlere uygula (font yüklenince devreye girer).
applyInterFont();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 15_000 } },
});

const screenOptions = {
  // Web markasıyla aynı indigo/mor gradyan başlık (geri/başlık/aksiyon ortak).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  header: (props: any) => <GradientHeader {...props} />,
  contentStyle: { backgroundColor: colors.bg },
};

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

      {/* Gerçek zamanlı bağlantı yalnızca oturum açıkken aktif */}
      {status === 'ready' ? <RealtimeBridge /> : null}
    </>
  );
}

export default function RootLayout() {
  const [themeReady, setThemeReady] = useState(false);

  // Cold-start: kayıtlı tema tercihini Appearance override'ı olarak kur (in-session
  // okumalar için). NOT: cold-start'ta StyleSheet'ler sistem temasıyla değerlenir;
  // override'ı tam uygulamak için reload GEREKMEZ (reload döngüsü riskinden kaçınılır).
  // Kullanıcı Profil → Görünüm'den seçtiğinde applyThemePref reload ile uygular.
  useEffect(() => {
    let active = true;
    void (async () => {
      const pref = await getThemePref();
      if (pref !== 'system') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Appearance.setColorScheme(pref as any);
      }
      if (active) setThemeReady(true);
    })();
    return () => {
      active = false;
    };
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
  if ((!fontsLoaded && !fontError) || !themeReady) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ToastProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <OfflineProvider>
                <StatusBar style={isDark ? 'light' : 'dark'} />
                <RootNavigator />
              </OfflineProvider>
            </AuthProvider>
          </QueryClientProvider>
        </ToastProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
