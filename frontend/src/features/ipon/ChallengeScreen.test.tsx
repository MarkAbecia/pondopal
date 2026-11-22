import '@/i18n';

import { fireEvent, render, screen } from '@testing-library/react-native';

import type { ChallengeProgress } from '@/features/ipon/api';

import ChallengeScreen from '@/app/challenge/[id]';

const mockAdd = jest.fn();
const mockRemove = jest.fn();
let mockRole = 'member';

const progress: ChallengeProgress = {
  challenge: {
    id: 'c1',
    space_id: 's1',
    template_key: 'week_52',
    name: '52 weeks',
    base_centavos: 5000,
    settings: {},
    start_date: '2026-11-01',
    status: 'active',
  },
  me: {
    user_id: 'u1',
    display_name: 'Juan',
    saved_centavos: 15_000,
    target_centavos: 6_890_000,
    cells_done: 1,
    total_cells: 52,
    percent: 0,
    streak: 1,
  },
  cells: [3],
  members: [],
};

jest.mock('expo-router', () => ({ Stack: { Screen: () => null }, useLocalSearchParams: () => ({ id: 'c1' }) }));
jest.mock('@/stores/session', () => ({ useSession: (pick: (s: unknown) => unknown) => pick({ session: { user: { id: 'u1' } } }) }));
jest.mock('@/features/spaces/api', () => ({
  canWrite: (role: string) => role !== 'viewer',
  useMySpaces: () => ({ data: [{ id: 's1', role: mockRole }] }),
}));
jest.mock('@/features/ipon/api', () => ({
  useChallengeProgress: () => ({ data: progress }),
  useAddEntry: () => ({ mutate: mockAdd }),
  useRemoveEntry: () => ({ mutate: mockRemove }),
}));

beforeEach(() => {
  mockAdd.mockClear();
  mockRole = 'member';
});

describe('ChallengeScreen', () => {
  it('renders 52 cells with values and ticks one on tap', async () => {
    await render(<ChallengeScreen />);
    expect(screen.getAllByRole('checkbox')).toHaveLength(52);
    const week3 = screen.getByLabelText('Week 3, ₱150.00');
    expect(week3.props.accessibilityState.checked).toBe(true);
    expect(screen.getByText('1-week streak')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Week 10, ₱500.00'));
    expect(mockAdd).toHaveBeenCalledWith({ cell_index: 10 });
  });

  it('is read-only for viewers', async () => {
    mockRole = 'viewer';
    await render(<ChallengeScreen />);
    await fireEvent.press(screen.getByLabelText('Week 10, ₱500.00'));
    expect(mockAdd).not.toHaveBeenCalled();
    expect(screen.getByText('You can view this challenge but not add entries.')).toBeTruthy();
  });
});
