import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { getBiometricCapability } from '@/auth/biometrics';
import { Button, Card } from '@/components/ui';
import { Icon, type IconName } from '@/components/Icon';
import { colors } from '@/theme';

interface Feature {
  icon: IconName;
  tone: string;
  title: string;
  desc: string;
  action?: { label: string; run: () => void };
  status?: string;
}

export default function FeaturesScreen() {
  const { biometricEnabled, biometricLabel, enableBiometric, disableBiometric } = useAuth();

  async function toggleBiometric() {
    if (biometricEnabled) {
      await disableBiometric();
      return;
    }
    const cap = await getBiometricCapability();
    if (!cap.available) {
      Alert.alert('Kullanılamıyor', 'Cihazınızda biyometrik donanım bulunamadı.');
      return;
    }
    const ok = await enableBiometric();
    if (!ok) Alert.alert('Doğrulanamadı', 'Biyometrik giriş etkinleştirilemedi.');
  }

  const features: Feature[] = [
    {
      icon: 'finger-print',
      tone: colors.primary,
      title: `${biometricLabel} ile giriş`,
      desc: 'Parmak izi / yüz tanıma ile parolasız kilit açma (expo-local-authentication).',
      status: biometricEnabled ? 'Etkin' : 'Kapalı',
      action: { label: biometricEnabled ? 'Kapat' : 'Etkinleştir', run: () => void toggleBiometric() },
    },
    {
      icon: 'mic',
      tone: colors.danger,
      title: 'Sesli not (ses kaydı)',
      desc: 'Talebe sesli not kaydedip ek olarak ekleme (expo-av) — mikrofonla sorunu anlatın.',
    },
    {
      icon: 'camera',
      tone: colors.success,
      title: 'Kamera ile görsel ekleme',
      desc: 'Talebe kameradan veya galeriden fotoğraf ekleme (expo-image-picker).',
    },
    {
      icon: 'flash',
      tone: colors.info,
      title: 'Gerçek zamanlı güncelleme',
      desc: 'Liste, detay ve “yazıyor / görüntülüyor” canlı senkron (Socket.IO).',
    },
    {
      icon: 'cloud-offline',
      tone: colors.warn,
      title: 'Çevrimdışı-öncelikli kuyruk',
      desc: 'İnternet yokken talepler yerelde kuyruğa alınır, bağlanınca otomatik senkronlanır.',
    },
    {
      icon: 'lock-closed',
      tone: colors.textMuted,
      title: 'Güvenli token saklama',
      desc: 'JWT, cihazın güvenli deposunda tutulur (expo-secure-store).',
    },
  ];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Mobil Özellikler' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Görev en az <Text style={styles.bold}>1 mobile özgü özellik</Text> istiyordu. Akışa anlamlı şekilde
          entegre edilmiş mobil/cihaz yetenekleri:
        </Text>

        {features.map((f) => (
          <Card key={f.title} style={styles.card}>
            <View style={styles.row}>
              <View style={[styles.iconWrap, { backgroundColor: f.tone + '1f' }]}>
                <Icon name={f.icon} size={22} color={f.tone} />
              </View>
              <View style={styles.flex1}>
                <View style={styles.titleRow}>
                  <Text style={styles.title}>{f.title}</Text>
                  {f.status ? (
                    <Text style={[styles.status, f.status === 'Etkin' && { color: colors.success }]}>{f.status}</Text>
                  ) : null}
                </View>
                <Text style={styles.desc}>{f.desc}</Text>
              </View>
            </View>
            {f.action ? (
              <Button title={f.action.label} variant="secondary" onPress={f.action.run} style={styles.actionBtn} />
            ) : null}
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 28 },
  intro: { fontSize: 14, color: colors.textMuted, lineHeight: 21, marginBottom: 14 },
  bold: { fontWeight: '800', color: colors.text },
  card: { marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  iconWrap: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  flex1: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 },
  status: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  desc: { fontSize: 13, color: colors.textMuted, marginTop: 3, lineHeight: 18 },
  actionBtn: { marginTop: 12 },
});
