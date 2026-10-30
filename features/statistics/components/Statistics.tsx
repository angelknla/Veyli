'use client';
import { ArrowUpRight, Flame, Sparkles, Trophy } from 'lucide-react';
import Link from 'next/link';
import type { HubData } from '@/features/game/contracts';
import { earnedAchievements, statistics } from '../compute';
import { useProgress } from '../store';
export default function Statistics({ data }: { data: HubData }) {
  const progress = useProgress();
  const stats = statistics(progress.records);
  const earned = earnedAchievements(progress.records, progress.definitions);
  const name = (slug: string, kind: 'category' | 'mode') =>
    (kind === 'category' ? data.categories : data.modes).find((value) => value.slug === slug)
      ?.name || slug.replace(/-/g, ' ');
  return (
    <div className="page-shell">
      <header className="page-heading">
        <p className="eyebrow">PLAYER STATS</p>
        <h1>Your stats.</h1>
      </header>
      <div className="stats-grid">
        {[
          { value: stats.played, label: 'Games played' },
          { value: stats.wins, label: 'Challenges won' },
          { value: `${stats.winPercentage}%`, label: 'Win percentage' },
          { value: stats.currentStreak, label: 'Current day streak' },
        ].map((stat) => (
          <div key={stat.label}>
            <div className="stat-number">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>
      <div className="stats-secondary">
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
        <div className="performance-grid">
          {(['category', 'mode'] as const).map((kind) => (
            <section key={kind}>
              <h2>{kind === 'category' ? 'By category' : 'By mode'}</h2>
              {(kind === 'category' ? stats.categories : stats.modes).map((row) => (
                <div className="performance-row" key={row.slug}>
                  <div>
                    <span>{name(row.slug, kind)}</span>
                    <span>
                      {row.wins}/{row.played} won · {row.score} pts
                    </span>
                  </div>
                  <meter
                    className="performance-meter"
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
        <div className="empty-state">
          <Sparkles size={30} />
          <h2>Ready for round one?</h2>
          <p>Your scores start here.</p>
          <Link href="/today" className="button button-primary">
            Play today <ArrowUpRight size={17} />
          </Link>
        </div>
      )}
      {earned.length > 0 && (
        <>
          <div className="section-heading">
            <div>
              <p className="eyebrow">LEVEL UP</p>
              <h2>Achievements</h2>
            </div>
          </div>
          <div className="achievement-grid">
            {earned.map((achievement) => (
              <article className="achievement" key={achievement.slug}>
                <Sparkles size={23} />
                <h3>{achievement.name}</h3>
                <p>{achievement.description}</p>
              </article>
            ))}
          </div>
        </>
      )}
      <p className="local-note">
        Saved on this browser. Clearing browser data removes your history.{' '}
        {progress.storageAvailable
          ? ''
          : 'This browser is currently blocking local storage; statistics cannot be saved here.'}{' '}
        <Link href="/privacy">Progress & streaks.</Link>
      </p>
    </div>
  );
}
