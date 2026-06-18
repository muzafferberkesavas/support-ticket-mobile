import React from 'react';
import { StyleSheet, View } from 'react-native';

/**
 * Web dashboard'daki marka işaretinin (frontend/src/components/BrandLogo.vue) mobil karşılığı:
 * indigo→mor gradyan hissi veren yuvarlatılmış kutu içinde beyaz bir destek/sohbet balonu ve
 * markanın üç renk tonundan üç nokta. Harici bağımlılık (svg/gradient) gerektirmez; saf View ile çizilir.
 */
const BRAND = ['#6366F1', '#7C3AED', '#4338CA'] as const; // web BrandLogo gradyan durakları

export function BrandLogo({ size = 44 }: { size?: number }) {
  const tileRadius = size * 0.27;
  const bubbleW = size * 0.5;
  const bubbleH = size * 0.3;
  const dot = Math.max(2, size * 0.072);
  const tail = size * 0.13;

  return (
    <View
      style={[
        styles.tile,
        { width: size, height: size, borderRadius: tileRadius, shadowRadius: size * 0.22 },
      ]}
    >
      {/* köşeye doğru koyulaşan diyagonal derinlik katmanı (gradyan hissi) */}
      <View
        style={[
          styles.depth,
          { width: size * 1.4, height: size * 1.4, top: size * 0.35, left: size * 0.35 },
        ]}
      />

      {/* destek/sohbet balonu */}
      <View style={styles.bubbleWrap}>
        <View
          style={[
            styles.bubble,
            { width: bubbleW, height: bubbleH, borderRadius: bubbleH * 0.34, gap: dot * 0.7 },
          ]}
        >
          {BRAND.map((c) => (
            <View
              key={c}
              style={{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: c }}
            />
          ))}
        </View>
        {/* balon kuyruğu (sol-alt) */}
        <View
          style={[
            styles.tail,
            { width: tail, height: tail, left: bubbleW * 0.18, bottom: -tail * 0.35 },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: BRAND[0],
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    // iOS gölge + Android elevation: web'deki drop-shadow karşılığı.
    shadowColor: '#4f46e5',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  depth: {
    position: 'absolute',
    backgroundColor: BRAND[2],
    opacity: 0.55,
    transform: [{ rotate: '45deg' }],
  },
  bubbleWrap: {
    alignItems: 'center',
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.96)',
  },
  tail: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.96)',
    transform: [{ rotate: '45deg' }],
    borderBottomLeftRadius: 2,
  },
});
