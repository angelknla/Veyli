import { z } from 'zod';
export const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(120);
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
  }, 'Invalid date');
export const categorySchema = z.object({
  slug: slugSchema,
  name: z.string(),
  description: z.string(),
  accent: z.string(),
  icon: z.string(),
  available: z.boolean(),
});
export const modeSchema = z.object({
  slug: slugSchema,
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  progressive: z.boolean(),
});
export const challengeSchema = z.object({
  key: slugSchema,
  previewUrl: z.string().optional(),
  yearRange: z.object({ from: z.number().int(), to: z.number().int() }).optional(),
  number: z.number().int(),
  releaseDate: dateSchema,
  difficulty: z.enum(['easy', 'medium', 'hard']),
  category: categorySchema,
  mode: modeSchema,
  attemptLimit: z.number().int().min(1).max(12),
});
export const catalogueItemSchema = z.object({
  slug: slugSchema,
  title: z.string(),
  year: z.number().int(),
  category: z.string(),
});
export const clueSchema = z.object({
  position: z.number().int().min(1),
  kind: z.enum(['image', 'text', 'quote']),
  text: z.string().nullable(),
  presentation: z.enum(['full', 'crop', 'blur']),
  imageUrl: z.string().nullable(),
});
export const answerSchema = z.object({
  slug: slugSchema,
  title: z.string(),
  year: z.number().int(),
  synopsis: z.string(),
  sourceUrl: z.string().url(),
  credits: z.array(
    z.object({
      author: z.string(),
      license: z.string(),
      licenseUrl: z.string(),
      sourceUrl: z.string().url(),
    })
  ),
});
export const guessSchema = z.object({
  slug: slugSchema,
  title: z.string(),
  year: z.number().int(),
  correct: z.boolean(),
});
export const gameStateSchema = z.object({
  challenge: challengeSchema,
  attemptsUsed: z.number().int().min(0),
  status: z.enum(['in_progress', 'won', 'lost']),
  score: z.number().int().min(0),
  clues: z.array(clueSchema),
  guesses: z.array(guessSchema),
  answer: answerSchema.nullable(),
  completedAt: z.string().nullable(),
});
export const completionSchema = z.object({
  key: slugSchema,
  category: z.string(),
  mode: z.string(),
  releaseDate: dateSchema,
  completedAt: z.string(),
  status: z.enum(['won', 'lost']),
  attemptsUsed: z.number().int(),
  score: z.number().int(),
});
export type Category = z.infer<typeof categorySchema>;
export type GameMode = z.infer<typeof modeSchema>;
export type Challenge = z.infer<typeof challengeSchema>;
export type CatalogueItem = z.infer<typeof catalogueItemSchema>;
export type GameState = z.infer<typeof gameStateSchema>;
export type Completion = z.infer<typeof completionSchema>;
export type HubData = {
  date?: string;
  categories: Category[];
  modes: GameMode[];
  challenges: Challenge[];
  available: boolean;
};
