import { onlineManager } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { Button, ErrorNote, Muted, Screen } from '@/components/ui';
import { useActiveSpace } from '@/features/spaces/api';
import {
  type TxnInput,
  uploadReceipt,
  useCategories,
  useDeleteTransaction,
  usePaymentSources,
  useSaveTransaction,
  useTransaction,
} from '@/features/transactions/api';
import { TransactionForm, type TxnFormValues } from '@/features/transactions/TransactionForm';
import { manilaDate, manilaNoon } from '@/lib/dates';
import { fromCentavos, toCentavos } from '@/lib/money';

export default function TransactionScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const active = useActiveSpace();
  const existing = useTransaction(isNew ? undefined : id);
  const spaceId = existing.data?.space_id ?? active?.id;
  const categories = useCategories(spaceId);
  const sources = usePaymentSources();
  const save = useSaveTransaction();
  const remove = useDeleteTransaction();
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!spaceId || (!isNew && !existing.data) || !categories.data || !sources.data) {
    return (
      <Screen>
        {existing.error ? <ErrorNote message={existing.error.message} /> : <Muted>{t('common.loading')}</Muted>}
      </Screen>
    );
  }

  const txn = existing.data;
  const today = manilaDate();
  const initial: TxnFormValues = txn
    ? {
        type: txn.type,
        amount: fromCentavos(txn.amount_centavos),
        categoryId: txn.category_id,
        sourceId: txn.payment_source_id,
        date: manilaDate(new Date(txn.occurred_at)),
        note: txn.note ?? '',
      }
    : { type: 'expense', amount: '', categoryId: null, sourceId: null, date: today, note: '' };

  const pickReceipt = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (!result.canceled) setReceiptUri(result.assets[0].uri);
  };

  const submit = async (values: TxnFormValues) => {
    setError(null);
    const txnId = txn?.id ?? randomUUID();
    // keep the original time when the date didn't change; otherwise now (today) or noon Manila
    const occurredAt =
      txn && values.date === initial.date
        ? txn.occurred_at
        : values.date === today
          ? new Date().toISOString()
          : manilaNoon(values.date);
    let receiptPath = txn?.receipt_path ?? null;
    if (receiptUri) {
      setBusy(true);
      try {
        receiptPath = await uploadReceipt(spaceId, txnId, receiptUri);
      } catch (e) {
        setBusy(false);
        return setError((e as Error).message); // shortcut: receipts need a connection; not queued offline
      }
      setBusy(false);
    }
    const input: TxnInput = {
      id: txnId,
      space_id: spaceId,
      type: values.type,
      amount_centavos: toCentavos(values.amount),
      occurred_at: occurredAt,
      note: values.note.trim() || null,
      category_id: values.categoryId,
      payment_source_id: values.sourceId,
      receipt_path: receiptPath,
    };
    save.mutate(input); // optimistic: the list updates now; syncs when online
    if (!onlineManager.isOnline()) Alert.alert(t('common.offlineQueued'));
    router.back();
  };

  const confirmDelete = () =>
    Alert.alert(t('transactions.deleteConfirm'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          remove.mutate({ id: txn!.id, space_id: txn!.space_id });
          router.back();
        },
      },
    ]);

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: isNew ? t('transactions.add') : t('transactions.edit') }} />
      {error ? <ErrorNote message={error} /> : null}
      <TransactionForm
        initial={initial}
        categories={categories.data}
        sources={sources.data}
        onSubmit={submit}
        submitting={busy}
        extra={
          <>
            <Button
              label={receiptUri || txn?.receipt_path ? t('transactions.receiptAttached') : t('transactions.receipt')}
              variant="secondary"
              onPress={pickReceipt}
            />
            {txn ? <Button label={t('common.delete')} variant="danger" onPress={confirmDelete} /> : null}
          </>
        }
      />
    </Screen>
  );
}
