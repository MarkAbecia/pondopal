import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { usePalette } from '@/lib/theme';

const STROKE = 12;

/** Circular progress (0-100) with content in the middle. */
export function ProgressRing({ percent, size = 160, label, children }: { percent: number; size?: number; label: string; children?: ReactNode }) {
  const colors = usePalette();
  const r = (size - STROKE) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, percent));
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: pct }}
      style={{ width: size, height: size }}
      className="items-center justify-center self-center">
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.lineSoft} strokeWidth={STROKE} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.brand}
          strokeWidth={STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - pct / 100)}
        />
      </Svg>
      {children}
    </View>
  );
}
