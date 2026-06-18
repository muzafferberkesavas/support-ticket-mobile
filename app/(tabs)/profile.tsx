import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Banner, Button, Card, TextField } from '@/components/ui';
import { Icon, type IconName } from '@/components/Icon';
import { useAuth } from '@/auth/AuthContext';
import { changePassword, updateProfile } from '@/api/auth';
import { getBiometricCapability } from '@/auth/biometrics';
import { applyThemePref, getThemePref, type ThemePref } from '@/theme/pref';
import { extractErrorMessage } from '@/api/client';
import { colors } from '@/theme';

const THEME_OPTS: { value: ThemePref; label: string; icon: IconName }[] = [
  { value: 'system', label: 'Sistem', icon: 'phone-portrait-outline' },
  { value: 'light', label: 'Açık', icon: 'sunny-outline' },
  { value: 'dark', label: 'Koyu', icon: 'moon-outline' },
];

const ROLE_LABELS: Record<string, string> = {
  user: 'Kullanıcı',
  agent: 'Temsilci',
  team_lead: 'Takım Lideri',
  admin: 'Yönetici',
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, setUser, logout, biometricEnabled, enableBiometric, disableBiometric, biometricLabel } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwMsg, setPwMsg] = useState<string | null>(null);

  const [themePref, setThemePref] = useState<ThemePref>('system');
  useEffect(() => {
    void getThemePref().then(setThemePref);
  }, []);

  const profileMut = useMutation({
    mutationFn: () => updateProfile(fullName.trim() || null),
    onSuccess: (u) => {
      setUser(u);
      setProfileMsg('Profil güncellendi.');
    },
    onError: (e) => setProfileMsg(extractErrorMessage(e)),
  });

  const pwMut = useMutation({
    mutationFn: () => changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setPwMsg('Parola değiştirildi.');
    },
    onError: (e) => setPwMsg(extractErrorMessage(e)),
  });

  async function onToggleBiometric(value: boolean) {
    if (value) {
      const cap = await getBiometricCapability();
      if (!cap.available || !cap.enrolled) {
        Alert.alert('Kullanılamıyor', 'Cihazınızda kayıtlı bir biyometri (yüz / parmak izi) bulunamadı.');
        return;
      }
      const ok = await enableBiometric();
      if (!ok) Alert.alert('Doğrulanamadı', 'Biyometrik giriş etkinleştirilemedi.');
    } else {
      await disableBiometric();
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Hesap */}
        <Card style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Icon name="person-circle-outline" size={19} color={colors.primary} />
            <Text style={styles.cardTitle}>Hesap</Text>
          </View>
          <Text style={styles.fieldLabel}>E-posta</Text>
          <Text style={styles.readonly}>{user?.email}</Text>
          <Text style={styles.fieldLabel}>Rol</Text>
          <Text style={styles.readonly}>{ROLE_LABELS[user?.role ?? 'user'] ?? user?.role}</Text>
        </Card>

        {/* Mobil özellikler vitrini */}
        <Pressable onPress={() => router.push('/features')}>
          <Card style={styles.card}>
            <View style={styles.featuresRow}>
              <Icon name="sparkles" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>Mobil Özellikler</Text>
                <Text style={styles.switchHint}>Eklenen 9 cihaz yeteneği + push testi</Text>
              </View>
              <Icon name="chevron-forward" size={18} color={colors.textMuted} />
            </View>
          </Card>
        </Pressable>

        {/* Profil düzenleme */}
        <Card style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Icon name="create-outline" size={19} color={colors.primary} />
            <Text style={styles.cardTitle}>Profil</Text>
          </View>
          {profileMsg ? <Banner text={profileMsg} tone="info" /> : null}
          <TextField label="Ad Soyad" value={fullName} onChangeText={setFullName} placeholder="Ad Soyad" />
          <Button title="Kaydet" icon="save-outline" onPress={() => profileMut.mutate()} loading={profileMut.isPending} />
        </Card>

        {/* Görünüm (tema) */}
        <Card style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Icon name="color-palette-outline" size={19} color={colors.primary} />
            <Text style={styles.cardTitle}>Görünüm</Text>
          </View>
          <View style={styles.themeRow}>
            {THEME_OPTS.map((o) => {
              const active = themePref === o.value;
              return (
                <Pressable
                  key={o.value}
                  onPress={() => void applyThemePref(o.value)}
                  style={[styles.themeChip, active && styles.themeChipActive]}
                >
                  <Icon name={o.icon} size={18} color={active ? colors.white : colors.textMuted} />
                  <Text style={[styles.themeChipText, active && styles.themeChipTextActive]}>{o.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.switchHint}>Tema değişince uygulama kısaca yeniden yüklenir.</Text>
        </Card>

        {/* Güvenlik */}
        <Card style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Icon name="shield-checkmark-outline" size={19} color={colors.primary} />
            <Text style={styles.cardTitle}>Güvenlik</Text>
          </View>
          <View style={styles.switchRow}>
            <Icon name="finger-print" size={22} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>{biometricLabel} ile giriş</Text>
              <Text style={styles.switchHint}>Açılışta parola yerine {biometricLabel} ile kilidi açın.</Text>
            </View>
            <Switch value={biometricEnabled} onValueChange={onToggleBiometric} />
          </View>
        </Card>

        {/* Parola değiştirme */}
        <Card style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Icon name="key-outline" size={19} color={colors.primary} />
            <Text style={styles.cardTitle}>Parola Değiştir</Text>
          </View>
          {pwMsg ? <Banner text={pwMsg} tone="info" /> : null}
          <TextField
            label="Mevcut parola"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            placeholder="••••••••"
          />
          <TextField
            label="Yeni parola"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            placeholder="En az 6 karakter"
          />
          <Button
            title="Parolayı Güncelle"
            icon="key-outline"
            variant="secondary"
            onPress={() => {
              if (newPassword.length < 6) return setPwMsg('Yeni parola en az 6 karakter olmalı.');
              setPwMsg(null);
              pwMut.mutate();
            }}
            loading={pwMut.isPending}
          />
        </Card>

        <Button title="Çıkış Yap" icon="log-out-outline" variant="danger" onPress={() => void logout()} style={{ marginTop: 4 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 16, gap: 14 },
  card: { gap: 4 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginTop: 8 },
  readonly: { fontSize: 15, color: colors.text, marginTop: 2 },
  featuresRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  themeRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  themeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  themeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  themeChipText: { fontSize: 13, fontWeight: '700', color: colors.text },
  themeChipTextActive: { color: colors.white },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  switchHint: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
});
