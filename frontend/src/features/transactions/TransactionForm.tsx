import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { Button, Choice, TextField } from '@/components/ui';
import { isIsoDate } from '@/lib/dates';
import { parsePesos } from '@/lib/money';
import type { TxnType } from '@/types/models';

export function makeSchema(t: (key: string) => string) {
  return z.object({
    type: z.enum(['income', 'expense']),
    amount: z.string().refine((v) => (parsePesos(v) ?? 0) > 0, t('transactions.invalidAmount')),
    categoryId: z.string().nullable(),
    sourceId: z.string().nullable(),
    date: z.string().refine(isIsoDate, t('transactions.invalidDate')),
    note: z.string().max(500),
  });
}

export type TxnFormValues = z.infer<ReturnType<typeof makeSchema>>;

type Props = {
  initial: TxnFormValues;
  categories: { id: string; name: string; type: TxnType }[];
  sources: { id: string; name: string }[];
  onSubmit: (values: TxnFormValues) => void | Promise<void>;
  submitting?: boolean;
  extra?: ReactNode; // receipt picker, delete button
};

export function TransactionForm({ initial, categories, sources, onSubmit, submitting, extra }: Props) {
  const { t } = useTranslation();
  const { control, handleSubmit, setValue } = useForm<TxnFormValues>({
    resolver: zodResolver(makeSchema(t)),
    defaultValues: initial,
  });
  const type = useWatch({ control, name: 'type' });

  return (
    <>
      <Controller
        control={control}
        name="type"
        render={({ field }) => (
          <Choice
            label={t('transactions.add')}
            options={[
              { value: 'expense' as const, label: t('transactions.expense') },
              { value: 'income' as const, label: t('transactions.income') },
            ]}
            value={field.value}
            onChange={(v) => {
              field.onChange(v);
              setValue('categoryId', null); // categories differ per type
            }}
          />
        )}
      />
      <Controller
        control={control}
        name="amount"
        render={({ field, fieldState }) => (
          <TextField
            label={t('transactions.amount')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />
        )}
      />
      <Controller
        control={control}
        name="categoryId"
        render={({ field }) => (
          <Choice
            label={t('transactions.category')}
            options={categories.filter((c) => c.type === type).map((c) => ({ value: c.id, label: c.name }))}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="sourceId"
        render={({ field }) => (
          <Choice
            label={t('transactions.source')}
            options={sources.map((s) => ({ value: s.id, label: s.name }))}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="date"
        render={({ field, fieldState }) => (
          <TextField
            label={t('transactions.date')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />
        )}
      />
      <Controller
        control={control}
        name="note"
        render={({ field, fieldState }) => (
          <TextField
            label={t('transactions.note')}
            value={field.value}
            onChangeText={field.onChange}
            error={fieldState.error?.message}
            maxLength={500}
            multiline
          />
        )}
      />
      {extra}
      <Button label={t('common.save')} onPress={handleSubmit(onSubmit)} loading={submitting} />
    </>
  );
}
