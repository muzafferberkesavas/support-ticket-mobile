import { useEffect, useRef } from 'react';
import { Accelerometer } from 'expo-sensors';

// Cihaz sallandığında tetiklenir (ivmeölçer büyüklüğü eşiği + tekrar tetiklemeyi önleyen bekleme).
// Mobile özgü "salla → hızlı talep bildir" akışı için kullanılır.
export function useShake(enabled: boolean, onShake: () => void, threshold = 1.8, cooldownMs = 2500) {
  const last = useRef(0);
  const cb = useRef(onShake);
  cb.current = onShake;

  useEffect(() => {
    if (!enabled) return;
    Accelerometer.setUpdateInterval(120);
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      const magnitude = Math.sqrt(x * x + y * y + z * z); // dinlenmede ~1g
      const now = Date.now();
      if (magnitude > threshold && now - last.current > cooldownMs) {
        last.current = now;
        cb.current();
      }
    });
    return () => sub.remove();
  }, [enabled, threshold, cooldownMs]);
}
