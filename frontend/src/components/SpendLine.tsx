import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Line, Path, Stop } from 'react-native-svg';

/** White line of daily spending on the gradient, from the 1st up to `upTo` (today). */
export function SpendLine({ days, upTo, label, height = 96 }: { days: number[]; upTo: number; label: string; height?: number }) {
  const [width, setWidth] = useState(0);
  const shown = days.slice(0, Math.max(upTo, 1));
  const peak = Math.max(...shown, 1);
  const pad = 4; // keeps the stroke inside the box at the peak
  const x = (i: number) => (days.length > 1 ? (i * width) / (days.length - 1) : 0);
  const y = (v: number) => pad + (height - 2 * pad) * (1 - v / peak);
  const line = shown.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(shown.length - 1).toFixed(1)},${height} L0,${height} Z`;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="spendArea" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.3} />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Line x1={0} y1={height - 0.5} x2={width} y2={height - 0.5} stroke="#FFFFFF" strokeOpacity={0.3} strokeWidth={1} />
          <Path d={area} fill="url(#spendArea)" />
          <Path d={line} stroke="#FFFFFF" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" fill="none" />
        </Svg>
      ) : null}
    </View>
  );
}
