import { z } from 'zod';
export const yearRangeSchema = z
  .object({
    from: z.number().int().min(1800).max(new Date().getUTCFullYear()),
    to: z.number().int().min(1800).max(new Date().getUTCFullYear()),
  })
  .refine((value) => value.from <= value.to, 'Start year must be before the end year');
export type YearRange = z.infer<typeof yearRangeSchema>;
