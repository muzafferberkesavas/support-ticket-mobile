import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui';
import { useAuth } from '@/auth/AuthContext';
import { colors } from '@/theme';

export default function LockScreen() {
  const { unlock, logout, biometricLabel } = useAuth();
  const [failed, setFailed] = useState(false);
  const triedOnce = useRef(false);

  async function tryUnlock() {
    setFailed(false);
    const ok = await unlock();
    if (!ok) setFailed(true);
  }

  // Ekran açılır açılmaz bir kez otomatik olarak biyometri sorulur.
  useEffect(() => {
    if (triedOnce.current) return;
    triedOnce.current = true;
    void tryUnlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.logo}>🔒</Text>
        <Text style={styles.title}>Destek Mobil kilitli</Text>
        <Text style={styles.subtitle}>
          {failed
            ? `${biometricLabel} doğrulanamadı. Tekrar deneyin.`
            : `Devam etmek için ${biometricLabel} ile kimliğinizi doğrulayın.`}
        </Text>
        <Button title={`${biometricLabel} ile aç`} onPress={tryUnlock} style={{ marginTop: 24, width: '100%' }} />
        <Button
          title="Farklı hesapla giriş yap"
          variant="ghost"
          onPress={() => void logout()}
          style={{ marginTop: 8, width: '100%' }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  logo: { fontSize: 64 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 12 },
  subtitle: { fontSize: 15, color: colors.textMuted, marginTop: 8, textAlign: 'center' },
});
