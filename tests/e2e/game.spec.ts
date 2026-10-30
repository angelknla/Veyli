import { apiPath, choose, expect, playPath, roundKey, submit, test } from './helpers';

test('holds image space while loading, retries failures and avoids repeat requests for Classic facts', async ({
  page,
}) => {
  let reads = 0;
  let imageRequests = 0;
  let release = () => {};
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === apiPath()) reads++;
  });
  await page.route('**/api/challenges/**/media/*', async (route) => {
    imageRequests++;
    if (imageRequests === 1) {
      await ready;
      await route.abort('failed');
    } else await route.continue();
  });
  await page.goto(playPath(), { waitUntil: 'domcontentloaded' });
  const frame = page.locator('[data-testid~="classic-frame"]');
  try {
    await expect(frame.locator('[data-testid~="image-skeleton"]')).toBeVisible();
    const bounds = await frame.boundingBox();
    release();
    await page.getByRole('button', { name: 'Retry image' }).click();
    await expect(frame.locator('[data-testid~="image-skeleton"]')).toHaveCount(0);
    expect(await frame.boundingBox()).toEqual(bounds);
    expect(reads).toBe(1);
    const src = await frame.locator('img').evaluate((image: HTMLImageElement) => image.currentSrc);
    expect(src).toMatch(/\bw=(750|828|1080|1200)\b/);
    await choose(page, 'Inception', 2010);
    await expect(page.getByText('7 guesses left')).toBeVisible();
    expect(imageRequests).toBe(2);
    expect(await frame.locator('img').evaluate((image: HTMLImageElement) => image.currentSrc)).toBe(
      src
    );
  } finally {
    release();
  }
});

test('Classic keeps its frame, unlocks facts, restores progress and saves the winning score', async ({
  page,
  context,
}) => {
  await page.goto(playPath());
  await expect(page.getByText('8 guesses left')).toBeVisible();
  expect((await context.cookies()).find((cookie) => cookie.name === 'veyli_player')?.httpOnly).toBe(
    true
  );
  const frame = page.locator('[data-testid~="classic-frame"] img');
  const original = await frame.getAttribute('src');
  await expect(page.locator('[data-testid~="fact-unlocked"]')).toHaveCount(0);
  await choose(page, 'Inception', 2010);
  await expect(page.getByText('7 guesses left')).toBeVisible();
  await expect(page.locator('[data-testid~="fact-unlocked"]')).toHaveCount(1);
  await expect(page.locator('[data-testid~="fact-grid"]')).toContainText('1922');
  await expect(page.locator('[data-testid~="fact-grid"]')).not.toContainText('Gothic horror');
  expect(await frame.getAttribute('src')).toBe(original);
  await page.reload();
  await expect(page.getByText('7 guesses left')).toBeVisible();
  await expect(page.locator('[data-testid~="guess-history"]')).toContainText('Inception');
  await choose(page, 'The Matrix', 1999);
  await expect(page.locator('[data-testid~="fact-unlocked"]')).toHaveCount(2);
  await expect(page.locator('[data-testid~="fact-grid"]')).toContainText('Gothic horror');
  await expect(page.locator('[data-testid~="fact-grid"]')).not.toContainText('F. W. Murnau');
  expect(await frame.getAttribute('src')).toBe(original);
  await choose(page, 'Nosferatu', 1922);
  await expect(page.getByRole('heading', { name: 'You knew it.' })).toBeVisible();
  await expect(page.locator('[data-testid~="result-metrics"]')).toContainText('650');
  await page.getByRole('link', { name: 'See your statistics' }).click();
  await expect(page.locator('[data-testid~="stats-grid"]')).toContainText('1');
  await expect(page.getByText('650', { exact: true })).toBeVisible();
});

test('other modes accept guesses and share results only with an explicit spoiler opt-in', async ({
  page,
}) => {
  for (const [mode, title, year] of [
    ['one-frame', 'A Trip to the Moon', 1902],
    ['poster', 'A Trip to the Moon', 1902],
    ['quote', 'Nosferatu', 1922],
  ] as const) {
    await page.goto(playPath(mode));
    if (mode === 'poster') {
      const box = page.getByRole('combobox', { name: 'What’s your guess?' });
      await box.fill('Le Voyage');
      await expect(page.getByRole('option')).toHaveCount(1);
      await box.press('Enter');
    } else {
      await choose(page, title, year);
    }
    await expect(page.getByRole('heading', { name: 'You knew it.' })).toBeVisible();
  }
  const result = await page.request.get(`/api/share/${roundKey('quote')}`);
  expect(result.status()).toBe(200);
  expect(result.headers()['content-type']).toContain('image/png');
  expect((await result.body()).length).toBeGreaterThan(1000);
  let imageRequests = 0;
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/share/')) imageRequests++;
  });
  await page.evaluate(() =>
    Object.defineProperties(navigator, {
      share: { value: undefined, configurable: true },
      canShare: { value: undefined, configurable: true },
    })
  );
  await page.getByRole('button', { name: 'Share result', exact: true }).click();
  await expect(page.getByText('Result copied.')).toBeVisible();
  expect(imageRequests).toBe(0);
  await page.getByRole('button', { name: 'Copy', exact: true }).click();
  await expect(page.getByText('Result copied.')).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain('Veyli #');
  expect(copied).not.toContain('Nosferatu');
  await page.getByRole('checkbox', { name: 'Include the answer when sharing (spoiler)' }).check();
  await page.getByRole('button', { name: 'Copy', exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('Nosferatu');
  for (let attempt = 0; attempt < 2; attempt++) {
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download result image' }).click();
    expect((await download).suggestedFilename()).toContain('.png');
  }
  expect(imageRequests).toBe(1);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'You knew it.' })).toBeVisible();
  expect((await submit(page.request, apiPath('quote'), 'nosferatu-1922')).status()).toBe(409);
});

test('recovers a committed guess when its response is dropped', async ({ page }) => {
  await page.goto(playPath());
  await expect(page.getByText('8 guesses left')).toBeVisible();
  await page.route(`**${apiPath()}/guess`, async (route) => {
    await route.fetch();
    await route.abort('failed');
  });
  await choose(page, 'Inception', 2010);
  await expect(page.getByText('7 guesses left')).toBeVisible();
  await page.unroute(`**${apiPath()}/guess`);
  await page.reload();
  await expect(page.getByText('7 guesses left')).toBeVisible();
});
