import { adminSnapshot } from '@/features/admin/server';
import { apiError, json } from '@/lib/http';
export const GET = async () => {
  try {
    return json(await adminSnapshot());
  } catch (error) {
    return apiError(error);
  }
};
