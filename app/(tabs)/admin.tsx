import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { Icon, type IconName } from '@/components/Icon';
import { colors, shadow } from '@/theme';

interface AdminItem {
  title: string;
  subtitle: string;
  icon: IconName;
  href: Href;
  show: boolean;
  tone: string;
}

export default function AdminHubScreen() {
  const router = useRouter();
  const { isManager, isAdmin } = useAuth();

  const items: AdminItem[] = [
    {
      title: 'Kullanıcılar',
      subtitle: 'Personel ve müşteri hesapları, roller, departmanlar',
      icon: 'people-outline',
      href: '/admin/users',
      show: isAdmin,
      tone: colors.primary,
    },
    {
      title: 'Departmanlar',
      subtitle: 'Departmanları ve üyelerini yönetin',
      icon: 'git-network-outline',
      href: '/admin/departments',
      show: isAdmin,
      tone: colors.info,
    },
    {
      title: 'Analitik & İçgörü',
      subtitle: 'KPI’lar, grafikler, temsilci performansı, tekrar eden problemler',
      icon: 'bar-chart-outline',
      href: '/admin/analytics',
      show: isManager,
      tone: colors.success,
    },
    {
      title: 'SLA Ayarları',
      subtitle: 'Öncelik bazında yanıt ve çözüm hedefleri',
      icon: 'timer-outline',
      href: '/admin/sla',
      show: isAdmin,
      tone: colors.warn,
    },
    // Faz 4: Operasyonlar (import/export), hazır yanıtlar
  ];

  const visible = items.filter((i) => i.show);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Yönetim</Text>
      <Text style={styles.sub}>Sistem yönetimi araçları</Text>

      {visible.map((it) => (
        <Pressable
          key={it.title}
          onPress={() => router.push(it.href)}
          style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
        >
          <View style={[styles.iconWrap, { backgroundColor: it.tone + '1f' }]}>
            <Icon name={it.icon} size={22} color={it.tone} />
          </View>
          <View style={styles.flex1}>
            <Text style={styles.cardTitle}>{it.title}</Text>
            <Text style={styles.cardSub}>{it.subtitle}</Text>
          </View>
          <Icon name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 28 },
  heading: { fontSize: 20, fontWeight: '800', color: colors.text },
  sub: { fontSize: 14, color: colors.textMuted, marginTop: 2, marginBottom: 14 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
    ...shadow.sm,
  },
  cardSoon: { opacity: 0.6 },
  iconWrap: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  flex1: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  cardSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
});
