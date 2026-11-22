import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePalette } from '@/lib/theme';
import { useSpaceStore } from '@/stores/space';

import { useActiveSpace, useMySpaces } from './api';

/** Header control: shows the active space and lets the user switch. */
export function SpaceSwitcher() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const colors = usePalette();
  const { data: spaces = [] } = useMySpaces();
  const active = useActiveSpace();
  const setActive = useSpaceStore((s) => s.setActiveSpace);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('spaces.switch', { name: active?.name ?? '' })}
        onPress={() => setOpen(true)}
        className="min-h-11 flex-row items-center gap-1 px-2">
        <Text className="text-base font-semibold text-fg">{active?.name ?? '…'}</Text>
        <Ionicons name="chevron-down" size={16} color={colors.fg2} />
      </Pressable>
      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 bg-black/30" accessibilityRole="button" accessibilityLabel={t('common.cancel')} onPress={() => setOpen(false)} />
        <SafeAreaView edges={['bottom']} className="rounded-t-2xl bg-card p-4">
          <View accessibilityRole="radiogroup" className="gap-1">
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
                  className={`min-h-11 flex-row items-center justify-between rounded-xl px-3 py-3 ${selected ? 'bg-brand-light' : ''}`}>
                  <Text className="text-base text-fg">{s.name}</Text>
                  <Text className="text-sm text-muted">{t(`spaces.types.${s.type}`)}</Text>
                </Pressable>
              );
            })}
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}
