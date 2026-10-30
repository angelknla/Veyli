import Link from 'next/link';
import { z } from 'zod';
import ArchivePicker from '@/features/challenges/components/ArchivePicker';
import { ChallengeCollection } from '@/features/challenges/components/Hub';
import { dateSchema } from '@/features/game/contracts';
import { hub } from '@/features/game/service';
import { rpc } from '@/lib/database';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Archive' };
export default async function Archive({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  let dates: string[] = [];
  try {
    dates = z.array(dateSchema).parse(await rpc('veyli_archive_dates'));
  } catch {}
  const requested = (await searchParams).date;
  const parsed = dateSchema.safeParse(requested);
  const date = parsed.success && parsed.data <= yesterday ? parsed.data : dates[0] || yesterday;
  const data = await hub(date);
  return (
    <div className="page-shell">
      <header className="page-heading">
        <p className="eyebrow">PREVIOUS DROPS</p>
        <h1>Missed a day?</h1>
        <p>Pick a date. Catch up.</p>
      </header>
      <div className="archive-controls">
        <nav className="archive-dates" aria-label="Recent archive days">
          {dates.slice(0, 7).map((value) => (
            <Link
              key={value}
              href={`/archive?date=${value}`}
              className={value === date ? 'active' : ''}
            >
              {new Date(`${value}T12:00:00Z`).toLocaleDateString('en-GB', {
                month: 'short',
                day: 'numeric',
                timeZone: 'UTC',
              })}
            </Link>
          ))}
        </nav>
        <ArchivePicker date={date} min={dates.at(-1) || yesterday} max={yesterday} />
      </div>
      <ChallengeCollection
        data={data}
        title={`The ${new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' })} lineup`}
      />
    </div>
  );
}
