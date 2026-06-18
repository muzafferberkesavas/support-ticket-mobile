import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { GradientHeader } from '@/components/GradientHeader';
import { Icon } from '@/components/Icon';
import { useAuth } from '@/auth/AuthContext';
import { getUnreadCount } from '@/api/notifications';
import { useSocketConnected } from '@/realtime/socket';
import { colors } from '@/theme';

// Liste sekmesinin başlık sağ aksiyonları: bağlantı göstergesi + bildirim zili.
function HomeHeaderRight() {
  const router = useRouter();
  const connected = useSocketConnected();
  const unread = useQuery({ queryKey: ['unread-count'], queryFn: getUnreadCount, refetchInterval: 30_000 });
  const count = unread.data ?? 0;
  return (
    <View style={styles.headerRight}>
      <View style={[styles.dot, { backgroundColor: connected ? '#86efac' : 'rgba(255,255,255,0.45)' }]} />
      <Pressable onPress={() => router.push('/notifications')} hitSlop={10}>
        <Icon name="notifications-outline" size={23} color="#fff" />
        {count > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
          </View>
        ) : null}
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
  badge: {
    position: 'absolute',
    top: -6,
    right: -7,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  tabBar: {
    height: 62,
    paddingBottom: 8,
    paddingTop: 6,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  tabLabel: { fontSize: 11, fontWeight: '600' },
});
