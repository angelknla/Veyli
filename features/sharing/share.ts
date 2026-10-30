import type { GameState } from '@/features/game/contracts';
export const shareText = (state: GameState, url: string, spoiler = false) => {
  const blocks = state.guesses.map((guess) => (guess.correct ? '🟩' : '⬛')).join('');
  return [
    `Veyli #${state.challenge.number} · ${state.challenge.category.name} · ${state.challenge.mode.name}`,
    `${blocks} ${state.status === 'won' ? state.attemptsUsed : 'X'}/${state.challenge.attemptLimit}`,
    `${state.score} points`,
    ...(spoiler && state.answer ? [`${state.answer.title} (${state.answer.year})`] : []),
    url,
  ].join('\n');
};
