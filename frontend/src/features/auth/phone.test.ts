import { toE164PH } from './phone';

describe('toE164PH', () => {
  it.each([
    ['0917 123 4567', '+639171234567'],
    ['09171234567', '+639171234567'],
    ['9171234567', '+639171234567'],
    ['+63 917-123-4567', '+639171234567'],
    ['639171234567', '+639171234567'],
  ])('normalizes %s', (input, expected) => {
    expect(toE164PH(input)).toBe(expected);
  });

  it.each(['', '0817 123 4567', '0917123456', '+1 415 212 7777', 'abc'])('rejects %p', (input) => {
    expect(toE164PH(input)).toBeNull();
  });
});
