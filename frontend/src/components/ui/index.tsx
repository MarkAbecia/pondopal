/** UI primitives. Touch targets are at least 48dp; text scales with the system font size. */
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { useId, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { formatPHP } from '@/lib/money';
import { categoryColor, type Palette, tint, usePalette } from '@/lib/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

/** Figtree carries every figure that matters; columns of money line up. */
// Figtree has no peso sign: native falls back to the system face by itself, web needs the chain spelled out
const face = (name: string) => Platform.select({ web: `${name}, system-ui, sans-serif`, default: name });
export const DISPLAY = { fontFamily: face('Figtree_800ExtraBold'), fontVariant: ['tabular-nums'] } as const;
export const FIGURE = { fontFamily: face('Figtree_700Bold'), fontVariant: ['tabular-nums'] } as const;
const NUMS = { fontVariant: ['tabular-nums'] } as const;

/** Soft violet lift for cards and floating controls (a black shadow in dark mode, where it barely reads). */
export const lift = (c: Palette, strength = 1): ViewStyle => ({
  shadowColor: c.shadow,
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.07 * strength,
  shadowRadius: 18,
  elevation: 2 * strength,
});

/** Page body under a header. The header scrolls with the content; the bottom clears the tab bar or home indicator. */
export function Screen({
  children,
  header,
  scroll = true,
  overlay,
}: {
  children: ReactNode;
  header?: ReactNode;
  scroll?: boolean;
  overlay?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const body = <View className="gap-4 px-4 pt-5">{children}</View>;
  return (
    <View className="flex-1 bg-canvas">
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
          keyboardShouldPersistTaps="handled">
          {header}
          {body}
        </ScrollView>
      ) : (
        <View className="flex-1">
          {header}
          {body}
        </View>
      )}
      {header ? <StatusScrim /> : null}
      {overlay}
    </View>
  );
}

/**
 * Pinned strip under the status bar so its light icons stay legible once the header scrolls away.
 * It repeats the header's top row: the diagonal gradient reaches its midpoint at the top-right
 * corner, so a horizontal vector twice the width (x2=2) lines up with it without a seam.
 */
export function StatusScrim() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const id = `scrim${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  if (!insets.top) return null;
  return (
    <View pointerEvents="none" style={{ height: insets.top }} className="absolute left-0 right-0 top-0">
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="2" y2="0">
            <Stop offset="0" stopColor={c.gradFrom} />
            <Stop offset="1" stopColor={c.gradTo} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

/** The violet-to-indigo stage every tab opens on. Draws under the status bar. */
export function GradientHeader({ children, flat }: { children: ReactNode; flat?: boolean }) {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  // one gradient id per header: on web, ids are document-wide and a hidden tab's copy would win
  const id = `stage${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View
      style={{ paddingTop: insets.top + 8 }}
      className={`overflow-hidden px-5 ${flat ? 'pb-4' : 'pb-7'}`}>
      <Svg style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={c.gradFrom} />
            <Stop offset="1" stopColor={c.gradTo} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
      {children}
    </View>
  );
}

export function HeaderTitle({ children }: { children: ReactNode }) {
  return (
    <Text accessibilityRole="header" className="text-2xl font-bold text-white">
      {children}
    </Text>
  );
}

export function HeaderNote({ children }: { children: ReactNode }) {
  const c = usePalette();
  return (
    <Text style={{ color: c.onGradMuted }} className="text-sm">
      {children}
    </Text>
  );
}

/** A peso figure at display size, centavos set small: ₱19,474.50 */
export function BigMoney({ centavos, className = 'text-white', size = 40 }: { centavos: number; className?: string; size?: number }) {
  const [whole, frac] = formatPHP(centavos).split('.');
  return (
    <Text accessibilityLabel={formatPHP(centavos)} className={className} style={{ ...DISPLAY, fontSize: size, lineHeight: size * 1.15 }}>
      {whole}
      <Text style={{ fontSize: size * 0.5 }}>{`.${frac}`}</Text>
    </Text>
  );
}

/** Income or expense figure inside the gradient header. */
export function HeaderStat({ icon, label, centavos }: { icon: IconName; label: string; centavos: number }) {
  const c = usePalette();
  return (
    <View style={{ backgroundColor: c.glass }} className="flex-1 flex-row items-center gap-3 rounded-2xl px-3 py-3">
      <View className="h-9 w-9 items-center justify-center rounded-full bg-white">
        <Ionicons name={icon} size={18} color={c.gradTo} />
      </View>
      <View className="flex-1">
        <Text style={{ color: c.onGradMuted }} className="text-xs">
          {label}
        </Text>
        <Text numberOfLines={1} adjustsFontSizeToFit style={FIGURE} className="text-base text-white">
          {formatPHP(centavos)}
        </Text>
      </View>
    </View>
  );
}

/** Signed-out screens: the wordmark on the gradient, with what this screen does under it. */
export function AuthHeader({ subtitle }: { subtitle: string }) {
  return (
    <GradientHeader>
      <View className="gap-2 pb-6 pt-10">
        <Text accessibilityRole="header" style={{ fontFamily: DISPLAY.fontFamily }} className="text-4xl text-white">
          PondoPal
        </Text>
        <HeaderNote>{subtitle}</HeaderNote>
      </View>
    </GradientHeader>
  );
}

/** Header for pushed screens: back, title, on the same gradient. */
export function StackHeader({
  options,
  navigation,
  back,
  children,
}: {
  options: { title?: string };
  navigation: { goBack: () => void };
  back?: unknown;
  children?: ReactNode;
}) {
  return (
    <GradientHeader flat={!children}>
      <View className="min-h-12 flex-row items-center gap-2">
        {back ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => navigation.goBack()}
            hitSlop={8}
            className="active:opacity-70 -ml-2 h-12 w-12 items-center justify-center rounded-full">
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
        ) : null}
        <Text accessibilityRole="header" numberOfLines={1} className="flex-1 text-lg font-bold text-white">
          {options.title ?? ''}
        </Text>
      </View>
      {children}
    </GradientHeader>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  icon?: IconName;
};

const BUTTON = {
  primary: 'bg-brand',
  secondary: 'bg-brand-light',
  danger: 'bg-danger-soft',
};
const BUTTON_TEXT = {
  primary: 'text-white',
  secondary: 'text-brand-dark',
  danger: 'text-expense',
};

export function Button({ label, onPress, variant = 'primary', loading, disabled, accessibilityHint, icon }: ButtonProps) {
  const inactive = disabled || loading;
  const c = usePalette();
  const ink = variant === 'primary' ? '#FFFFFF' : variant === 'danger' ? c.expense : c.brandInk;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      className={`min-h-12 flex-row items-center justify-center gap-2 rounded-full px-5 py-3 active:opacity-80 ${BUTTON[variant]} ${inactive ? 'opacity-50' : ''}`}>
      {loading ? (
        <ActivityIndicator color={ink} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={ink} /> : null}
          <Text className={`text-base font-semibold ${BUTTON_TEXT[variant]}`}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

type FieldProps = TextInputProps & { label: string; error?: string };

export function TextField({ label, error, onFocus, onBlur, ...input }: FieldProps) {
  const c = usePalette();
  const [focused, setFocused] = useState(false);
  const border = error ? 'border-expense' : focused ? 'border-brand' : 'border-line-soft';
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-fg-2">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error}
        className={`min-h-12 rounded-2xl border-2 bg-card px-4 text-base text-fg ${border}`}
        placeholderTextColor={c.placeholder}
        selectionColor={c.brand}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...input}
      />
      {error ? (
        <Text accessibilityRole="alert" className="text-sm text-expense">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

type Option<T extends string> = { value: T; label: string };

/** Single-choice chips (radio group), for longer option lists. */
export function Choice<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-fg-2">{label}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} className="flex-row flex-wrap gap-2">
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityLabel={o.label}
              accessibilityState={{ selected, checked: selected }}
              onPress={() => onChange(o.value)}
              className={`active:opacity-70 min-h-12 justify-center rounded-full border-2 px-4 ${selected ? 'border-brand bg-brand' : 'border-line-soft bg-card'}`}>
              <Text className={selected ? 'font-semibold text-white' : 'text-fg-2'}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Single choice among categories, as colored tiles with their names (radio group). */
export function TilePicker<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: (Option<T> & { icon?: string | null })[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  const c = usePalette();
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-fg-2">{label}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} className="flex-row flex-wrap gap-y-3">
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityLabel={o.label}
              accessibilityState={{ selected, checked: selected }}
              onPress={() => onChange(o.value)}
              className="w-1/4 items-center gap-1.5 px-1 active:opacity-70">
              <View style={{ borderColor: selected ? c.brand : 'transparent' }} className="rounded-[20px] border-2 p-0.5">
                <CategoryTile name={o.label} icon={o.icon} size={52} variant={selected ? 'solid' : 'tint'} />
              </View>
              <Text numberOfLines={2} className={`text-center text-xs ${selected ? 'font-bold text-fg' : 'text-fg-2'}`}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Two or three mutually exclusive views, like Expense / Income. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      className="flex-row rounded-full border-2 border-brand bg-card p-1">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityLabel={o.label}
            accessibilityState={{ selected, checked: selected }}
            onPress={() => onChange(o.value)}
            className={`active:opacity-70 min-h-11 flex-1 items-center justify-center rounded-full ${selected ? 'bg-brand' : ''}`}>
            <Text className={`text-sm font-semibold ${selected ? 'text-white' : 'text-brand-dark'}`}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Card({ children, onPress, label }: { children: ReactNode; onPress?: () => void; label?: string }) {
  const c = usePalette();
  const body = (
    <View style={lift(c)} className="gap-2 rounded-3xl bg-card p-5">
      {children}
    </View>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} className="min-h-12 active:opacity-80">
      {body}
    </Pressable>
  ) : (
    body
  );
}

export function Money({ centavos, type, className = '' }: { centavos: number; type?: 'income' | 'expense'; className?: string }) {
  const color = type === 'income' ? 'text-income' : type === 'expense' ? 'text-expense' : 'text-fg';
  const sign = type === 'expense' ? '-' : type === 'income' ? '+' : '';
  return <Text style={NUMS} className={`font-semibold ${color} ${className}`}>{`${sign}${formatPHP(centavos)}`}</Text>;
}

/** Section heading on the canvas. */
export function Title({ children, flush }: { children: ReactNode; flush?: boolean }) {
  return (
    <Text accessibilityRole="header" className={`${flush ? '' : 'mt-2 '}text-lg font-bold text-fg`}>
      {children}
    </Text>
  );
}

export function Muted({ children }: { children: ReactNode }) {
  return <Text className="text-sm text-muted">{children}</Text>;
}

export function ErrorNote({ message, onRetry, retryLabel }: { message: string; onRetry?: () => void; retryLabel?: string }) {
  const c = usePalette();
  return (
    <View accessibilityRole="alert" className="gap-3 rounded-2xl bg-danger-soft p-4">
      <View className="flex-row items-start gap-2">
        <Ionicons name="alert-circle" size={20} color={c.expense} />
        <Text className="flex-1 text-expense">{message}</Text>
      </View>
      {onRetry && retryLabel ? <Button label={retryLabel} variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}

const ICONS = Ionicons.glyphMap as Record<string, number>;

/** Rounded-square icon in a category's own color: solid with a white glyph, or a soft tint. */
export function CategoryTile({
  name,
  icon,
  color,
  size = 48,
  variant = 'solid',
}: {
  name: string;
  icon?: string | null;
  color?: string;
  size?: number;
  variant?: 'solid' | 'tint';
}) {
  const c = usePalette();
  const hue = color ?? categoryColor(name);
  const glyph = (icon && icon in ICONS ? icon : 'pricetag') as IconName;
  return (
    <View
      accessible={false}
      style={{ width: size, height: size, backgroundColor: variant === 'solid' ? hue : tint(hue, c.tileTint) }}
      className="items-center justify-center rounded-2xl">
      <Ionicons name={glyph} size={size * 0.46} color={variant === 'solid' ? '#FFFFFF' : hue} />
    </View>
  );
}

/** A tappable row: tile, title and note, then whatever sits on the right. */
export function ListRow({
  tile,
  title,
  note,
  right,
  onPress,
  label,
}: {
  tile?: ReactNode;
  title: string;
  note?: string;
  right?: ReactNode;
  onPress?: () => void;
  label?: string;
}) {
  const c = usePalette();
  const body = (
    <View className="min-h-14 flex-row items-center gap-3 py-2">
      {tile}
      <View className="flex-1">
        <Text numberOfLines={1} className="text-base font-semibold text-fg">
          {title}
        </Text>
        {note ? (
          <Text numberOfLines={1} className="text-sm text-muted">
            {note}
          </Text>
        ) : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={c.muted} /> : null)}
    </View>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" accessibilityLabel={label ?? title} onPress={onPress} className="active:opacity-70">
      {body}
    </Pressable>
  ) : (
    body
  );
}

/**
 * Progress as a pill: a thick track with the amount set inside the fill (outside it while the
 * fill is too short to hold it) and the limit at the end. Over the limit, the fill turns expense.
 */
export function PillBar({ value, max, label, color, showMax = true }: { value: number; max: number; label: string; color?: string; showMax?: boolean }) {
  const c = usePalette();
  const over = value > max;
  const pct = max > 0 ? Math.min(100, Math.round((value * 100) / max)) : 100;
  const fill = over ? c.expense : (color ?? c.brand);
  // income and expense fills are bright in dark mode, so they take dark ink (onExpense)
  const onFill = over || (color && color !== c.brand) ? c.onExpense : '#FFFFFF';
  const inside = pct >= 42;
  const width = Math.max(pct, 8); // a sliver is still visible at 0%
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: pct, text: showMax ? `${formatPHP(value)} / ${formatPHP(max)}` : formatPHP(value) }}
      className="h-9 justify-center overflow-hidden rounded-full bg-line-soft">
      <View style={{ width: `${width}%`, backgroundColor: fill }} className="absolute bottom-0 left-0 top-0 rounded-full" />
      <View className="flex-row items-center justify-between px-3">
        {/* too short to hold the amount: set it just past the end of the fill */}
        <Text style={{ ...NUMS, color: inside ? onFill : c.fg, marginLeft: inside ? 0 : `${width}%` }} className="text-xs font-bold">
          {formatPHP(value)}
        </Text>
        {showMax ? (
          <Text style={{ ...NUMS, color: pct >= 88 ? onFill : c.muted }} className="text-xs font-semibold">
            {formatPHP(max)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** The screen's one primary action, floating above the tab bar. */
export function Fab({ label, onPress, icon = 'add' }: { label: string; onPress: () => void; icon?: IconName }) {
  const c = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={lift(c, 3)}
      className="absolute bottom-6 right-5 h-16 w-16 items-center justify-center rounded-full bg-brand active:opacity-85">
      <Ionicons name={icon} size={30} color="white" />
    </Pressable>
  );
}

/** Quiet placeholder for an empty list: icon, one line, optional action. */
export function Empty({ icon, message, action }: { icon: IconName; message: string; action?: ReactNode }) {
  const c = usePalette();
  return (
    <View className="items-center gap-3 rounded-3xl border-2 border-dashed border-line-soft px-6 py-8">
      <View className="h-12 w-12 items-center justify-center rounded-2xl bg-brand-light">
        <Ionicons name={icon} size={22} color={c.brandInk} />
      </View>
      <Text className="text-center text-sm text-muted">{message}</Text>
      {action}
    </View>
  );
}
