import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const STROKE = 12;

/** Circular progress (0-100) with content in the middle. */
export function ProgressRing({ percent, size = 160, label, children }: { percent: number; size?: number; label: string; children?: ReactNode }) {
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
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#E5E7EB" strokeWidth={STROKE} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#0F9D58"
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
