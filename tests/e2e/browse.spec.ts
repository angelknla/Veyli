import AxeBuilder from '@axe-core/playwright';
import { choose, date, expect, playPath, roundKey, test } from './helpers';

test('browses daily puzzles and whole category cards without a player login', async ({ page }) => {
  await page.goto('/today');
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: /PRESS PLAY/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Today', exact: true })).toHaveAttribute('href', '/');
  await expect(page.locator('[data-testid~="challenge-tile"]')).toHaveCount(10);
  await expect(page.getByRole('link', { name: /Sign in|Log in|Register|Profile/ })).toHaveCount(0);
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Categories', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Pick your universe.' })).toBeVisible();
  await expect(page.locator('[data-testid~="category-card"]')).toHaveCount(5);
  await expect(page.locator('[data-testid~="category-art"] svg')).toHaveCount(5);
  await expect(page.locator('[data-testid~="category-card"] img')).toHaveCount(0);
  // Classic needs a run of scenes, so Music and Pop culture carry One Frame alone.
  for (const [name, slug, tiles] of [
    ['Music', 'music', 1],
    ['Pop culture', 'pop-culture', 1],
    ['Television', 'television', 2],
  ] as const) {
    await page.goto('/categories');
    await page
      .locator('[data-testid~="category-card"]')
      .filter({ has: page.getByRole('heading', { name, exact: true }) })
      .click({ position: { x: 15, y: 15 } });
    await expect(page).toHaveURL(new RegExp(`/categories/${slug}$`));
    await expect(page.locator('[data-testid~="challenge-tile"]')).toHaveCount(tiles);
  }
  await page.goto('/archive');
  await expect(page.getByRole('heading', { name: 'Missed a day?' })).toBeVisible();
  expect(await page.locator('input[type=date]').getAttribute('max')).toBe(date(-1));
});

test('plays Music and Pop Culture through the common game interface', async ({ page }) => {
  for (const [category, mode, title, year] of [
    ['music', 'one-frame', 'Lady Gaga', 2008],
    ['pop-culture', 'one-frame', 'Alice', 1865],
    ['television', 'classic', 'Bonanza', 1959],
    ['games', 'classic', 'SuperTuxKart', 2006],
  ] as const) {
    await page.goto(`/play/${roundKey(mode, category)}`);
    await expect(page.getByText('8 guesses left')).toBeVisible();
    await choose(page, title, year);
    await expect(page.getByRole('heading', { name: 'You knew it.' })).toBeVisible();
    await expect(page.locator('[data-testid~="answer-reveal"]')).toContainText(title);
    await expect(page.locator('[data-testid~="result-metrics"]')).toContainText('1,000');
  }
});

test('shows navigation feedback and opens loaded challenges at the top', async ({ page }) => {
  for (const [category, mode] of [
    ['music', 'one-frame'],
    ['movies', 'classic'],
  ] as const) {
    const path = playPath(mode, category);
    const api = `/api/challenges/${roundKey(mode, category)}`;
    let releaseNavigation = () => {};
    let releaseRound = () => {};
    const navigation = new Promise<void>((resolve) => {
      releaseNavigation = resolve;
    });
    const round = new Promise<void>((resolve) => {
      releaseRound = resolve;
    });
    await page.route(`**${path}?*`, async (route) => {
      await navigation;
      await route.continue();
    });
    await page.route(`**${api}`, async (route) => {
      await round;
      await route.continue();
    });
    await page.goto('/');
    const link =
      category === 'music'
        ? page.locator(`[data-testid~="challenge-tile"][href="${path}"]`)
        : page.getByRole('link', { name: 'Start challenge' });
    try {
      await link.click();
      await expect(link.locator('[data-testid~="spin"]')).toBeVisible();
      await expect(link.getByRole('status')).toHaveText('Loading challenge…');
      const request = page.waitForRequest((request) => new URL(request.url()).pathname === api);
      releaseNavigation();
      await request;
      await expect(page.getByRole('status').filter({ hasText: 'Setting the scene' })).toBeVisible();
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      releaseRound();
      await expect(page.locator('[data-testid~="clue-stage"] img')).toBeVisible();
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
      await expect(page.locator('[data-testid~="clue-stage"]')).toBeInViewport();
    } finally {
      releaseNavigation();
      releaseRound();
    }
  }
});

test('persists the release-year filter without leaking hidden answer years', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('spinbutton', { name: 'From year' }).fill('2000');
  await page.getByRole('spinbutton', { name: 'To year' }).fill('2026');
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(page.locator('[data-testid~="challenge-tile"]')).toHaveCount(3);
  for (const href of await page
    .locator('[data-testid~="challenge-tile"]')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href'))))
    expect(href).toMatch(/-(games|music)-/);
  const filtered = await (await page.request.get('/api/hub?from=2000&to=2026')).json();
  expect(filtered.challenges).toHaveLength(3);
  expect(JSON.stringify(filtered)).not.toMatch(/answer_id|release_year|accepted_answer/);
  await page.reload();
  await expect(page.locator('[data-testid~="challenge-tile"]')).toHaveCount(3);
  await page.getByRole('button', { name: 'All years', exact: true }).click();
  await expect(page.locator('[data-testid~="challenge-tile"]')).toHaveCount(10);
  expect((await page.request.get('/api/hub?from=2026&to=2000')).status()).toBe(400);
});

test('home, game and statistics are accessible and fit the viewport', async ({ page }) => {
  for (const path of ['/', playPath(), '/statistics']) {
    await page.goto(path);
    if (path === playPath())
      await expect(page.getByRole('combobox', { name: 'What’s your guess?' })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(
      result.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) }))
    ).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    ).toBe(true);
  }
});
