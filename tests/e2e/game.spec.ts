import { apiPath, choose, expect, playPath, roundKey, submit, test } from './helpers';

// The clue stage animates in from a small offset; hold it still to measure layout alone.
test.describe('clue image space', () => {
  test.use({ reducedMotion: 'reduce' });
  test('holds image space while loading, retries failures and keeps a revealed scene cached', async ({
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
    const frame = page.locator('[data-testid~="clue-stage"]');
    // Page coordinates, so that scrolling during the retry cannot pass for a layout shift.
    const bounds = () =>
      frame.evaluate((node) => {
        const box = node.getBoundingClientRect();
        return {
          width: box.width,
          height: box.height,
          top: box.top + window.scrollY,
          left: box.left + window.scrollX,
        };
      });
    try {
      await expect(frame.locator('[data-testid~="image-skeleton"]')).toBeVisible();
      // Settle the web fonts first, so heading metrics cannot move the stage between measurements.
      await page.evaluate(() => document.fonts.ready);
      const held = await bounds();
      release();
      await page.getByRole('button', { name: 'Retry image' }).click();
      await expect(frame.locator('[data-testid~="image-skeleton"]')).toHaveCount(0);
      expect(await bounds()).toEqual(held);
      expect(reads).toBe(1);
      const src = await frame
        .locator('img')
        .evaluate((image: HTMLImageElement) => image.currentSrc);
      expect(src).toMatch(/\bw=(750|828|1080|1200)\b/);
      await choose(page, 'Inception', 2010);
      await expect(page.getByText('7 guesses left')).toBeVisible();
      // The miss opens a second scene, and the opening frame keeps the image it already loaded.
      await expect.poll(() => imageRequests).toBe(3);
      await page.getByRole('button', { name: 'Show clue 1' }).click();
      await expect
        .poll(() => frame.locator('img').evaluate((image: HTMLImageElement) => image.currentSrc))
        .toBe(src);
    } finally {
      release();
    }
  });
});

test('Classic opens a different scene and one more fact on every miss', async ({
  page,
  context,
}) => {
  await page.goto(playPath());
  await expect(page.getByText('8 guesses left')).toBeVisible();
  expect((await context.cookies()).find((cookie) => cookie.name === 'veyli_player')?.httpOnly).toBe(
    true
  );
  const stage = page.locator('[data-testid~="clue-stage"]');
  const frame = stage.locator('img');
  const original = (await frame.getAttribute('src'))!;
  const navigation = page
    .getByRole('group', { name: 'Choose a revealed clue' })
    .getByRole('button');
  await expect(navigation).toHaveCount(1);
  await expect(stage).toContainText('CLUE 1 / 1 REVEALED');
  // The opening scene arrives without a fact.
  await expect(page.locator('[data-testid~="fact-unlocked"]')).toHaveCount(0);
  await choose(page, 'Inception', 2010);
  await expect(page.getByText('7 guesses left')).toBeVisible();
  await expect(navigation).toHaveCount(2);
  await expect(stage).toContainText('CLUE 2 / 2 REVEALED');
  await expect(frame).not.toHaveAttribute('src', original);
  await expect(page.locator('[data-testid~="fact-unlocked"]')).toHaveCount(1);
  await expect(page.locator('[data-testid~="fact-grid"]')).toContainText('1922');
  await expect(page.locator('[data-testid~="fact-grid"]')).not.toContainText('Gothic horror');
  await page.reload();
  await expect(page.getByText('7 guesses left')).toBeVisible();
  await expect(page.locator('[data-testid~="guess-history"]')).toContainText('Inception');
  await choose(page, 'The Matrix', 1999);
  await expect(navigation).toHaveCount(3);
  await expect(stage).toContainText('CLUE 3 / 3 REVEALED');
  await expect(page.locator('[data-testid~="fact-unlocked"]')).toHaveCount(2);
  await expect(page.locator('[data-testid~="fact-grid"]')).toContainText('Gothic horror');
  await expect(page.locator('[data-testid~="fact-grid"]')).not.toContainText('F. W. Murnau');
  // Every earlier scene stays available to revisit.
  await page.getByRole('button', { name: 'Show clue 1' }).click();
  await expect(frame).toHaveAttribute('src', original);
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
