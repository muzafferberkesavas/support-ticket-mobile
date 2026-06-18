import React from 'react';
import { ColorValue } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

// Tek tip vektör ikon (web'deki PrimeIcons karşılığı). Emoji yerine her yerde bu kullanılır.
export type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function Icon({
  name,
  size = 20,
  color = colors.text,
  style,
}: {
  name: IconName;
  size?: number;
  color?: ColorValue;
  style?: React.ComponentProps<typeof Ionicons>['style'];
}) {
  return <Ionicons name={name} size={size} color={color} style={style} />;
}
