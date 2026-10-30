import type { GameState } from './contracts';
export const modeDescriptions: Record<string, string> = {
  classic: 'One frame. Year. Genre. Director. A new fact after every miss.',
  'one-frame': 'One shot. The block shrinks with each miss.',
};
export function frameCover(attemptsUsed: number, attemptLimit: number, complete = false) {
  return complete ? 0 : Math.round(80 * Math.max(0, 1 - attemptsUsed / attemptLimit));
}
export function posterBlur(attemptsUsed: number, attemptLimit = 8, complete = false) {
  if (complete) return 0;
  const steps = [30, 20, 13, 8, 5, 3, 1, 0];
  const progress = Math.min(1, Math.max(0, attemptsUsed / Math.max(1, attemptLimit - 1)));
  return steps[Math.round(progress * (steps.length - 1))];
}
export function musicCrop(attemptsUsed: number, attemptLimit: number, complete = false) {
  if (complete) return 100;
  const progress = Math.min(1, Math.max(0, attemptsUsed / Math.max(1, attemptLimit - 1)));
  return Math.round(10 * 10 ** progress);
}

/** Progress comes from the authorised game state, never from image URL parameters. */
export function clueImageOptions(
  progress: {
    mode: string;
    category: string;
    attemptsUsed: number;
    attemptLimit: number;
    complete?: boolean;
  },
  defaults: { blur: number; cropPercent: number }
) {
  const { mode, category, attemptsUsed, attemptLimit, complete = false } = progress;
  return {
    blur: mode === 'poster' ? posterBlur(attemptsUsed, attemptLimit, complete) : defaults.blur,
    cropPercent:
      mode === 'classic' && category === 'music'
        ? musicCrop(attemptsUsed, attemptLimit, complete)
        : defaults.cropPercent,
    coverPercent: mode === 'one-frame' ? frameCover(attemptsUsed, attemptLimit, complete) : 0,
  };
}
/** Browser image URLs change with progress; the server independently authorises every reveal. */
export function presentState(state: GameState): GameState {
  const mode = state.challenge.mode.slug;
  const musicZoom = mode === 'classic' && state.challenge.category.slug === 'music';
  return {
    ...state,
    challenge: {
      ...state.challenge,
      mode: {
        ...state.challenge.mode,
        description: musicZoom
          ? 'A close-up. Zoom out and unlock a fact after every miss.'
          : modeDescriptions[mode] || state.challenge.mode.description,
      },
    },
    clues: state.clues.map((clue) =>
      clue.imageUrl && (mode === 'one-frame' || musicZoom || state.status !== 'in_progress')
        ? {
            ...clue,
            imageUrl: `${clue.imageUrl}?step=${state.attemptsUsed}&complete=${state.status !== 'in_progress' ? 1 : 0}&rules=5`,
          }
        : clue
    ),
  };
}
