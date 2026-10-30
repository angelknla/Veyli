'use client';

import { ArrowUpRight, Flame, Sparkles, Trophy } from 'lucide-react';
import Link from 'next/link';
import relatedStyles1 from '@/components/admin/Admin/Admin.module.css';
import styles from '@/components/statistics/Statistics/Statistics.module.css';
import buttonStyles from '@/components/ui/Button/Button.module.css';
import sharedStyles from '@/components/ui/Shared/Shared.module.css';
import type { HubData } from '@/features/game/contracts';
import { earnedAchievements, statistics } from '@/features/statistics/compute';
import { useProgress } from '@/features/statistics/store';
import { cn } from '@/lib/utils';

const Statistics = ({ data }: { data: HubData }) => {
  const progress = useProgress();
  const stats = statistics(progress.records);
  const earned = earnedAchievements(progress.records, progress.definitions);
  const name = (slug: string, kind: 'category' | 'mode') =>
    (kind === 'category' ? data.categories : data.modes).find((value) => value.slug === slug)
      ?.name || slug.replace(/-/g, ' ');
  return (
    <div className={sharedStyles.pageShell}>
      <header className={sharedStyles.pageHeading}>
        <p className={sharedStyles.eyebrow}>PLAYER STATS</p>
        <h1>Your stats.</h1>
      </header>
      <div className={relatedStyles1.statsGrid} data-testid="stats-grid">
        {[
          { value: stats.played, label: 'Games played' },
          { value: stats.wins, label: 'Challenges won' },
          { value: `${stats.winPercentage}%`, label: 'Win percentage' },
          { value: stats.currentStreak, label: 'Current day streak' },
        ].map((stat) => (
          <div key={stat.label}>
            <div className={relatedStyles1.statNumber}>{stat.value}</div>
            <div className={relatedStyles1.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>
      <div className={styles.statsSecondary}>
        <div>
          <Flame size={18} />
          <strong>{stats.longestStreak}</strong>longest streak
        </div>
        <div>
          <strong>{stats.averageAttempts.toFixed(1)}</strong>average attempts
        </div>
        <div>
          <strong>{stats.averageScore}</strong>average points
        </div>
        <div>
          <Trophy size={18} />
          <strong>{stats.perfects}</strong>first-guess wins
        </div>
      </div>
      {stats.played ? (
        <div className={styles.performanceGrid}>
          {(['category', 'mode'] as const).map((kind) => (
            <section key={kind}>
              <h2>{kind === 'category' ? 'By category' : 'By mode'}</h2>
              {(kind === 'category' ? stats.categories : stats.modes).map((row) => (
                <div className={styles.performanceRow} key={row.slug}>
                  <div>
                    <span>{name(row.slug, kind)}</span>
                    <span>
                      {row.wins}/{row.played} won · {row.score} pts
                    </span>
                  </div>
                  <meter
                    className={styles.performanceMeter}
                    aria-label={`${name(row.slug, kind)} win percentage`}
                    value={Math.round((row.wins / row.played) * 100)}
                    min={0}
                    max={100}
                  >
                    {Math.round((row.wins / row.played) * 100)}%
                  </meter>
                </div>
              ))}
            </section>
          ))}
        </div>
      ) : (
        <div className={sharedStyles.emptyState}>
          <Sparkles size={30} />
          <h2>Ready for round one?</h2>
          <p>Your scores start here.</p>
          <Link href="/" className={cn(buttonStyles.button, buttonStyles.buttonPrimary)}>
            Play today <ArrowUpRight size={17} />
          </Link>
        </div>
      )}
      {earned.length > 0 && (
        <>
          <div className={sharedStyles.sectionHeading}>
            <div>
              <p className={sharedStyles.eyebrow}>LEVEL UP</p>
              <h2>Achievements</h2>
            </div>
          </div>
          <div className={styles.achievementGrid}>
            {earned.map((achievement) => (
              <article className={styles.achievement} key={achievement.slug}>
                <Sparkles size={23} />
                <h3>{achievement.name}</h3>
                <p>{achievement.description}</p>
              </article>
            ))}
          </div>
        </>
      )}
      <p className={styles.localNote}>
        Saved on this browser. Clearing browser data removes your history.{' '}
        {progress.storageAvailable
          ? ''
          : 'This browser is currently blocking local storage; statistics cannot be saved here.'}{' '}
        <Link href="/privacy">Progress & streaks.</Link>
      </p>
    </div>
  );
};

export default Statistics;
