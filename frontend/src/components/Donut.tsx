import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { usePalette } from '@/lib/theme';

export type Slice = { key: string; value: number; color: string };

const GAP = 0.012; // share of the ring left blank between slices

/** Ring chart of shares, with content (the total) in the middle. Slices run clockwise from 12 o'clock. */
export function Donut({ slices, size = 168, stroke = 26, label, children }: { slices: Slice[]; size?: number; stroke?: number; label: string; children?: ReactNode }) {
  const c = usePalette();
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const total = slices.reduce((s, x) => s + x.value, 0);
  const gap = slices.length > 1 ? GAP : 0;
  let start = 0;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.lineSoft} strokeWidth={stroke} fill="none" />
        {total > 0
          ? slices.map((s) => {
              const share = s.value / total;
              const len = Math.max(share - gap, 0) * circ;
              const el = (
                <Circle
                  key={s.key}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  stroke={s.color}
                  strokeWidth={stroke}
                  fill="none"
                  strokeDasharray={`${len} ${circ - len}`}
                  strokeDashoffset={-start * circ}
                />
              );
              start += share;
              return el;
            })
          : null}
      </Svg>
      {children}
    </View>
  );
}
