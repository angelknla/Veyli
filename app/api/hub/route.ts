import { yearRangeSchema } from '@/features/challenges/years';
import { dateSchema } from '@/features/game/contracts';
import { hub } from '@/features/game/service';
import { apiError, json, rateLimit } from '@/lib/http';
export const maxDuration = 300;
export const GET = async (request: Request) => {
  try {
    const query = new URL(request.url).searchParams;
    const date = query.has('date') ? dateSchema.parse(query.get('date')) : undefined;
    const range =
      query.has('from') || query.has('to')
        ? yearRangeSchema.parse({ from: Number(query.get('from')), to: Number(query.get('to')) })
        : undefined;
    await rateLimit(request, 'hub');
    const data = await hub(date, range);
    return json(data, data.available ? 200 : 503);
  } catch (error) {
    return apiError(error);
  }
};
