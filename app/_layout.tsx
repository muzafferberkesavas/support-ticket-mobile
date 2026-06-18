import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { useShake } from '@/features/useShake';
import { colors } from '@/theme';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 15_000 } },
});

const headerStyle = {
  headerStyle: { backgroundColor: colors.surface },
  headerTitleStyle: { color: colors.text },
  headerTintColor: colors.primary,
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
      <Stack screenOptions={headerStyle}>
        {/* Kimlik doğrulanmamış */}
        <Stack.Protected guard={status === 'noauth'}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ title: 'Kayıt Ol' }} />
        </Stack.Protected>

        {/* Token var ama biyometrik kilit açık değil */}
        <Stack.Protected guard={status === 'locked'}>
          <Stack.Screen name="lock" options={{ headerShown: false }} />
        </Stack.Protected>

        {/* Kimlik doğrulandı */}
        <Stack.Protected guard={status === 'ready'}>
          <Stack.Screen name="index" options={{ title: 'Taleplerim' }} />
          <Stack.Screen name="new" options={{ title: 'Yeni Talep', presentation: 'modal' }} />
          <Stack.Screen name="scan" options={{ title: 'Varlık QR Tara', presentation: 'modal' }} />
          <Stack.Screen name="profile" options={{ title: 'Profil' }} />
          <Stack.Screen name="ticket/[id]" options={{ title: 'Talep' }} />
          <Stack.Screen name="edit/[id]" options={{ title: 'Talebi Düzenle', presentation: 'modal' }} />
        </Stack.Protected>
      </Stack>

      {/* Sallama kısayolu yalnızca oturum açıkken aktif */}
      {status === 'ready' ? <ShakeReporter /> : null}
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <StatusBar style="dark" />
            <RootNavigator />
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
