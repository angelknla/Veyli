import { afterEach, expect, it, vi } from 'vitest';
import { createBufferCache } from './buffer-cache';

afterEach(() => vi.useRealTimers());

it('coalesces work, expires entries, respects the byte budget and retries failures', async () => {
  vi.useFakeTimers();
  const cached = createBufferCache({ maxBytes: 8, ttl: 1000 });
  const load = vi.fn(async () => Buffer.alloc(4));
  const [first, second] = await Promise.all([cached('a', load), cached('a', load)]);
  expect(second).toBe(first);
  expect(await cached('a', load)).toBe(first);
  expect(load).toHaveBeenCalledTimes(1);
  await cached('b', load);
  await cached('c', load);
  await cached('a', load);
  expect(load).toHaveBeenCalledTimes(4);
  vi.advanceTimersByTime(1001);
  await cached('a', load);
  expect(load).toHaveBeenCalledTimes(5);
  const fail = vi
    .fn()
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValue(Buffer.alloc(20));
  await expect(cached('oversized', fail)).rejects.toThrow('offline');
  await cached('oversized', fail);
  await cached('oversized', fail);
  expect(fail).toHaveBeenCalledTimes(3);
});
