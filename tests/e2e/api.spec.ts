import { apiPath, date, expect, gameState, image, origin, submit, test } from './helpers';

test('hides future content and enforces concurrency, scoring and origin checks', async ({
  request,
}) => {
  const initial = await gameState(request, apiPath());
  expect(initial.answer).toBeNull();
  expect(initial.clues).toHaveLength(1);
  expect(initial).not.toHaveProperty('sessionId');
  for (const path of [
    `${apiPath()}/media/2`,
    `/api/challenges/${date(1)}-movies-classic`,
    `/api/challenges/${date(1)}-movies-classic/preview`,
  ])
    expect((await request.get(path)).status()).toBe(404);
  const responses = await Promise.all(
    [1, 2].map(() => submit(request, apiPath(), 'inception-2010'))
  );
  expect(responses.map((response) => response.status()).sort()).toEqual([200, 409]);
  expect((await gameState(request, apiPath())).attemptsUsed).toBe(1);
  for (const [headers, data, status] of [
    [{ Origin: origin }, { slug: 'nosferatu-1922', score: 999999 }, 400],
    [{ Origin: 'https://unrelated.example' }, { slug: 'nosferatu-1922' }, 403],
  ] as const)
    expect((await request.post(`${apiPath()}/guess`, { headers, data })).status()).toBe(status);
});

for (const [mode, category, wrong, answer, forged] of [
  ['one-frame', 'movies', 'inception-2010', 'trip-to-the-moon-1902', 'step=8&cover=0'],
  ['poster', 'movies', 'inception-2010', 'trip-to-the-moon-1902', 'blur=0&step=8'],
] as const) {
  test(`${category} ${mode} reveals progressively and ignores forged image parameters`, async ({
    request,
  }) => {
    const path = apiPath(mode, category);
    const preview = await request.get(`${path}/preview`);
    expect(preview.status()).toBe(200);
    expect(preview.headers()['set-cookie']).toBeUndefined();
    const initial = await gameState(request, path);
    const original = await image(request, initial.clues[0].imageUrl!);
    const cached = await request.get(initial.clues[0].imageUrl!);
    const etag = cached.headers().etag;
    expect(cached.headers()['cache-control']).toBe('private, no-cache');
    expect(
      (
        await request.get(initial.clues[0].imageUrl!, { headers: { 'If-None-Match': etag } })
      ).status()
    ).toBe(304);
    expect(
      (await request.get(`${path}/media/8`, { headers: { 'If-None-Match': etag } })).status()
    ).toBe(404);
    expect(await preview.body()).toEqual(original);
    expect(await image(request, `${path}/media/1?${forged}`)).toEqual(original);
    const response = await submit(request, path, wrong);
    expect(response.status()).toBe(200);
    const next = await response.json();
    expect(next.attemptsUsed).toBe(1);
    expect(next.clues).toHaveLength(mode === 'one-frame' ? 1 : 2);
    const imageClue = next.clues.findLast((clue: { kind: string }) => clue.kind === 'image');
    const revealed = await image(request, imageClue.imageUrl);
    expect(revealed).not.toEqual(original);
    expect((await submit(request, path, wrong)).status()).toBe(409);
    expect(await image(request, imageClue.imageUrl)).toEqual(revealed);
    expect((await submit(request, path, answer)).status()).toBe(200);
    expect(
      (
        await request.get(initial.clues[0].imageUrl!, { headers: { 'If-None-Match': etag } })
      ).status()
    ).toBe(200);
    expect(await image(request, `${path}/media/1`)).not.toEqual(original);
  });
}

test('Classic authorises one more scene per attempt and ignores forged image parameters', async ({
  request,
}) => {
  const path = apiPath('classic', 'movies');
  const initial = await gameState(request, path);
  expect(initial.clues).toHaveLength(1);
  const opening = await image(request, initial.clues[0].imageUrl!);
  expect(await image(request, `${path}/media/1?crop=10&blur=30&step=8`)).toEqual(opening);
  expect((await request.get(`${path}/media/2`)).status()).toBe(404);
  expect((await submit(request, path, 'inception-2010')).status()).toBe(200);
  const next = await gameState(request, path);
  expect(next.clues).toHaveLength(2);
  // The miss opens the next scene and the fact written on it.
  expect(next.clues[1]).toMatchObject({ kind: 'image', text: 'Year: 1922' });
  // A different scene of the same title, not a transformation of the opening one.
  expect(await image(request, next.clues[1].imageUrl!)).not.toEqual(opening);
  expect(await image(request, next.clues[0].imageUrl!)).toEqual(opening);
  expect((await request.get(`${path}/media/3`)).status()).toBe(404);
  expect((await submit(request, path, 'nosferatu-1922')).status()).toBe(200);
  // The finished round opens the scenes the player never reached.
  expect(await image(request, `${path}/media/8`)).not.toEqual(opening);
});
