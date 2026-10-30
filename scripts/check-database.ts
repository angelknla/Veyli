import { createClient } from '@supabase/supabase-js';

const main = async () => {
  const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await db.rpc('veyli_hub', { requested_date: null });
  if (error) {
    console.error(
      'Veyli schema is unavailable. Run supabase/setup.sql in the FitnessJourni SQL Editor, then yarn db:check.'
    );
    process.exitCode = 1;
  } else
    console.log(
      `Veyli database ready: ${data.categories.length} categories, ${data.modes.length} modes, ${data.challenges.length} daily challenges.`
    );
};
void main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Setup failed.');
  process.exitCode = 1;
});
