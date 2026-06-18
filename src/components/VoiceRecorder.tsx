import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { Icon } from './Icon';
import { colors } from '@/theme';

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

// Mikrofonla sesli not kaydeder; durdurunca dosyayı (uri/name/type) callback ile verir.
// Talep detayında "ek" olarak yüklenir → file-service/DB'de saklanır.
export function VoiceRecorder({
  onRecorded,
  disabled,
}: {
  onRecorded: (file: { uri: string; name: string; type: string }) => void;
  disabled?: boolean;
}) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  async function start() {
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('İzin gerekli', 'Ses kaydı için mikrofon iznine ihtiyaç var.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setSeconds(0);
      setRecording(true);
    } catch (e) {
      Alert.alert('Kayıt hatası', e instanceof Error ? e.message : 'Kayıt başlatılamadı.');
    }
  }

  async function stop() {
    try {
      await recorder.stop();
    } catch {
      /* ignore */
    }
    setRecording(false);
    const uri = recorder.uri;
    if (uri) onRecorded({ uri, name: `ses-notu-${Date.now()}.m4a`, type: 'audio/m4a' });
  }

  return (
    <Pressable
      onPress={recording ? stop : start}
      disabled={disabled}
      hitSlop={8}
      style={[styles.btn, recording && styles.btnRec, disabled && { opacity: 0.5 }]}
    >
      <Icon name={recording ? 'stop-circle' : 'mic-outline'} size={16} color={recording ? '#fff' : colors.danger} />
      <Text style={[styles.txt, recording && styles.txtRec]}>{recording ? `Durdur ${fmt(seconds)}` : 'Ses kaydı'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  btnRec: { backgroundColor: colors.danger, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  txt: { color: colors.danger, fontWeight: '700', fontSize: 13 },
  txtRec: { color: '#fff' },
});
