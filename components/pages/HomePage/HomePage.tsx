import { HomeHub } from '@/components/challenges/Hub/Hub';
import { hub } from '@/features/game/service';

const HomePage = async () => {
  return <HomeHub data={await hub()} />;
};
export default HomePage;
