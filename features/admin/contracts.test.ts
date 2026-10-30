import { expect, it } from 'vitest';
import { modeInput } from './contracts';

const base = {
  slug: 'one-frame',
  name: 'One Frame',
  description: 'One image.',
  icon: 'scan',
  active: true,
  initial_clues: 1,
  clues_per_miss: 0,
  default_attempts: 3,
  default_scores: [1000, 600, 200],
  position: 1,
};
it('preserves fixed-image and progressive-mode rules in editorial configuration', () => {
  expect(modeInput.safeParse(base).success).toBe(true);
  expect(modeInput.safeParse({ ...base, clues_per_miss: 1 }).success).toBe(false);
  expect(modeInput.safeParse({ ...base, slug: 'classic' }).success).toBe(false);
  expect(modeInput.safeParse({ ...base, slug: 'classic', clues_per_miss: 1 }).success).toBe(true);
});
