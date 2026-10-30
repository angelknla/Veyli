import { HomeHub } from '@/features/challenges/components/Hub';
import { hub } from '@/features/game/service';
export const dynamic = 'force-dynamic';
export default async function HomePage() {
  return <HomeHub data={await hub()} />;
}
