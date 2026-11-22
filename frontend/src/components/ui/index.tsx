/** UI primitives. Touch targets are at least 44pt; text scales with the system font size. */
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, type TextInputProps, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatPHP } from '@/lib/money';
import { usePalette } from '@/lib/theme';

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['bottom', 'left', 'right']}>
      {scroll ? (
        <ScrollView contentContainerClassName="gap-4 p-4" keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View className="flex-1 gap-4 p-4">{children}</View>
      )}
    </SafeAreaView>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
};

const BUTTON = {
  primary: 'bg-brand',
  secondary: 'border border-brand bg-card',
  danger: 'bg-expense',
};

export function Button({ label, onPress, variant = 'primary', loading, disabled, accessibilityHint }: ButtonProps) {
  const inactive = disabled || loading;
  const colors = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      className={`min-h-11 items-center justify-center rounded-xl px-4 py-3 ${BUTTON[variant]} ${inactive ? 'opacity-50' : ''}`}>
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? colors.brandInk : 'white'} />
      ) : (
        <Text className={`text-base font-semibold ${variant === 'secondary' ? 'text-brand' : 'text-white'}`}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

type FieldProps = TextInputProps & { label: string; error?: string };

export function TextField({ label, error, ...input }: FieldProps) {
  const colors = usePalette();
  return (
    <View className="gap-1">
      <Text className="text-sm font-medium text-fg-2">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error}
        className={`min-h-11 rounded-xl border px-3 text-base text-fg ${error ? 'border-expense' : 'border-line'}`}
        placeholderTextColor={colors.placeholder}
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

/** Single-choice chips (radio group). */
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
    <View className="gap-1">
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
              className={`min-h-11 justify-center rounded-full border px-4 ${selected ? 'border-brand bg-brand-light' : 'border-line'}`}>
              <Text className={selected ? 'font-semibold text-brand-dark' : 'text-fg-2'}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Card({ children, onPress, label }: { children: ReactNode; onPress?: () => void; label?: string }) {
  const body = <View className="gap-1 rounded-2xl border border-line-soft bg-card p-4">{children}</View>;
  return onPress ? (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} className="min-h-11">
      {body}
    </Pressable>
  ) : (
    body
  );
}

export function Money({ centavos, type, className = '' }: { centavos: number; type?: 'income' | 'expense'; className?: string }) {
  const color = type === 'income' ? 'text-income' : type === 'expense' ? 'text-expense' : 'text-fg';
  const sign = type === 'expense' ? '-' : type === 'income' ? '+' : '';
  return <Text className={`font-semibold ${color} ${className}`}>{`${sign}${formatPHP(centavos)}`}</Text>;
}

export function Title({ children }: { children: ReactNode }) {
  return (
    <Text accessibilityRole="header" className="text-xl font-bold text-fg">
      {children}
    </Text>
  );
}

export function Muted({ children }: { children: ReactNode }) {
  return <Text className="text-sm text-muted">{children}</Text>;
}

export function ErrorNote({ message, onRetry, retryLabel }: { message: string; onRetry?: () => void; retryLabel?: string }) {
  return (
    <View accessibilityRole="alert" className="gap-2 rounded-xl bg-danger-soft p-3">
      <Text className="text-expense">{message}</Text>
      {onRetry && retryLabel ? <Button label={retryLabel} variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}
