'use client';

const pending = new Map<string, Promise<unknown>>();

/** Coalesce simultaneous reads without retaining game state or catalogue results. */
export const fetchJson = <T = unknown>(url: string): Promise<T> => {
  const existing = pending.get(url);
  if (existing) return existing as Promise<T>;
  const promise = fetch(url, { cache: 'no-store' })
    .then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'request_failed');
      return data;
    })
    .finally(() => pending.delete(url));
  pending.set(url, promise);
  return promise;
};
