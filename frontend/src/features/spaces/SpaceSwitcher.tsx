import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryTile, type IconName } from '@/components/ui';
import { usePalette } from '@/lib/theme';
import { useSpaceStore } from '@/stores/space';
import type { SpaceType } from '@/types/models';

import { useActiveSpace, useMySpaces } from './api';

export const SPACE_ICON: Record<SpaceType, IconName> = {
  personal: 'person',
  partner: 'heart',
  family: 'home',
  group: 'people',
};

/** Header control on the gradient: shows the active space and opens a sheet to switch. */
export function SpaceSwitcher() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const c = usePalette();
  const { data: spaces = [] } = useMySpaces();
  const active = useActiveSpace();
  const setActive = useSpaceStore((s) => s.setActiveSpace);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('spaces.switch', { name: active?.name ?? '' })}
        onPress={() => setOpen(true)}
        style={{ backgroundColor: c.glass }}
        className="min-h-12 flex-row items-center gap-2 self-start rounded-full pl-2 pr-4 active:opacity-80">
        <View className="h-8 w-8 items-center justify-center rounded-full bg-white">
          <Ionicons name={active ? SPACE_ICON[active.type] : 'ellipsis-horizontal'} size={16} color={c.gradTo} />
        </View>
        <Text numberOfLines={1} className="max-w-[220px] text-base font-semibold text-white">
          {active?.name ?? '…'}
        </Text>
        <Ionicons name="chevron-down" size={16} color="white" />
      </Pressable>
      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 bg-black/40" accessibilityRole="button" accessibilityLabel={t('common.cancel')} onPress={() => setOpen(false)} />
        <SafeAreaView edges={['bottom']} className="rounded-t-3xl bg-card">
          <View className="mb-3 mt-3 h-1.5 w-10 self-center rounded-full bg-line" />
          <View accessibilityRole="radiogroup" className="gap-1 px-4 pb-4">
            {spaces.map((s) => {
              const selected = s.id === active?.id;
              return (
                <Pressable
                  key={s.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected, checked: selected }}
                  accessibilityLabel={`${s.name}, ${t(`spaces.types.${s.type}`)}`}
                  onPress={() => {
                    setActive(s.id);
                    setOpen(false);
                  }}
                  className={`active:opacity-70 min-h-14 flex-row items-center gap-3 rounded-2xl px-3 py-2 ${selected ? 'bg-brand-light' : ''}`}>
                  <CategoryTile name={s.type} icon={SPACE_ICON[s.type]} color={c.brand} size={40} variant={selected ? 'solid' : 'tint'} />
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-fg">{s.name}</Text>
                    <Text className="text-sm text-muted">{t(`spaces.types.${s.type}`)}</Text>
                  </View>
                  {selected ? <Ionicons name="checkmark-circle" size={22} color={c.brand} /> : null}
                </Pressable>
              );
            })}
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}
