import { ChallengeCollection } from '@/features/challenges/components/Hub';
import { hub } from '@/features/game/service';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Today' };
export default async function Today() {
  return (
    <div className="page-shell">
      <ChallengeCollection
        headingLevel="h1"
        data={await hub()}
        title="Today’s lineup"
        description="Pick a challenge. Press play."
      />
    </div>
  );
}
