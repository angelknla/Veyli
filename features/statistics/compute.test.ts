import { expect, it } from 'vitest';
import type { Completion } from '@/features/game/contracts';
import { earnedAchievements, statistics } from './compute';

const completion = (day: string, won = true, overrides: Partial<Completion> = {}): Completion => ({
  key: `${day}-movies-classic`,
  category: 'movies',
  mode: 'classic',
  releaseDate: day,
  completedAt: `${day}T13:00:00Z`,
  status: won ? 'won' : 'lost',
  attemptsUsed: won ? 2 : 8,
  score: won ? 800 : 0,
  ...overrides,
});
it('deduplicates results and calculates ratios from confirmed rounds', () => {
  const a = completion('2026-10-28');
  const b = completion('2026-10-29', false);
  const stats = statistics([a, a, b], '2026-10-29');
  expect(stats).toMatchObject({
    played: 2,
    wins: 1,
    winPercentage: 50,
    averageAttempts: 5,
    averageScore: 400,
  });
});
it('counts streaks by completion day rather than backdating archive play', () => {
  const records = [
    completion('2026-10-27'),
    completion('2026-10-28'),
    completion('2026-10-29'),
    completion('2026-10-01', true, { completedAt: '2026-10-29T18:00:00Z' }),
  ];
  expect(statistics(records, '2026-10-30')).toMatchObject({ currentStreak: 3, longestStreak: 3 });
  expect(statistics(records, '2026-10-31').currentStreak).toBe(0);
});
it('handles empty history and data-driven achievement rules', () => {
  expect(statistics([]).winPercentage).toBe(0);
  const definition = {
    slug: 'first-win',
    name: 'First discovery',
    description: 'Win once',
    rule: { metric: 'wins', threshold: 1 },
  };
  expect(earnedAchievements([], [definition])).toEqual([]);
  expect(earnedAchievements([completion('2026-10-30')], [definition])).toEqual([definition]);
});
