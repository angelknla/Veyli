import type { Completion } from '@/features/game/contracts';
export function statistics(records: Completion[], today = new Date().toISOString().slice(0, 10)) {
  const unique = [...new Map(records.map((record) => [record.key, record])).values()];
  const won = unique.filter((record) => record.status === 'won');
  const days = [...new Set(won.map((record) => record.completedAt.slice(0, 10)))].sort();
  let longestStreak = 0;
  let run = 0;
  let previous = '';
  for (const day of days) {
    run =
      previous && new Date(day).valueOf() - new Date(previous).valueOf() === 86400000 ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    previous = day;
  }
  const yesterday = new Date(new Date(today).valueOf() - 86400000).toISOString().slice(0, 10);
  let currentStreak = 0;
  if (days.at(-1) === today || days.at(-1) === yesterday) {
    let cursor = new Date(days.at(-1)!).valueOf();
    const set = new Set(days);
    while (set.has(new Date(cursor).toISOString().slice(0, 10))) {
      currentStreak++;
      cursor -= 86400000;
    }
  }
  const performance = (field: 'category' | 'mode') =>
    [...new Set(unique.map((record) => record[field]))].map((slug) => {
      const games = unique.filter((record) => record[field] === slug);
      return {
        slug,
        played: games.length,
        wins: games.filter((record) => record.status === 'won').length,
        score: games.reduce((sum, record) => sum + record.score, 0),
      };
    });
  return {
    played: unique.length,
    wins: won.length,
    winPercentage: unique.length ? Math.round((won.length / unique.length) * 100) : 0,
    currentStreak,
    longestStreak,
    averageAttempts: unique.length
      ? unique.reduce((sum, r) => sum + r.attemptsUsed, 0) / unique.length
      : 0,
    averageScore: unique.length
      ? Math.round(unique.reduce((sum, r) => sum + r.score, 0) / unique.length)
      : 0,
    perfects: won.filter((r) => r.attemptsUsed === 1).length,
    categories: performance('category'),
    modes: performance('mode'),
  };
}
export type AchievementDefinition = {
  slug: string;
  name: string;
  description: string;
  rule: { metric: string; threshold: number };
};
export function earnedAchievements(records: Completion[], definitions: AchievementDefinition[]) {
  const stats = statistics(records);
  return definitions.filter((definition) => {
    const metric = definition.rule.metric;
    const value = metric.startsWith('category:')
      ? stats.categories.find((category) => category.slug === metric.slice(9))?.wins || 0
      : { wins: stats.wins, perfects: stats.perfects, longestStreak: stats.longestStreak }[
          metric
        ] || 0;
    return value >= definition.rule.threshold;
  });
}
