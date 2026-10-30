import { z } from 'zod';
import { type GameState, gameStateSchema, slugSchema } from './contracts';
export interface GameRepository {
  play(playerDigest: string, challengeKey: string, selectedSlug?: string): Promise<unknown>;
}
export class GameError extends Error {
  constructor(public code: string) {
    super(code);
  }
}
/** The database owns each transition; this React-independent service validates its public contract. */
export class GameEngine {
  constructor(private repository: GameRepository) {}
  async open(playerDigest: string, challengeKey: string): Promise<GameState> {
    return this.transition(playerDigest, challengeKey);
  }
  async guess(
    playerDigest: string,
    challengeKey: string,
    selectedSlug: string
  ): Promise<GameState> {
    return this.transition(playerDigest, challengeKey, slugSchema.parse(selectedSlug));
  }
  private async transition(playerDigest: string, challengeKey: string, selectedSlug?: string) {
    z.string()
      .regex(/^[a-f0-9]{64}$/)
      .parse(playerDigest);
    slugSchema.parse(challengeKey);
    const result = await this.repository.play(playerDigest, challengeKey, selectedSlug);
    const failure = z.object({ error: z.string() }).safeParse(result);
    if (failure.success) throw new GameError(failure.data.error);
    const state = gameStateSchema.parse(result);
    if (state.status === 'in_progress' && (state.answer !== null || state.score !== 0))
      throw new GameError('unsafe_game_state');
    if (
      state.attemptsUsed !== state.guesses.length ||
      state.attemptsUsed > state.challenge.attemptLimit
    )
      throw new GameError('invalid_game_state');
    return state;
  }
}
export function normalizeTitle(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}
