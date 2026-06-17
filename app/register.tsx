import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Banner, Button, TextField } from '@/components/ui';
import { useAuth } from '@/auth/AuthContext';
import { extractErrorMessage } from '@/api/client';
import { colors } from '@/theme';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Backend kuralları: e-posta geçerli, parola en az 6, ad (verilirse) 2-120.
  function validate(): string | null {
    if (fullName.trim() && fullName.trim().length < 2) return 'Ad en az 2 karakter olmalı.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Geçerli bir e-posta girin.';
    if (password.length < 6) return 'Parola en az 6 karakter olmalı.';
    return null;
  }

  async function onSubmit() {
    const v = validate();
    if (v) return setError(v);
    setError(null);
    setLoading(true);
    try {
      await register(email.trim().toLowerCase(), password, fullName.trim() || undefined);
    } catch (e) {
      setError(extractErrorMessage(e, 'Kayıt başarısız.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {error ? <Banner text={error} /> : null}
          <TextField label="Ad Soyad (isteğe bağlı)" value={fullName} onChangeText={setFullName} placeholder="Ad Soyad" />
          <TextField
            label="E-posta"
            value={email}
            onChangeText={setEmail}
            placeholder="ornek@eposta.com"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextField
            label="Parola"
            value={password}
            onChangeText={setPassword}
            placeholder="En az 6 karakter"
            secureTextEntry
          />
          <Button title="Hesap Oluştur" onPress={onSubmit} loading={loading} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 24, flexGrow: 1, justifyContent: 'center' },
});
