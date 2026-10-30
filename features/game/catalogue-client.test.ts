import { afterEach, expect, it, vi } from 'vitest';
import { cachedTitles, findTitles } from './catalogue-client';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
const item = (title: string) => ({
  slug: title.toLowerCase().replaceAll(' ', '-'),
  title,
  year: 2010,
  category: 'movies',
});

it('shows matches before provider completion and reuses recent results without another request', async () => {
  vi.useFakeTimers();
  const local = [item('Matrix')];
  const expanded = [...local, item('Matrix sequel')];
  let release = (_response: Response) => {};
  const provider = new Promise<Response>((resolve) => {
    release = resolve;
  });
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ items: local, more: true }))
    .mockReturnValueOnce(provider);
  vi.stubGlobal('fetch', fetch);
  const onResults = vi.fn();
  const signal = new AbortController().signal;
  const work = findTitles('movies', 'matrix', signal, onResults);
  await vi.advanceTimersByTimeAsync(0);
  expect(onResults).toHaveBeenCalledWith(local);
  expect(fetch).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(350);
  expect(fetch.mock.calls[1][0]).toContain('expand=1');
  expect(onResults).toHaveBeenCalledTimes(1);
  release(Response.json({ items: expanded, more: false }));
  await work;
  expect(onResults).toHaveBeenLastCalledWith(expanded);
  await findTitles('movies', ' MATRIX ', signal, onResults);
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(cachedTitles('games', 'matrix')).toBeNull();
  await vi.advanceTimersByTimeAsync(120001);
  expect(cachedTitles('movies', 'matrix')).toBeNull();
});

it('skips provider work after selection and retains usable matches when expansion fails', async () => {
  vi.useFakeTimers();
  const local = [item('Portal')];
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ items: local, more: true }))
    .mockRejectedValueOnce(new Error('Provider unavailable'));
  vi.stubGlobal('fetch', fetch);
  const selected = new AbortController();
  const onResults = vi.fn();
  const first = findTitles('movies', 'portal', selected.signal, onResults);
  await vi.advanceTimersByTimeAsync(0);
  selected.abort();
  await vi.advanceTimersByTimeAsync(350);
  await first;
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(onResults).toHaveBeenCalledWith(local);
  const retry = findTitles('movies', 'portal', new AbortController().signal, onResults);
  await vi.advanceTimersByTimeAsync(350);
  await retry;
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(onResults).toHaveBeenLastCalledWith(local);
  expect(cachedTitles('movies', 'portal')?.items).toEqual(local);
});
