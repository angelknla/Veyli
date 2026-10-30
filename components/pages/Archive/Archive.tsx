import Link from 'next/link';
import { z } from 'zod';
import ArchivePicker from '@/components/challenges/ArchivePicker/ArchivePicker';
import { ChallengeCollection } from '@/components/challenges/Hub/Hub';
import styles from '@/components/pages/Archive/Archive.module.css';
import sharedStyles from '@/components/ui/Shared/Shared.module.css';
import { dateSchema } from '@/features/game/contracts';
import { hub } from '@/features/game/service';
import { rpc } from '@/lib/database';

const Archive = async ({ searchParams }: { searchParams: Promise<{ date?: string }> }) => {
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
    <div className={sharedStyles.pageShell}>
      <header className={sharedStyles.pageHeading}>
        <p className={sharedStyles.eyebrow}>PREVIOUS DROPS</p>
        <h1>Missed a day?</h1>
        <p>Pick a date. Catch up.</p>
      </header>
      <div className={styles.archiveControls}>
        <nav className={styles.archiveDates} aria-label="Recent archive days">
          {dates.slice(0, 7).map((value) => (
            <Link
              key={value}
              href={`/archive?date=${value}`}
              className={value === date ? styles.active : undefined}
              data-testid={value === date ? 'active' : ''}
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
};
export default Archive;
