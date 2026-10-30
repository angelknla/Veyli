import styles from '@/components/pages/Leaderboard/Leaderboard.module.css';
import sharedStyles from '@/components/ui/Shared/Shared.module.css';
import { rankings } from '@/features/game/service';

const Leaderboard = async () => {
  const date = new Date().toISOString().slice(0, 10);
  let available = true;
  let rows: Awaited<ReturnType<typeof rankings>> = [];
  try {
    rows = await rankings(date);
  } catch {
    available = false;
  }
  return (
    <div className={sharedStyles.pageShell}>
      <header className={sharedStyles.pageHeading}>
        <p className={sharedStyles.eyebrow}>DAILY RANKINGS</p>
        <h1>The high scores.</h1>
      </header>
      <p className={styles.rankingNote}>{date} · Resets at 00:00 UTC.</p>
      {rows.length ? (
        <table className={styles.rankingTable}>
          <caption className={'sr-only'}>Anonymous rankings for {date}</caption>
          <thead>
            <tr>
              <th scope="col">Rank</th>
              <th scope="col">Player</th>
              <th scope="col">Points</th>
              <th scope="col">Solved</th>
              <th scope="col">Played</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.alias}>
                <td>{String(index + 1).padStart(2, '0')}</td>
                <td>{row.alias}</td>
                <td>{row.score.toLocaleString()}</td>
                <td>{row.wins}</td>
                <td>{row.games}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className={sharedStyles.emptyState}>
          <h2>{available ? 'Take the first spot.' : 'Rankings are taking a short break.'}</h2>
          <p>{available ? 'Play today to join the leaderboard.' : 'Please try again shortly.'}</p>
        </div>
      )}
    </div>
  );
};
export default Leaderboard;
