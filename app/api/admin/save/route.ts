import { z } from 'zod';
import { adminSchemas, challengeInput } from '@/features/admin/contracts';
import { adminSnapshot, protectReferencedContent, requireAdmin } from '@/features/admin/server';
import { validatePublication } from '@/features/admin/validate';
import { invalidateCatalogue } from '@/features/entertainment/catalogue-search';
import { invalidateHub } from '@/features/game/service';
import { rpc, ServiceError } from '@/lib/database';
import { apiError, json, sameOrigin } from '@/lib/http';
export const POST = async (request: Request) => {
  try {
    await requireAdmin();
    sameOrigin(request);
    const text = await request.text();
    if (text.length > 100000) return json({ error: 'request_too_large' }, 413);
    const body = z
      .object({
        entity: z.enum(['category', 'mode', 'item', 'media', 'challenge']),
        payload: z.unknown(),
      })
      .parse(JSON.parse(text));
    const payload = adminSchemas[body.entity].parse(body.payload);
    if (body.entity === 'challenge') {
      try {
        validatePublication(challengeInput.parse(payload), await adminSnapshot());
      } catch {
        throw new ServiceError('invalid_mode_clues', 400);
      }
    }
    await protectReferencedContent(body.entity, payload);
    const result = await rpc('veyli_admin_save', { entity: body.entity, payload });
    invalidateHub();
    invalidateCatalogue();
    return json(result);
  } catch (error) {
    if (error instanceof z.ZodError)
      return json(
        {
          error: 'validation_error',
          issues: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
        400
      );
    return apiError(error);
  }
};
