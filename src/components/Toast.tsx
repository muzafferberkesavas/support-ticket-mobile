import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from './Icon';
import { colors } from '@/theme';

// Uygulama içi anlık bildirim (toast) — gerçek zamanlı olaylarda üstte belirir,
// dokununca isteğe bağlı bir aksiyona (ör. ilgili talebe git) gider.
interface ToastItem {
  text: string;
  onPress?: () => void;
}

const ToastCtx = createContext<(t: ToastItem) => void>(() => {});
export const useToast = (): ((t: ToastItem) => void) => useContext(ToastCtx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setToast(null));
  }, [opacity]);

  const show = useCallback(
    (t: ToastItem) => {
      setToast(t);
      opacity.setValue(0);
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(dismiss, 3800);
    },
    [opacity, dismiss],
  );

  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast ? (
        <SafeAreaView pointerEvents="box-none" style={styles.wrap} edges={['top']}>
          <Animated.View style={{ opacity, width: '100%' }}>
            <Pressable
              style={styles.toast}
              onPress={() => {
                const cb = toast.onPress;
                dismiss();
                cb?.();
              }}
            >
              <Icon name="notifications" size={18} color={colors.white} />
              <Text style={styles.text} numberOfLines={2}>
                {toast.text}
              </Text>
            </Pressable>
          </Animated.View>
        </SafeAreaView>
      ) : null}
    </ToastCtx.Provider>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', paddingHorizontal: 12 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.text,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  icon: { fontSize: 16 },
  text: { flex: 1, color: colors.white, fontSize: 14, fontWeight: '600' },
});
