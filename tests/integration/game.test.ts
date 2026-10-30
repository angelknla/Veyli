import { randomBytes } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { mergeLineup } from '@/features/challenges/lineup';
import type { Challenge, GameState } from '@/features/game/contracts';
import { GameEngine, normalizeTitle } from '@/features/game/engine';
import { callRpc, copyRound, createTestDatabase } from '../support/postgres';

let db: PGlite;
const day = new Date().toISOString().slice(0, 10);
const key = (mode = 'classic', category = 'movies') => `${day}-${category}-${mode}`;
const player = () => randomBytes(32).toString('hex');
const invoke = <T = unknown>(name: string, values: unknown[] = []) => callRpc<T>(db, name, values);
const engine = new GameEngine({
  play: (digest, challenge, selected) =>
    invoke('veyli_play', [digest, challenge, selected ?? null]),
});

beforeAll(async () => {
  db = await createTestDatabase();
}, 60000);
beforeEach(async () => {
  await db.exec(`truncate public.veyli_guesses,public.veyli_sessions,public.veyli_rate_windows;
    delete from public.veyli_challenges where not active_revision;`);
});
afterAll(async () => {
  await db.close();
});

it('returns stable daily puzzles without answers, media paths or internal IDs', async () => {
  const hub = await invoke<{ challenges: unknown[] }>('veyli_hub');
  expect(await invoke('veyli_hub')).toEqual(hub);
  expect(hub.challenges).toHaveLength(12);
  expect(JSON.stringify(hub)).not.toMatch(/answer_id|accepted_answer_ids|storage_path|password/);
});

it('reveals facts after misses, persists the winning score and prevents replay', async () => {
  const digest = player();
  const initial = await engine.open(digest, key());
  expect(initial).toMatchObject({ answer: null, score: 0, attemptsUsed: 0 });
  expect(initial.clues).toHaveLength(1);
  expect(JSON.stringify(initial)).not.toContain('nosferatu-1922');
  expect(initial).not.toHaveProperty('sessionId');
  const miss = await engine.guess(digest, key(), 'inception-2010');
  expect(miss).toMatchObject({ status: 'in_progress', attemptsUsed: 1, answer: null });
  expect(miss.clues[1]).toMatchObject({ kind: 'text', text: 'Year: 1922' });
  expect(miss.clues[0]).toEqual(initial.clues[0]);
  const win = await engine.guess(digest, key(), 'nosferatu-1922');
  expect(win).toMatchObject({ status: 'won', score: 800, answer: { title: 'Nosferatu' } });
  expect(win.answer?.sourceUrl).toContain('wikipedia.org');
  expect(win.completedAt).toBeTruthy();
  await expect(engine.guess(digest, key(), 'inception-2010')).rejects.toThrow('game_complete');
  expect(await engine.open(digest, key())).toEqual(win);
});

it('ends a round after eight distinct misses with a zero-score loss', async () => {
  const digest = player();
  let state: GameState | undefined;
  for (const slug of [
    'inception-2010',
    'matrix-1999',
    'interstellar-2014',
    'arrival-2016',
    'dune-2021',
    'nosferatu-2024',
    'caligari-1920',
    'metropolis-1927',
  ])
    state = await engine.guess(digest, key(), slug);
  expect(state).toMatchObject({
    status: 'lost',
    attemptsUsed: 8,
    score: 0,
    answer: { slug: 'nosferatu-1922' },
  });
});

it('serialises concurrent duplicate submissions without consuming another attempt', async () => {
  const digest = player();
  const results = await Promise.allSettled(
    [1, 2].map(() => engine.guess(digest, key(), 'inception-2010'))
  );
  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  await expect(engine.guess(digest, key(), 'inception-2010')).rejects.toThrow('duplicate_answer');
  expect((await engine.open(digest, key())).attemptsUsed).toBe(1);
  expect((await engine.open(player(), key())).attemptsUsed).toBe(0);
});

it('rejects unknown and cross-category answers before consuming a guess', async () => {
  const digest = player();
  for (const slug of ['not-a-real-title', 'portal-2007'])
    await expect(engine.guess(digest, key(), slug)).rejects.toThrow('invalid_answer');
  expect((await engine.open(digest, key())).attemptsUsed).toBe(0);
});

it('keeps Classic and One Frame answers distinct in every category and date', async () => {
  const { rows } = await db.query<{ same: boolean }>(`
    select a.answer_id=b.answer_id same from public.veyli_challenges a
    join public.veyli_modes am on am.id=a.mode_id
    join public.veyli_challenges b on b.category_id=a.category_id and b.release_date=a.release_date
    join public.veyli_modes bm on bm.id=b.mode_id
    where am.slug='classic' and bm.slug='one-frame'`);
  expect(rows).toHaveLength(15);
  expect(rows.every((pair) => !pair.same)).toBe(true);
  const digest = player();
  const initial = await engine.open(digest, key('one-frame'));
  expect((await engine.guess(digest, key('one-frame'), 'inception-2010')).clues).toEqual(
    initial.clues
  );
});

it('authorises only revealed Poster media and clears it after completion', async () => {
  const digest = player();
  await engine.open(digest, key('poster'));
  const access = (position: number) =>
    invoke('veyli_media_access', [digest, key('poster'), position]);
  expect(await access(1)).toMatchObject({ blur: 30 });
  expect(await access(2)).toBeNull();
  await engine.guess(digest, key('poster'), 'inception-2010');
  expect(await access(2)).not.toBeNull();
  await engine.guess(digest, key('poster'), 'trip-to-the-moon-1902');
  expect(await access(1)).toMatchObject({ blur: 0, cropPercent: 100 });
});

it.each([
  ['movies', 'quote', 'nosferatu-1922'],
  ['television', 'classic', 'bonanza-1959'],
  ['games', 'classic', 'supertuxkart-2006'],
])('plays %s %s through the same authoritative engine', async (category, mode, answer) => {
  const state = await engine.guess(player(), key(mode, category), answer);
  expect(state).toMatchObject({ status: 'won', score: 1000 });
});

it('hides future rounds while allowing archive play', async () => {
  const date = (offset: number) =>
    new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
  await expect(engine.open(player(), `${date(1)}-movies-classic`)).rejects.toThrow(
    'challenge_unavailable'
  );
  expect(await invoke('veyli_hub', [date(1)])).toMatchObject({ challenges: [] });
  expect((await engine.open(player(), `${date(-1)}-movies-classic`)).status).toBe('in_progress');
});

it('searches aliases and remakes and honours accepted alternative answers', async () => {
  expect(await invoke('veyli_search', ['LE voyage DANS la lune', 'movies'])).toEqual([
    expect.objectContaining({ slug: 'trip-to-the-moon-1902' }),
  ]);
  const matches = await invoke<{ year: number }[]>('veyli_search', ['NOSFERATU', 'movies']);
  expect(matches.map((item) => item.year).sort()).toEqual([1922, 2024]);
  for (const title of ['  Amélie  ', '0 A.D.', 'Spider-Man', 'The  Matrix'])
    expect(await invoke('veyli_normalize', [title])).toBe(normalizeTitle(title));
  await db.query(
    `update public.veyli_challenges set accepted_answer_ids=array(select id from public.veyli_items where slug='nosferatu-2024') where public_key=$1`,
    [key()]
  );
  expect((await engine.guess(player(), key(), 'nosferatu-2024')).status).toBe('won');
  await db.exec('truncate public.veyli_guesses,public.veyli_sessions;');
  await db.query(
    "update public.veyli_challenges set accepted_answer_ids='{}' where public_key=$1",
    [key()]
  );
});

it('freezes rules after a round is played', async () => {
  await engine.open(player(), key());
  await expect(
    db.query('update public.veyli_challenges set scores=$1 where public_key=$2', [
      [8, 7, 6, 5, 4, 3, 2, 1],
      key(),
    ])
  ).rejects.toThrow('immutable');
  await expect(
    db.query("update public.veyli_modes set initial_clues=2 where slug='classic'")
  ).rejects.toThrow('immutable');
});

it('denies browser access to private tables and game RPCs', async () => {
  try {
    await db.exec('set role anon;');
    await expect(db.query('select * from public.veyli_challenges')).rejects.toThrow(
      'permission denied'
    );
    await expect(invoke('veyli_play', [player(), key(), null])).rejects.toThrow(
      'permission denied'
    );
  } finally {
    await db.exec('reset role;');
  }
});

it('enforces atomic request quotas', async () => {
  const quotas = await Promise.all(
    [1, 2, 3, 4, 5].map(() => invoke('veyli_take_rate', ['test-window', 3, 60]))
  );
  expect(quotas.filter(Boolean)).toHaveLength(3);
});

it('returns anonymous rankings and trusted completion history', async () => {
  const digest = player();
  await engine.guess(digest, key(), 'nosferatu-1922');
  const board = await invoke('veyli_leaderboard', [day]);
  expect(board).toEqual([expect.objectContaining({ score: 1000, games: 1, wins: 1 })]);
  expect(JSON.stringify(board)).not.toContain(digest);
  expect(await invoke('veyli_completions', [digest])).toEqual([
    expect.objectContaining({ score: 1000, status: 'won', key: key() }),
  ]);
});

it('shows one preferred era round per mode while preserving daily history and scoring', async () => {
  const extra = `${key()}-range-0123456789abcdef0123`;
  const id = await copyRound(db, key(), extra, 'inception-2010');
  await db.query("update public.veyli_challenges set status='draft' where id=$1", [id]);
  await expect(engine.open(player(), extra)).rejects.toThrow('challenge_unavailable');
  await db.query("update public.veyli_challenges set status='scheduled' where id=$1", [id]);
  const digest = player();
  const round = await engine.open(digest, extra);
  expect(round.clues).toHaveLength(1);
  const hub = await invoke<{ challenges: Challenge[] }>('veyli_hub');
  expect(hub.challenges.some((round) => round.key === extra)).toBe(false);
  const lineup = mergeLineup([round.challenge], hub.challenges);
  expect(
    lineup.filter((value) => value.category.slug === 'movies' && value.mode.slug === 'classic')
  ).toEqual([round.challenge]);
  expect(lineup).toHaveLength(hub.challenges.length);
  expect(lineup.filter((value) => value.category.slug !== 'movies')).toEqual(
    hub.challenges.filter((value) => value.category.slug !== 'movies')
  );
  expect(mergeLineup([], hub.challenges)).toEqual(hub.challenges);
  await engine.guess(digest, extra, 'inception-2010');
  await engine.guess(digest, key(), 'nosferatu-1922');
  expect(await invoke('veyli_leaderboard', [day])).toEqual([
    expect.objectContaining({ score: 1000, games: 1 }),
  ]);
});

it('rejects leaked answers and inconsistent attempt counts at the public contract boundary', async () => {
  const initial = await engine.open(player(), key());
  const win = await engine.guess(player(), key(), 'nosferatu-1922');
  for (const [patch, error] of [
    [{ answer: win.answer }, 'unsafe_game_state'],
    [{ attemptsUsed: 2 }, 'invalid_game_state'],
  ] as const)
    await expect(
      new GameEngine({ play: async () => ({ ...initial, ...patch }) }).open(player(), key())
    ).rejects.toThrow(error);
});
