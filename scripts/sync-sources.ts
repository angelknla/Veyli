import { createClient } from '@supabase/supabase-js';
import { syncSources } from '../features/entertainment/sync';
import { sourceCategories } from '../features/entertainment/wikimedia';

const main = async () => {
  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error('Supabase configuration missing');
  const db = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const report = await syncSources(db, {
    pages: numericOption('pages', 1, 25),
    poolSize: numericOption('pool-size', 1, 400),
    cachedOnly: process.argv.includes('--cached-only'),
    categories: process.argv.find((arg) => arg.startsWith('--categories='))
      ? sourceCategories.filter((category) =>
          process.argv
            .find((arg) => arg.startsWith('--categories='))!
            .slice(13)
            .split(',')
            .includes(category)
        )
      : undefined,
    catalogueOnly: process.argv.includes('--catalogue-only'),
    log: console.log,
  });
  console.log(JSON.stringify(report, null, 2));
};
const numericOption = (name: string, minimum: number, maximum: number) => {
  const value = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (!value) return undefined;
  const number = Number(value.split('=')[1]);
  if (!Number.isInteger(number) || number < minimum || number > maximum)
    throw new Error('Invalid sync option');
  return number;
};
main().catch(() => {
  console.error('Veyli source sync failed. Existing gameplay data has been retained.');
  process.exitCode = 1;
});
