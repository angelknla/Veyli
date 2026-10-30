import { type APIRequestContext, test as base, expect, type Page } from '@playwright/test';
import type { AdminRecord } from '@/features/admin/contracts';
import type { GameState } from '@/features/game/contracts';

export { expect };
export const origin = 'http://127.0.0.1:3100';
export const date = (offset = 0) =>
  new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
export const roundKey = (mode = 'classic', category = 'movies', day = date()) =>
  `${day}-${category}-${mode}`;
export const playPath = (mode = 'classic', category = 'movies') =>
  `/play/${roundKey(mode, category)}`;
export const apiPath = (mode = 'classic', category = 'movies') =>
  `/api/challenges/${roundKey(mode, category)}`;

export const test = base.extend<{ admin: Page }>({
  admin: async ({ browser }, use) => {
    const context = await browser.newContext({
      baseURL: origin,
      httpCredentials: {
        username: 'admin',
        password: 'isolated-admin-test-secret-not-for-deployment-123',
      },
    });
    try {
      await use(await context.newPage());
    } finally {
      await context.close();
    }
  },
});

export const choose = async (page: Page, title: string, year: number) => {
  await page.getByRole('combobox', { name: 'What’s your guess?' }).fill(title);
  await page
    .getByRole('option')
    .filter({ hasText: title })
    .filter({ hasText: String(year) })
    .first()
    .click();
  await page.getByRole('button', { name: 'Guess', exact: true }).click();
};

export const gameState = async (request: APIRequestContext, path: string): Promise<GameState> => {
  const response = await request.get(path);
  expect(response.status()).toBe(200);
  return response.json();
};

export const submit = (request: APIRequestContext, path: string, slug: string) => {
  return request.post(`${path}/guess`, { headers: { Origin: origin }, data: { slug } });
};

export const image = async (request: APIRequestContext, path: string) => {
  const response = await request.get(path);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toMatch(/^image\//);
  return response.body();
};

export const idFor = (records: AdminRecord[], slug: string) => {
  const record = records.find((record) => record.slug === slug);
  expect(record, `Missing fixture: ${slug}`).toBeDefined();
  return String(record!.id);
};
