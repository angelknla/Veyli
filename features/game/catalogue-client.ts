'use client';

import { z } from 'zod';
import { type CatalogueItem, catalogueItemSchema } from './contracts';

const responseSchema = z.object({
  items: z.array(catalogueItemSchema),
  more: z.boolean().default(false),
});
type SearchResults = z.infer<typeof responseSchema>;
const results = new Map<string, { expires: number; data: SearchResults }>();
const keyFor = (category: string, query: string) => `${category}:${query.trim().toLowerCase()}`;

export const cachedTitles = (category: string, query: string) => {
  const hit = results.get(keyFor(category, query));
  return hit && hit.expires > Date.now() ? hit.data : null;
};
const remember = (category: string, query: string, data: SearchResults) => {
  if (results.size >= 100) results.delete(results.keys().next().value!);
  results.set(keyFor(category, query), { expires: Date.now() + 120000, data });
};

/** Show catalogue matches first, then add provider titles without blocking selection. */
export const findTitles = async (
  category: string,
  query: string,
  signal: AbortSignal,
  onResults: (items: CatalogueItem[]) => void
) => {
  const params = new URLSearchParams({ category, q: query.trim() });
  const read = async () => {
    const response = await fetch(`/api/catalogue?${params}`, { signal });
    if (!response.ok) throw new Error('search_unavailable');
    return responseSchema.parse(await response.json());
  };
  let data = cachedTitles(category, query) || (await read());
  if (signal.aborted) return;
  remember(category, query, data);
  onResults(data.items);
  if (data.more) {
    // Skip provider work while the player is still typing or has selected a match.
    await new Promise((resolve) => setTimeout(resolve, 350));
    if (signal.aborted) return;
    params.set('expand', '1');
    try {
      const expanded = await read();
      data = {
        ...expanded,
        items: [
          ...new Map([...data.items, ...expanded.items].map((item) => [item.slug, item])).values(),
        ].slice(0, 60),
      };
      if (signal.aborted) return;
      onResults(data.items);
    } catch {
      if (signal.aborted) return;
      // The initial matches remain usable when a provider is unavailable.
    }
  }
  remember(category, query, data);
};
