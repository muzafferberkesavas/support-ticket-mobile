import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './Icon';
import { colors, shadow } from '@/theme';

// Web dashboard'ın indigo/mor marka başlığının mobil karşılığı.
// Hem Stack (geri butonlu) hem Tabs (geri butonsuz) navigatöründe `header` olarak kullanılır.
interface HeaderProps {
  navigation: { goBack: () => void };
  options: {
    title?: string;
    headerRight?: (props: { tintColor?: string }) => React.ReactNode;
  };
  back?: unknown; // Stack'te geri gidilebiliyorsa dolu; Tabs'ta undefined.
}

export function GradientHeader({ navigation, options, back }: HeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={[colors.brand1, colors.brand2, colors.brand3]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.wrap, { paddingTop: insets.top }, shadow.md]}
    >
      <View style={styles.row}>
        {back ? (
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.back}>
            <Icon name="chevron-back" size={26} color="#fff" />
          </Pressable>
        ) : null}
        <Text style={[styles.title, !back && styles.titleNoBack]} numberOfLines={1}>
          {options.title ?? ''}
        </Text>
        <View style={styles.right}>{options.headerRight?.({ tintColor: '#fff' })}</View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  row: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  back: { paddingRight: 4 },
  title: { flex: 1, color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: 0.2 },
  titleNoBack: { marginLeft: 6 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 16 },
});
