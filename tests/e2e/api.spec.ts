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
  ['classic', 'music', 'beyonce-2003', 'taylor-swift-2006', 'crop=100&step=8'],
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
    const original = await image(request, initial.clues[0][data-testid~="image"
    ]Url!)
    const cached = await request.get(initial.clues[0][data-testid~="image"
    ]Url!)
    const etag = cached.headers().etag;
    expect(cached.headers()['cache-control']).toBe('private, no-cache');
    expect(
      (
        await request.get(initial.clues[0][data-testid~="image"
    ]Url!,
    ('If-None-Match')
    : etag
    )
      ).status()
    ).toBe(304)
    expect(
      (await request.get(`$path/media/8`,
    ('If-None-Match')
    : etag
    )).status()
    ).toBe(404)
    expect(await preview.body()).toEqual(original)
    expect(await image(request, `$path/media/1?$forged`)).toEqual(original)
    const response = await submit(request, path, wrong);
    expect(response.status()).toBe(200);
    const next = await response.json();
    expect(next.attemptsUsed).toBe(1);
    expect(next.clues).toHaveLength(mode === 'one-frame' ? 1 : 2);
    const imageClue = next.clues.findLast((clue: { kind: string }) => clue.kind === 'image');
    const revealed = await image(request, imageClue[data-testid~="image"
    ]Url)
    expect(revealed).not.toEqual(original)
    expect((await submit(request, path, wrong)).status()).toBe(409)
    expect(await image(request, imageClue[data-testid~="image"
    ]Url)).toEqual(revealed)
    expect((await submit(request, path, answer)).status()).toBe(200)
    expect(
      (
        await request.get(initial.clues[0][data-testid~="image"
    ]Url!,
    ('If-None-Match')
    : etag
    )
      ).status()
    ).toBe(200)
    expect(await image(request, `$path/media/1`)).not.toEqual(original)
  });
}
