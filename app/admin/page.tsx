import Admin from '@/features/admin/components/Admin';
import { adminSnapshot } from '@/features/admin/server';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Internal content studio',
  robots: { index: false, follow: false },
};
export default async function AdminPage() {
  try {
    return (
      <Admin
        initial={await adminSnapshot()}
        providers={{
          tmdb: Boolean(process.env.TMDB_API_KEY),
          rawg: Boolean(process.env.RAWG_API_KEY),
          igdb: Boolean(process.env.IGDB_CLIENT_ID && process.env.IGDB_CLIENT_SECRET),
        }}
      />
    );
  } catch {
    return (
      <div className="page-shell narrow-shell">
        <div className="empty-state">
          <h1>The studio needs its database.</h1>
          <p>
            Apply supabase/setup.sql to the FitnessJourni project and run yarn db:check. This
            internal page will then show your content.
          </p>
        </div>
      </div>
    );
  }
}
