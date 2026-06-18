import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { colors, shadow } from '@/theme';
import { Icon, type IconName } from './Icon';

// ── Buton ───────────────────────────────────────────────────────────
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  style?: ViewStyle;
}) {
  const isDisabled = disabled || loading;
  const palette: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: colors.primary, fg: colors.white },
    secondary: { bg: colors.surface, fg: colors.text, border: colors.border },
    danger: { bg: colors.danger, fg: colors.white },
    ghost: { bg: 'transparent', fg: colors.primary },
  };
  const p = palette[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: p.bg, borderColor: p.border ?? p.bg, opacity: isDisabled ? 0.5 : pressed ? 0.9 : 1 },
        variant === 'primary' && !isDisabled && shadow.sm,
        variant === 'secondary' && styles.btnBordered,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <View style={styles.btnRow}>
          {icon ? <Icon name={icon} size={18} color={p.fg} /> : null}
          <Text style={[styles.btnText, { color: p.fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

// ── Metin alanı ─────────────────────────────────────────────────────
export function TextField({
  label,
  error,
  style,
  containerStyle,
  leftIcon,
  ...props
}: TextInputProps & { label?: string; error?: string; containerStyle?: ViewStyle; leftIcon?: IconName }) {
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;
  return (
    <View style={[styles.fieldWrap, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputBox,
          { borderColor },
          focused && styles.inputBoxFocused,
          props.multiline && styles.inputMultiline,
        ]}
      >
        {leftIcon ? <Icon name={leftIcon} size={18} color={focused ? colors.primary : colors.textMuted} /> : null}
        <TextInput
          placeholderTextColor={colors.textMuted}
          style={[styles.input, props.multiline && styles.inputMultilineText, style]}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

// ── Rozet (badge) ───────────────────────────────────────────────────
export function Badge({ label, fg, bg }: { label: string; fg: string; bg: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

// ── Kart ────────────────────────────────────────────────────────────
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// ── Satır içi uyarı ─────────────────────────────────────────────────
export function Banner({ text, tone = 'danger' }: { text: string; tone?: 'danger' | 'info' }) {
  const bg = tone === 'danger' ? colors.dangerBg : colors.infoBg;
  const fg = tone === 'danger' ? colors.danger : colors.info;
  return (
    <View style={[styles.banner, { backgroundColor: bg }]}>
      <Icon name={tone === 'danger' ? 'alert-circle' : 'information-circle'} size={18} color={fg} />
      <Text style={[styles.bannerText, { color: fg }]}>{text}</Text>
    </View>
  );
}

export function EmptyState({ title, subtitle, icon = 'file-tray-outline' }: { title: string; subtitle?: string; icon?: IconName }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={30} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySub}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderWidth: 0,
  },
  btnBordered: { borderWidth: 1 },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnText: { fontSize: 16, fontWeight: '700' },
  fieldWrap: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 7 },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  inputBoxFocused: { backgroundColor: '#fff' },
  inputMultiline: { alignItems: 'flex-start' },
  input: { flex: 1, paddingVertical: 13, fontSize: 16, color: colors.text },
  inputMultilineText: { minHeight: 110, textAlignVertical: 'top', paddingTop: 12 },
  errorText: { color: colors.danger, fontSize: 12, marginTop: 5 },
  badge: { paddingHorizontal: 11, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    ...shadow.sm,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 13,
    borderRadius: 12,
    marginBottom: 14,
  },
  bannerText: { flex: 1, fontSize: 14, fontWeight: '500' },
  empty: { alignItems: 'center', paddingVertical: 54, paddingHorizontal: 24 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'center' },
  emptySub: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 20 },
});
