import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Banner, Button, TextField } from '@/components/ui';
import { useAuth } from '@/auth/AuthContext';
import { getBiometricCapability } from '@/auth/biometrics';
import { extractErrorMessage } from '@/api/client';
import { colors } from '@/theme';

export default function LoginScreen() {
  const { login, enableBiometric } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validate(): string | null {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Geçerli bir e-posta girin.';
    if (!password) return 'Parola gerekli.';
    return null;
  }

  async function onSubmit() {
    const v = validate();
    if (v) return setError(v);
    setError(null);
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      // Giriş başarılı → cihaz destekliyorsa biyometrik girişi öner.
      const cap = await getBiometricCapability();
      if (cap.available && cap.enrolled) {
        Alert.alert(
          `${cap.label} ile giriş`,
          `Bir sonraki açılışta parola yerine ${cap.label} kullanmak ister misiniz?`,
          [
            { text: 'Şimdi değil', style: 'cancel' },
            { text: 'Etkinleştir', onPress: () => void enableBiometric() },
          ],
        );
      }
    } catch (e) {
      setError(extractErrorMessage(e, 'Giriş başarısız.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.logo}>🎫</Text>
            <Text style={styles.title}>Destek Mobil</Text>
            <Text style={styles.subtitle}>Destek taleplerinizi yönetin</Text>
          </View>

          {error ? <Banner text={error} /> : null}

          <TextField
            label="E-posta"
            value={email}
            onChangeText={setEmail}
            placeholder="ornek@eposta.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <TextField
            label="Parola"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            autoComplete="password"
          />

          <Button title="Giriş Yap" onPress={onSubmit} loading={loading} />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Hesabınız yok mu? </Text>
            <Link href="/register" style={styles.link}>
              Kayıt olun
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 24, flexGrow: 1, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 32 },
  logo: { fontSize: 56 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 8 },
  subtitle: { fontSize: 15, color: colors.textMuted, marginTop: 4 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText: { color: colors.textMuted },
  link: { color: colors.primary, fontWeight: '700' },
});
