import { adminSnapshot } from '@/features/admin/server';
import { apiError, json } from '@/lib/http';
export async function GET() {
  try {
    return json(await adminSnapshot());
  } catch (error) {
    return apiError(error);
  }
}
