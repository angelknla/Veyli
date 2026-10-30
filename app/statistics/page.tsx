import { hub } from '@/features/game/service';
import Statistics from '@/features/statistics/components/Statistics';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Statistics' };
export default async function Stats() {
  return <Statistics data={await hub()} />;
}
