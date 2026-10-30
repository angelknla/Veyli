import type { Challenge } from '@/features/game/contracts';

const slot = (challenge: Challenge) =>
  `${challenge.releaseDate}:${challenge.category.slug}:${challenge.mode.slug}`;

/** Prefer source rounds in the lineup while keeping original rounds available for history. */
export function mergeLineup(preferred: Challenge[], daily: Challenge[]): Challenge[] {
  const occupied = new Set(preferred.map(slot));
  return [...preferred, ...daily.filter((challenge) => !occupied.has(slot(challenge)))];
}
