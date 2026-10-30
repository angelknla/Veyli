import type { GameState } from './contracts';
/** Classic spends one clue per attempt, each carrying a scene and the fact beside it. */
export const classicSceneClues = 8;
export const modeDescriptions: Record<string, string> = {
  classic: 'One scene from the story. A new scene and a new fact after every miss.',
  'one-frame': 'One shot. The block shrinks with each miss.',
};
export const frameCover = (attemptsUsed: number, attemptLimit: number, complete = false) => {
  return complete ? 0 : Math.round(80 * Math.max(0, 1 - attemptsUsed / attemptLimit));
};
export const posterBlur = (attemptsUsed: number, attemptLimit = 8, complete = false) => {
  if (complete) return 0;
  const steps = [30, 20, 13, 8, 5, 3, 1, 0];
  const progress = Math.min(1, Math.max(0, attemptsUsed / Math.max(1, attemptLimit - 1)));
  return steps[Math.round(progress * (steps.length - 1))];
};

/** Progress comes from the authorised game state, never from image URL parameters. */
export const clueImageOptions = (
  progress: {
    mode: string;
    attemptsUsed: number;
    attemptLimit: number;
    complete?: boolean;
  },
  defaults: { blur: number; cropPercent: number }
) => {
  const { mode, attemptsUsed, attemptLimit, complete = false } = progress;
  return {
    blur: mode === 'poster' ? posterBlur(attemptsUsed, attemptLimit, complete) : defaults.blur,
    cropPercent: defaults.cropPercent,
    coverPercent: mode === 'one-frame' ? frameCover(attemptsUsed, attemptLimit, complete) : 0,
  };
};
/** Browser image URLs change with progress; the server independently authorises every reveal. */
export const presentState = (state: GameState): GameState => {
  const mode = state.challenge.mode.slug;
  return {
    ...state,
    challenge: {
      ...state.challenge,
      mode: {
        ...state.challenge.mode,
        description: modeDescriptions[mode] || state.challenge.mode.description,
      },
    },
    clues: state.clues.map((clue) =>
      clue.imageUrl && (mode === 'one-frame' || state.status !== 'in_progress')
        ? {
            ...clue,
            imageUrl: `${clue.imageUrl}?step=${state.attemptsUsed}&complete=${state.status !== 'in_progress' ? 1 : 0}&rules=5`,
          }
        : clue
    ),
  };
};
