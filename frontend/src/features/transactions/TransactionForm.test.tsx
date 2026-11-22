import '@/i18n';

import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { TransactionForm, type TxnFormValues } from './TransactionForm';

const initial: TxnFormValues = {
  type: 'expense',
  amount: '',
  categoryId: null,
  sourceId: null,
  date: '2026-11-22',
  note: '',
};
const categories = [
  { id: 'food', name: 'Food', type: 'expense' as const },
  { id: 'salary', name: 'Salary', type: 'income' as const },
];
const sources = [{ id: 'gcash', name: 'GCash' }];

async function setup() {
  const onSubmit = jest.fn();
  await render(<TransactionForm initial={initial} categories={categories} sources={sources} onSubmit={onSubmit} />);
  return onSubmit;
}

describe('TransactionForm', () => {
  it('rejects a missing amount', async () => {
    const onSubmit = await setup();
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Enter an amount like 150 or 1,234.50')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects an impossible date', async () => {
    const onSubmit = await setup();
    await fireEvent.changeText(screen.getByLabelText('Amount (₱)'), '50');
    await fireEvent.changeText(screen.getByLabelText('Date (YYYY-MM-DD)'), '2026-02-30');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Use YYYY-MM-DD')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a valid expense', async () => {
    const onSubmit = await setup();
    await fireEvent.changeText(screen.getByLabelText('Amount (₱)'), '1,234.50');
    await fireEvent.press(screen.getByRole('radio', { name: 'Food' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'GCash' }));
    await fireEvent.changeText(screen.getByLabelText('Note'), 'Jollibee');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toEqual({
      type: 'expense',
      amount: '1,234.50',
      categoryId: 'food',
      sourceId: 'gcash',
      date: '2026-11-22',
      note: 'Jollibee',
    });
  });

  it('shows categories for the chosen type and clears the old pick', async () => {
    const onSubmit = await setup();
    await fireEvent.press(screen.getByRole('radio', { name: 'Food' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Income' }));
    expect(screen.queryByRole('radio', { name: 'Food' })).toBeNull();
    expect(screen.getByRole('radio', { name: 'Salary' })).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Amount (₱)'), '25000');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ type: 'income', categoryId: null });
  });
});
