import type { z } from 'zod';
import { classicSceneClues } from '@/features/game/presentation';
import type { AdminSnapshot, challengeInput } from './contracts';
/** Presentation constraints live at this editorial boundary; the engine stays generic. */
export const validatePublication = (
  payload: z.infer<typeof challengeInput>,
  snapshot: AdminSnapshot
) => {
  const mode = snapshot.modes.find((value) => value.id === payload.mode_id);
  if (!mode) throw new Error('invalid_mode');
  if (payload.status === 'draft') return;
  const rules: Record<string, () => boolean> = {
    // Every Classic clue is a scene; the ones past the first also carry that miss's fact.
    classic: () =>
      payload.clues.length <= classicSceneClues &&
      payload.clues.every((clue) => clue.kind === 'image'),
    'one-frame': () => payload.clues.length === 1 && payload.clues[0].kind === 'image',
    poster: () => payload.clues.every((clue) => clue.kind === 'image'),
    quote: () => payload.clues[0].kind === 'quote',
  };
  if (rules[String(mode.slug)] && !rules[String(mode.slug)]())
    throw new Error('invalid_mode_clues');
  if (payload.clues.length < Number(mode.initial_clues)) throw new Error('insufficient_clues');
  for (const clue of payload.clues) {
    if (clue.kind === 'text') continue;
    const media = snapshot.media.find((value) => value.id === clue.media_id);
    if (!media || media.kind !== clue.kind || !media.approved)
      throw new Error('approved_clues_required');
  }
};
