import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { GradientHeader } from '@/components/GradientHeader';
import { Icon } from '@/components/Icon';
import { useAuth } from '@/auth/AuthContext';
import { useSocketConnected } from '@/realtime/socket';
import { colors } from '@/theme';

// Liste sekmesinin başlık sağ aksiyonları: canlı bağlantı göstergesi + QR tara.
function HomeHeaderRight() {
  const router = useRouter();
  const connected = useSocketConnected();
  return (
    <View style={styles.headerRight}>
      <View style={[styles.dot, { backgroundColor: connected ? '#86efac' : 'rgba(255,255,255,0.45)' }]} />
      <Pressable onPress={() => router.push('/scan')} hitSlop={10}>
        <Icon name="qr-code-outline" size={23} color="#fff" />
      </Pressable>
    </View>
  );
}

export default function TabsLayout() {
  const { isStaff, isManager } = useAuth();
  return (
    <Tabs
      screenOptions={{
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        header: (props: any) => <GradientHeader {...props} />,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: { paddingVertical: 4 },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Pano',
          tabBarLabel: 'Pano',
          tabBarIcon: ({ color, size }) => <Icon name="speedometer-outline" size={size} color={color} />,
          // Yalnızca personel görür; son kullanıcıda sekme gizlenir.
          href: isStaff ? '/dashboard' : null,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: isStaff ? 'Talepler' : 'Taleplerim',
          tabBarLabel: 'Talepler',
          tabBarIcon: ({ color, size }) => <Icon name="reader-outline" size={size} color={color} />,
          headerRight: () => <HomeHeaderRight />,
        }}
      />
      <Tabs.Screen
        name="new"
        options={{
          title: 'Yeni Talep',
          tabBarLabel: 'Yeni',
          tabBarIcon: ({ color, size }) => <Icon name="add-circle" size={size + 4} color={color} />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Yönetim',
          tabBarLabel: 'Yönetim',
          tabBarIcon: ({ color, size }) => <Icon name="settings-outline" size={size} color={color} />,
          // Yalnızca yönetici/takım lideri görür.
          href: isManager ? '/admin' : null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarLabel: 'Profil',
          tabBarIcon: ({ color, size }) => <Icon name="person-circle-outline" size={size + 2} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  tabBar: {
    height: 62,
    paddingBottom: 8,
    paddingTop: 6,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  tabLabel: { fontSize: 11, fontWeight: '600' },
});
