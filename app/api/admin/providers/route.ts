import { requireAdmin } from '@/features/admin/server';
import { providerInput, searchProvider } from '@/features/entertainment/providers';
import { apiError, json } from '@/lib/http';
export async function GET(request: Request) {
  try {
    await requireAdmin();
    const params = new URL(request.url).searchParams;
    const input = providerInput.parse({
      provider: params.get('provider'),
      query: params.get('query'),
      kind: params.get('kind'),
    });
    return json({ items: await searchProvider(input) });
  } catch (error) {
    return apiError(error);
  }
}
