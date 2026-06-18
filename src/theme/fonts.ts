import React from 'react';
import { StyleSheet, Text as RNText } from 'react-native';

// Özel fontlar sentetik kalın üretmez; bu yüzden her fontWeight'i doğru Inter ailesiyle eşleriz.
const FAMILY_BY_WEIGHT: Record<string, string> = {
  '100': 'Inter_400Regular',
  '200': 'Inter_400Regular',
  '300': 'Inter_400Regular',
  '400': 'Inter_400Regular',
  normal: 'Inter_400Regular',
  '500': 'Inter_500Medium',
  '600': 'Inter_600SemiBold',
  '700': 'Inter_700Bold',
  bold: 'Inter_700Bold',
  '800': 'Inter_800ExtraBold',
  '900': 'Inter_800ExtraBold',
};

let patched = false;

// RN Text'i bir kez yamalar: web ile aynı Inter fontunu, ağırlığa göre doğru aileyle,
// tüm metinlere uygular (her <Text>'i tek tek düzenlemeye gerek kalmadan).
export function applyInterFont(): void {
  if (patched) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Anon = RNText as any;
  const original = Anon.render;
  if (typeof original !== 'function') return; // bu RN sürümünde desteklenmiyorsa sessizce atla
  patched = true;
  Anon.render = function patchedRender(...args: unknown[]) {
    const el = original.apply(this, args);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const flat: any = StyleSheet.flatten(el.props?.style) ?? {};
    const weight = flat.fontWeight != null ? String(flat.fontWeight) : '400';
    const fontFamily = FAMILY_BY_WEIGHT[weight] ?? 'Inter_400Regular';
    return React.cloneElement(el, {
      style: [el.props?.style, { fontFamily, fontWeight: 'normal' as const }],
    });
  };
}
