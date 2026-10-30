import { readFile } from 'node:fs/promises';
import pg from 'pg';

const main = async () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString)
    throw new Error(
      'Set DATABASE_URL locally, or apply supabase/setup.sql using the FitnessJourni SQL Editor.'
    );
  const client = new pg.Client({ connectionString });
  try {
    await client.connect();
    await client.query(await readFile('supabase/setup.sql', 'utf8'));
    console.log('Applied source-driven Veyli setup. Run yarn db:sync to import content.');
  } catch {
    throw new Error(
      'Migration failed; inspect the PostgreSQL connection and SQL setup. No credentials were printed.'
    );
  } finally {
    await client.end();
  }
};
void main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Setup failed.');
  process.exitCode = 1;
});
