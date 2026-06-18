import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Button } from '@/components/ui';
import { colors } from '@/theme';

// Varlık/QR etiketi tarayıp yeni talebi ön-dolduran kamera ekranı (mobile özgü özellik).
// Düz metin kod veya JSON ({ asset, category, subject }) destekler.
export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  function onBarcode({ data }: { data: string }) {
    if (scanned) return;
    setScanned(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    let asset = data.trim();
    let subject = '';
    let category = '';
    try {
      const obj = JSON.parse(data);
      asset = String(obj.asset ?? obj.id ?? obj.code ?? asset).trim();
      subject = String(obj.subject ?? '').trim();
      category = String(obj.category ?? '').trim();
    } catch {
      // düz metin kod — olduğu gibi varlık kodu kabul edilir
    }

    const tag = asset ? `varlik:${asset}`.toLowerCase().replace(/\s+/g, '-').slice(0, 30) : '';
    if (!subject) subject = asset ? `${asset} ile ilgili sorun` : 'QR ile bildirilen sorun';

    router.replace({
      pathname: '/new',
      params: {
        prefillSubject: subject.slice(0, 150),
        prefillCategory: category.slice(0, 80),
        prefillTag: tag,
      },
    });
  }

  if (!permission) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.info}>İzin durumu kontrol ediliyor…</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.title}>Kamera izni gerekli</Text>
        <Text style={styles.info}>Varlık QR etiketini taramak için kameraya erişim verin.</Text>
        <Button title="Kamera İzni Ver" onPress={() => void requestPermission()} style={{ marginBottom: 10 }} />
        <Button title="Vazgeç" variant="ghost" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.flex}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'pdf417', 'datamatrix'],
        }}
        onBarcodeScanned={scanned ? undefined : onBarcode}
      />
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.frame} />
        <Text style={styles.hint}>Varlık / QR etiketini çerçeveye getirin</Text>
      </View>
      <SafeAreaView style={styles.bottom} edges={['bottom']}>
        <Button title={scanned ? 'Okundu ✓' : 'Vazgeç'} variant="secondary" onPress={() => router.back()} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: colors.bg },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 },
  info: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginBottom: 20 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  frame: {
    width: 230,
    height: 230,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: 24,
    backgroundColor: 'transparent',
  },
  hint: { color: '#fff', fontSize: 14, fontWeight: '600', marginTop: 20, textShadowColor: '#000', textShadowRadius: 6 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16 },
});
