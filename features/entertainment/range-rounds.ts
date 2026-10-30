import { createHash, randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { YearRange } from '../challenges/years';
import { type Challenge, challengeSchema, type HubData } from '../game/contracts';
import { imageUseAllowed, importImage } from './media-import';
import { classicScenes, sceneCategories, sourceModeImages } from './scene-images';
import { dailyPicks, sourceClues } from './schedule';
import type { SourceCategory, SourceTitle } from './source-client';

const pending = new Map<string, Promise<Challenge[]>>();
const cached = new Map<string, { expires: number; rounds: Challenge[] }>();
export const isRangeRound = (key: string) => /-range-[a-f0-9]{20}$/.test(key);

/** Extra rounds share existing gameplay/scoring rules, without replacing any daily answer. */
export const availableRangeRound = async (
  db: SupabaseClient,
  key: string
): Promise<Challenge | null> => {
  if (!isRangeRound(key)) return null;
  const result = await db
    .from('veyli_challenges')
    .select(
      'public_key,number,release_date,difficulty,attempt_limit,status,category:veyli_categories!inner(slug,name,description,accent,icon,active),mode:veyli_modes!inner(slug,name,description,icon,active,clues_per_miss),clues:veyli_clues(position,kind,media:veyli_media(approved))'
    )
    .eq('public_key', key)
    .maybeSingle();
  if (result.error || !result.data) return null;
  const row = result.data;
  const category = row.category as unknown as {
    slug: string;
    name: string;
    description: string;
    accent: string;
    icon: string;
    active: boolean;
  };
  const mode = row.mode as unknown as {
    slug: string;
    name: string;
    description: string;
    icon: string;
    active: boolean;
    clues_per_miss: number;
  };
  const clues = row.clues as unknown as {
    position: number;
    kind: string;
    media: { approved: boolean } | null;
  }[];
  if (
    !category.active ||
    !mode.active ||
    !['scheduled', 'published', 'archived'].includes(row.status) ||
    row.release_date > new Date().toISOString().slice(0, 10) ||
    !clues.some((clue) => clue.position === 1 && clue.kind === 'image' && clue.media?.approved) ||
    clues.some((clue) => clue.media && !clue.media.approved)
  )
    return null;
  return challengeSchema.parse({
    key: row.public_key,
    number: row.number,
    releaseDate: row.release_date,
    difficulty: row.difficulty,
    attemptLimit: row.attempt_limit,
    category: { ...category, available: category.active },
    mode: { ...mode, progressive: mode.clues_per_miss > 0 },
  });
};

export const rangePicks = (
  items: SourceTitle[],
  day: string,
  modes: string[],
  blocked: Set<string>
) => {
  const chosen = new Set(blocked);
  return modes.flatMap((mode) => {
    const pool = items.filter((item) => {
      const images = modeImages(item, mode);
      return (
        !chosen.has(identity(item)) &&
        images.length > 0 &&
        images.every((image) => imageUseAllowed(image))
      );
    });
    const item = dailyPicks(pool, day, 1)[0];
    if (!item) return [];
    chosen.add(identity(item));
    return [{ mode, item }];
  });
};
const identity = (item: Pick<SourceTitle, 'title' | 'year'>) =>
  `${item.title.toLowerCase()}:${item.year}`;
/** Classic spends a scene per attempt, so an answer only qualifies with the whole run. */
const modeImages = (item: SourceTitle, mode: string) =>
  mode === 'classic' ? classicScenes(item) : sourceModeImages(item, mode);

export const sourceRangeRounds = (
  db: SupabaseClient,
  date: string,
  range: YearRange,
  data: Pick<HubData, 'categories' | 'modes' | 'challenges'>,
  onlyCategory?: SourceCategory
) => {
  const key = `${date}:${range.from}:${range.to}:${onlyCategory || 'all'}:${data.challenges
    .map((round) => round.key)
    .sort()
    .join(',')}`;
  const existing = pending.get(key);
  if (existing) return existing;
  const hit = cached.get(key);
  if (hit && hit.expires > Date.now()) return Promise.resolve(hit.rounds);
  const work = createRounds(db, date, range, data, onlyCategory)
    .then((rounds) => {
      if (cached.size >= 128) cached.delete(cached.keys().next().value!);
      cached.set(key, { expires: Date.now() + 30000, rounds });
      return rounds;
    })
    .finally(() => pending.delete(key));
  pending.set(key, work);
  return work;
};

const createRounds = async (
  db: SupabaseClient,
  date: string,
  range: YearRange,
  data: Pick<HubData, 'categories' | 'modes' | 'challenges'>,
  onlyCategory?: SourceCategory
) => {
  if (date > new Date().toISOString().slice(0, 10)) return [];
  const [categories, modes, selected, extras] = await Promise.all([
    db.from('veyli_categories').select('id,slug').eq('active', true),
    db.from('veyli_modes').select('id,slug').eq('active', true),
    data.challenges.length
      ? db
          .from('veyli_challenges')
          .select('answer:veyli_items(title,release_year),category:veyli_categories(slug)')
          .in(
            'public_key',
            data.challenges.map((round) => round.key)
          )
      : Promise.resolve({ data: [], error: null }),
    db
      .from('veyli_challenges')
      .select('public_key,category_id,mode_id,answer:veyli_items!inner(title,release_year)')
      .eq('release_date', date)
      .like('public_key', `${date}-%-range-%`)
      .in('status', ['scheduled', 'published', 'archived'])
      .gte('answer.release_year', range.from)
      .lte('answer.release_year', range.to)
      .order('created_at'),
  ]);
  if (
    categories.error ||
    modes.error ||
    selected.error ||
    extras.error ||
    !categories.data ||
    !modes.data
  )
    throw new Error('Source rounds unavailable');
  const rows: {
    id: string;
    category_id: string;
    release_year: number;
    provenance: { source?: SourceTitle };
  }[] = [];
  let catalogueLoaded = false;
  const result: Challenge[] = [];
  for (const category of categories.data.filter(
    (row) => !onlyCategory || row.slug === onlyCategory
  )) {
    const publicCategory = data.categories.find(
      (row) => row.slug === category.slug && row.available
    );
    if (!publicCategory) continue;
    let desired = [
      ...(sceneCategories.includes(category.slug) ? ['classic'] : []),
      'one-frame',
      ...(category.slug === 'pop-culture' ? [] : ['poster']),
    ].filter(
      (mode) =>
        data.modes.some((row) => row.slug === mode) &&
        !data.challenges.some(
          (round) => round.category.slug === category.slug && round.mode.slug === mode
        )
    );
    if (!desired.length) continue;
    const blocked = new Set<string>();
    for (const row of selected.data || []) {
      const cat = row.category as unknown as { slug: string };
      const answer = row.answer as unknown as { title: string; release_year: number };
      if (cat?.slug === category.slug && answer)
        blocked.add(identity({ title: answer.title, year: answer.release_year }));
    }
    for (const name of [...desired]) {
      const modeId = modes.data.find((mode) => mode.slug === name)?.id;
      for (const extra of (extras.data || []).filter(
        (row) => row.category_id === category.id && row.mode_id === modeId
      )) {
        const answer = extra.answer as unknown as { title: string; release_year: number };
        const identityKey = identity({ title: answer.title, year: answer.release_year });
        if (blocked.has(identityKey)) continue;
        const ready = await availableRangeRound(db, extra.public_key);
        if (!ready) continue;
        result.push({ ...ready, yearRange: range });
        blocked.add(identityKey);
        desired = desired.filter((mode) => mode !== name);
        break;
      }
    }
    if (!desired.length) continue;
    // Existing rounds need no catalogue scan or media import.
    if (!catalogueLoaded) {
      for (let offset = 0; ; offset += 1000) {
        let query = db
          .from('veyli_items')
          .select('id,category_id,release_year,provenance')
          .eq('active', true)
          .gte('release_year', range.from)
          .lte('release_year', range.to);
        if (onlyCategory) query = query.eq('category_id', category.id);
        const page = await query.order('id').range(offset, offset + 999);
        if (page.error || !page.data) throw new Error('Source catalogue unavailable');
        rows.push(...page.data);
        if (page.data.length < 1000) break;
      }
      catalogueLoaded = true;
    }
    const candidates = rows
      .filter(
        (row) =>
          row.category_id === category.id &&
          row.provenance?.source?.facts?.length &&
          row.provenance.source.images?.length
      )
      .map((row) => ({ ...row.provenance.source!, year: row.release_year }));
    for (const { mode: name, item } of rangePicks(candidates, date, desired, blocked)) {
      const mode = modes.data.find((row) => row.slug === name);
      const answer = rows.find(
        (row) =>
          row.provenance?.source?.provider === item.provider &&
          row.provenance.source.providerId === item.providerId &&
          row.category_id === category.id
      );
      if (!mode || !answer) continue;
      const hash = createHash('sha256')
        .update(`${date}:${category.id}:${mode.id}:${answer.id}`)
        .digest('hex')
        .slice(0, 20);
      const key = `${date}-${category.slug}-${name}-range-${hash}`;
      let round = await availableRangeRound(db, key);
      if (!round) {
        const images = modeImages(item, name);
        if (!images.length || !images.every((image) => imageUseAllowed(image))) continue;
        const assets: string[] = [];
        try {
          for (const image of images) {
            const id = await importImage(db, image);
            if (id) assets.push(id);
          }
        } catch {
          continue;
        }
        if (assets.length < images.length) continue;
        const id = randomUUID();
        const inserted = await db
          .from('veyli_challenges')
          .upsert(
            {
              id,
              public_key: key,
              category_id: category.id,
              mode_id: mode.id,
              answer_id: answer.id,
              accepted_answer_ids: [],
              release_date: date,
              active_revision: false,
              status: 'draft',
              difficulty: 'medium',
              attempt_limit: 8,
              scores: [1000, 800, 650, 500, 400, 300, 200, 100],
            },
            { onConflict: 'public_key', ignoreDuplicates: true }
          )
          .select('id');
        if (inserted.error) throw new Error('Source round save failed');
        const prior = await db
          .from('veyli_challenges')
          .select('id,status,created_at')
          .eq('public_key', key)
          .single();
        const ownsDraft =
          inserted.data?.some((row) => row.id === id) ||
          (prior.data?.status === 'draft' &&
            Date.now() - Date.parse(prior.data.created_at) > 30000);
        if (ownsDraft && prior.data) {
          const roundId = prior.data.id;
          const clues = await db.from('veyli_clues').upsert(
            sourceClues(name, assets, item.facts).map((clue) => ({
              ...clue,
              challenge_id: roundId,
            })),
            { onConflict: 'challenge_id,position', ignoreDuplicates: true }
          );
          if (clues.error) throw new Error('Source clues save failed');
          const published = await db
            .from('veyli_challenges')
            .update({ status: 'scheduled' })
            .eq('id', roundId)
            .eq('status', 'draft');
          if (published.error) throw new Error('Source round publish failed');
        }
        round = await availableRangeRound(db, key);
      }
      if (round) result.push({ ...round, yearRange: range });
    }
  }
  return result;
};
