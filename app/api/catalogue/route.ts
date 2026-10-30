import { z } from 'zod';
import { slugSchema } from '@/features/game/contracts';
import { searchCatalogue } from '@/features/game/service';
import { apiError, json, rateLimit } from '@/lib/http';
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = z.string().trim().min(1).max(100).parse(url.searchParams.get('q'));
    const category = slugSchema.parse(url.searchParams.get('category'));
    await rateLimit(request, 'search');
    return json({ items: await searchCatalogue(q, category) });
  } catch (error) {
    return apiError(error);
  }
}
