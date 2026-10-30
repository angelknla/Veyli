import type { AdminSnapshot } from '@/features/admin/contracts';
import { apiPath, date, expect, gameState, idFor, image, origin, test } from './helpers';

const savedMessage = 'Saved. Public challenges release according to the UTC server clock.';

test('protects administration and saves aliases, future schedules and ordered clues', async ({
  page,
  admin,
}, testInfo) => {
  expect((await page.request.get('/admin')).status()).toBe(401);
  expect((await page.request.post('/api/admin/save', { data: {} })).status()).toBe(401);
  await admin.goto('/admin');
  await expect(admin.getByRole('heading', { name: 'The content studio.' })).toBeVisible();
  await admin.getByRole('button', { name: 'Preview clues' }).click();
  await expect(admin.getByText('INTERNAL PREVIEW — CONTAINS SPOILERS')).toBeVisible();
  const suffix = testInfo.project.name.toLowerCase();
  await admin.getByRole('button', { name: 'items', exact: true }).click();
  await admin.getByRole('button', { name: 'New item', exact: true }).click();
  await admin.getByLabel('Stable URL slug').fill(`editorial-check-${suffix}`);
  await admin.getByLabel('Entertainment title', { exact: true }).fill(`Editorial check ${suffix}`);
  await admin
    .getByLabel('Original editorial summary')
    .fill('Isolated browser-test content; never deployed.');
  await admin.getByLabel('Metadata source URL').fill('https://example.org/editorial-check');
  await admin.getByLabel('Alternative titles').fill(`Alias one ${suffix}\nAlias two ${suffix}`);
  await admin.getByRole('button', { name: 'Save item', exact: true }).click();
  await expect(admin.getByText(savedMessage)).toBeVisible();
  const catalogue = await (
    await admin.request.get(
      `/api/catalogue?category=movies&q=${encodeURIComponent(`Alias two ${suffix}`)}`
    )
  ).json();
  expect(catalogue.items).toEqual([expect.objectContaining({ slug: `editorial-check-${suffix}` })]);
  await admin.getByRole('button', { name: 'challenges', exact: true }).click();
  await admin.getByRole('button', { name: 'New challenge', exact: true }).click();
  const snapshot: AdminSnapshot = await (await admin.request.get('/api/admin/snapshot')).json();
  await admin
    .getByLabel('Game mode', { exact: true })
    .selectOption(idFor(snapshot.modes, 'poster'));
  await admin
    .getByLabel('Correct entertainment item')
    .selectOption(idFor(snapshot.items, 'nosferatu-1922'));
  const future = date(testInfo.project.name === 'Desktop' ? 40 : 41);
  await admin.getByLabel('Publication date (UTC)').fill(future);
  await admin.getByLabel('Lifecycle').selectOption('scheduled');
  for (let index = 0; index < 3; index++) {
    if (index) await admin.getByRole('button', { name: 'Add image clue', exact: true }).click();
    await admin.getByLabel('Licensed asset').nth(index).selectOption({ label: 'nosferatu' });
  }
  await admin.getByLabel('Visible centre crop (10–100%)').nth(1).fill('70');
  await admin.getByRole('button', { name: 'Move clue 3 earlier', exact: true }).click();
  await admin.getByRole('button', { name: 'Save challenge', exact: true }).click();
  await expect(admin.getByText(savedMessage)).toBeVisible();
  const current: AdminSnapshot = await (await admin.request.get('/api/admin/snapshot')).json();
  const round = current.challenges.find((round) => round.public_key === `${future}-movies-poster`)!;
  const clues = round.clues as { position: number; crop_percent: number }[];
  expect(clues.map((clue) => clue.position)).toEqual([1, 2, 3]);
  expect(clues[2].crop_percent).toBe(70);
  expect((await admin.request.get(`/api/challenges/${future}-movies-poster`)).status()).toBe(404);

  // Referenced items and images cannot be changed in ways that invalidate saved rounds.
  await gameState(admin.request, apiPath());
  const item = current.items.find((item) => item.slug === 'nosferatu-1922')!;
  const media = current.media.find((media) => media.slug === 'nosferatu')!;
  for (const [entity, payload] of [
    ['item', { ...item, category_id: idFor(current.categories, 'games') }],
    ['media', { ...media, storage_path: 'admin/replacement.jpg' }],
  ])
    expect(
      (
        await admin.request.post('/api/admin/save', {
          headers: { Origin: origin },
          data: { entity, payload },
        })
      ).status()
    ).toBe(409);
});

test('updates browse thumbnails after edits and matches the initial gameplay image', async ({
  admin,
}, testInfo) => {
  const snapshot: AdminSnapshot = await (await admin.request.get('/api/admin/snapshot')).json();
  const past = date(testInfo.project.name === 'Desktop' ? -10 : -11);
  const path = `/api/challenges/${past}-movies-one-frame`;
  const clue = {
    position: 1,
    kind: 'image',
    media_id: idFor(snapshot.media, 'nosferatu'),
    presentation: 'crop',
    blur_amount: 0,
    crop_percent: 40,
  };
  const payload = {
    category_id: idFor(snapshot.categories, 'movies'),
    mode_id: idFor(snapshot.modes, 'one-frame'),
    answer_id: idFor(snapshot.items, 'nosferatu-1922'),
    release_date: past,
    status: 'scheduled',
    difficulty: 'medium',
    attempt_limit: 8,
    scores: [1000, 800, 650, 500, 400, 300, 200, 100],
    clues: [clue],
  };
  const save = (payload: object) =>
    admin.request.post('/api/admin/save', {
      headers: { Origin: origin },
      data: { entity: 'challenge', payload },
    });
  const created = await save(payload);
  expect(created.status()).toBe(200);
  const { id } = await created.json();
  await admin.goto(`/archive?date=${past}`);
  const thumbnail = admin.locator('.tile-image').first();
  await expect(thumbnail).toBeVisible();
  const previousUrl = await thumbnail.getAttribute('src');
  expect(previousUrl).toContain('?v=');
  const previousImage = await image(admin.request, previousUrl!);
  expect((await save({ ...payload, id, clues: [{ ...clue, crop_percent: 75 }] })).status()).toBe(
    200
  );
  await admin.reload();
  const currentUrl = await thumbnail.getAttribute('src');
  expect(currentUrl).not.toBe(previousUrl);
  const currentImage = await image(admin.request, currentUrl!);
  expect(currentImage).not.toEqual(previousImage);
  const state = await gameState(admin.request, path);
  expect(currentImage).toEqual(await image(admin.request, state.clues[0].imageUrl!));
});
