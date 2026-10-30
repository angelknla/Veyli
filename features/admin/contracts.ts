import { z } from 'zod';
import { dateSchema, slugSchema } from '@/features/game/contracts';

const id = z.uuid().optional();
const text = z.string().trim().max(3000);
const source = z.url().refine((value) => value.startsWith('https://'), 'Use an HTTPS source');
const scores = z.array(z.number().int().min(0).max(100000)).min(1).max(12);
export const clueInput = z
  .object({
    position: z.number().int().min(1).max(12),
    kind: z.enum(['image', 'text', 'quote']),
    text_content: text.nullable().optional(),
    media_id: z.uuid().nullable().optional(),
    presentation: z.enum(['full', 'crop', 'blur']).default('full'),
    blur_amount: z.number().int().min(0).max(100).default(0),
    crop_percent: z.number().int().min(10).max(100).default(100),
  })
  .refine(
    (value) => (value.kind === 'text' ? Boolean(value.text_content) : Boolean(value.media_id)),
    'Each clue needs text or a licensed media asset'
  );
export const categoryInput = z.object({
  id,
  slug: slugSchema,
  name: z.string().trim().min(1).max(80),
  description: text,
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  icon: slugSchema,
  active: z.boolean(),
  position: z.number().int().min(0).max(100),
});
export const modeInput = z
  .object({
    id,
    slug: slugSchema,
    name: z.string().trim().min(1).max(80),
    description: text,
    icon: slugSchema,
    active: z.boolean(),
    initial_clues: z.number().int().min(1).max(12),
    clues_per_miss: z.number().int().min(0).max(12),
    default_attempts: z.number().int().min(1).max(12),
    default_scores: scores,
    position: z.number().int().min(0).max(100),
  })
  .refine(
    (value) => value.default_scores.length === value.default_attempts,
    'Provide one score per attempt'
  )
  .refine(
    (value) =>
      value.slug !== 'one-frame' || (value.initial_clues === 1 && value.clues_per_miss === 0),
    'One Frame uses one image; the central block shrinks after misses'
  )
  .refine(
    (value) => !['classic', 'poster'].includes(value.slug) || value.clues_per_miss > 0,
    'Classic and Poster reveal more after a miss'
  );
export const itemInput = z.object({
  id,
  slug: slugSchema,
  category_id: z.uuid(),
  title: z.string().trim().min(1).max(200),
  release_year: z.number().int().min(1800).max(2200),
  synopsis: text,
  source_url: source,
  provenance: z.record(z.string(), z.unknown()).default({ provider: 'manual' }),
  active: z.boolean(),
  aliases: z.array(z.string().trim().min(1).max(200)).max(30).default([]),
});
export const mediaInput = z
  .object({
    id,
    slug: slugSchema,
    storage_path: z
      .string()
      .regex(/^(launch|admin)\/[a-z0-9-]+\.(jpg|png|webp)$/)
      .nullable()
      .optional(),
    kind: z.enum(['image', 'quote']),
    quote_text: text.nullable().optional(),
    author: z.string().trim().min(1).max(1000),
    license: z.string().trim().min(1).max(200),
    license_url: z
      .string()
      .max(1000)
      .refine((value) => !value || /^https?:\/\//.test(value)),
    source_url: source,
    approved: z.boolean(),
  })
  .refine(
    (value) => (value.kind === 'image' ? Boolean(value.storage_path) : Boolean(value.quote_text)),
    'Upload an image or provide a licensed quotation'
  );
export const challengeInput = z
  .object({
    id,
    category_id: z.uuid(),
    mode_id: z.uuid(),
    answer_id: z.uuid(),
    accepted_answer_ids: z.array(z.uuid()).max(20).default([]),
    release_date: dateSchema,
    status: z.enum(['draft', 'scheduled', 'published', 'archived']),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    attempt_limit: z.number().int().min(1).max(12),
    scores,
    clues: z.array(clueInput).min(1).max(12),
  })
  .refine((value) => value.scores.length === value.attempt_limit, 'Provide one score per attempt')
  .refine(
    (value) => value.clues.every((clue, index) => clue.position === index + 1),
    'Clues must have consecutive reveal positions'
  );
export const adminSchemas = {
  category: categoryInput,
  mode: modeInput,
  item: itemInput,
  media: mediaInput,
  challenge: challengeInput,
};
export type Entity = keyof typeof adminSchemas;
export type AdminRecord = Record<string, unknown>;
export type AdminSnapshot = {
  categories: AdminRecord[];
  modes: AdminRecord[];
  items: AdminRecord[];
  media: AdminRecord[];
  challenges: AdminRecord[];
  analytics: {
    games: number;
    completed: number;
    wins: number;
    players: number;
    averageAttempts: number;
    byCategory: { slug: string; games: number }[];
  };
};
