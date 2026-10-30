import AxeBuilder from '@axe-core/playwright';
import { choose, date, expect, playPath, roundKey, test } from './helpers';

test('browses daily puzzles and whole category cards without a player login', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /PRESS PLAY/ })).toBeVisible();
  await expect(page.locator('.challenge-tile')).toHaveCount(12);
  await expect(page.getByRole('link', { name: /Sign in|Log in|Register|Profile/ })).toHaveCount(0);
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Categories', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Pick your universe.' })).toBeVisible();
  await expect(page.locator('.category-card')).toHaveCount(5);
  for (const [name, slug] of [
    ['Music', 'music'],
    ['Pop culture', 'pop-culture'],
  ]) {
    await page.goto('/categories');
    await page
      .locator('.category-card')
      .filter({ has: page.getByRole('heading', { name, exact: true }) })
      .click({ position: { x: 15, y: 15 } });
    await expect(page).toHaveURL(new RegExp(`/categories/${slug}$`));
    await expect(page.locator('.challenge-tile')).toHaveCount(2);
  }
  await page.goto('/archive');
  await expect(page.getByRole('heading', { name: 'Missed a day?' })).toBeVisible();
  expect(await page.locator('input[type=date]').getAttribute('max')).toBe(date(-1));
});

test('plays Music and Pop Culture through the common game interface', async ({ page }) => {
  for (const [category, mode, title, year] of [
    ['music', 'classic', 'Taylor Swift', 2006],
    ['music', 'one-frame', 'Lady Gaga', 2008],
    ['pop-culture', 'classic', 'Sherlock Holmes', 1887],
    ['pop-culture', 'one-frame', 'Alice', 1865],
  ] as const) {
    await page.goto(`/play/${roundKey(mode, category)}`);
    await expect(page.getByText('8 guesses left')).toBeVisible();
    await choose(page, title, year);
    await expect(page.getByRole('heading', { name: 'You knew it.' })).toBeVisible();
    await expect(page.locator('.answer-reveal')).toContainText(title);
    await expect(page.locator('.result-metrics')).toContainText('1,000');
  }
});

test('shows navigation feedback and opens loaded challenges at the top', async ({ page }) => {
  for (const category of ['music', 'movies']) {
    const path = playPath('classic', category);
    const api = `/api/challenges/${roundKey('classic', category)}`;
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
        ? page.locator(`.challenge-tile[href="${path}"]`)
        : page.getByRole('link', { name: 'Play today' });
    try {
      await link.click();
      await expect(link.locator('.spin')).toBeVisible();
      await expect(link.getByRole('status')).toHaveText('Loading challenge…');
      const request = page.waitForRequest((request) => new URL(request.url()).pathname === api);
      releaseNavigation();
      await request;
      await expect(page.getByRole('status').filter({ hasText: 'Setting the scene' })).toBeVisible();
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      releaseRound();
      await expect(page.locator('.classic-frame img')).toBeVisible();
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
      await expect(page.locator('.classic-frame')).toBeInViewport();
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
  await expect(page.locator('.challenge-tile')).toHaveCount(4);
  for (const href of await page
    .locator('.challenge-tile')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href'))))
    expect(href).toMatch(/-(games|music)-/);
  const filtered = await (await page.request.get('/api/hub?from=2000&to=2026')).json();
  expect(filtered.challenges).toHaveLength(4);
  expect(JSON.stringify(filtered)).not.toMatch(/answer_id|release_year|accepted_answer/);
  await page.reload();
  await expect(page.locator('.challenge-tile')).toHaveCount(4);
  await page.getByRole('button', { name: 'All years', exact: true }).click();
  await expect(page.locator('.challenge-tile')).toHaveCount(12);
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
