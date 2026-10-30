import Statistics from '@/components/statistics/Statistics/Statistics';
import { hub } from '@/features/game/service';

const Stats = async () => {
  return <Statistics data={await hub()} />;
};
export default Stats;
