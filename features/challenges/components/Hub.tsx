'use client';
import {
  ArrowRight,
  ArrowUpRight,
  Clock3,
  Film,
  Flame,
  Gamepad2,
  Image as ImageIcon,
  Layers,
  Music,
  Play,
  Quote,
  Scan,
  Sparkles,
  Tv,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import LoadingImage from '@/components/LoadingImage';
import type { Challenge, HubData } from '@/features/game/contracts';
import { earnedAchievements, statistics } from '@/features/statistics/compute';
import { useProgress } from '@/features/statistics/store';
import { fetchJson } from '@/lib/fetch-json';
import YearRangeControls, { useYearRange } from './YearRange';

const icons: Record<string, typeof Film> = {
  film: Film,
  tv: Tv,
  gamepad: Gamepad2,
  music: Music,
  sparkles: Sparkles,
  layers: Layers,
  scan: Scan,
  image: ImageIcon,
  quote: Quote,
};
export function CategoryIcon({ name, size = 20 }: { name: string; size?: number }) {
  const Icon = icons[name] || Sparkles;
  return <Icon size={size} strokeWidth={2} />;
}
function Countdown() {
  const [time, setTime] = useState('00:00 UTC');
  useEffect(() => {
    const tick = () => {
      const next = new Date();
      next.setUTCHours(24, 0, 0, 0);
      const seconds = Math.floor((next.valueOf() - Date.now()) / 1000);
      setTime(
        `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
      );
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <span className="reset-clock">
      <Clock3 size={18} />
      <span>
        Next drop <strong>{time}</strong>
      </span>
    </span>
  );
}
export function ChallengeTile({
  challenge,
  eager = false,
}: {
  challenge: Challenge;
  eager?: boolean;
}) {
  const { records } = useProgress();
  const result = records.find((record) => record.key === challenge.key);
  const fallback = (
    <div className="tile-fallback" aria-hidden="true">
      <CategoryIcon name={challenge.mode.icon} size={100} />
      <span>
        {challenge.mode.slug === 'quote'
          ? 'WHO SAID IT?'
          : challenge.mode.slug === 'classic'
            ? 'KNOW YOUR FACTS?'
            : 'READY PLAYER?'}
      </span>
    </div>
  );
  return (
    <Link href={`/play/${challenge.key}`} className={`challenge-tile tile-${challenge.mode.slug}`}>
      <div className="tile-visual">
        {challenge.mode.slug !== 'quote' ? (
          <LoadingImage
            className="tile-image"
            src={challenge.previewUrl || `/api/challenges/${challenge.key}/preview`}
            alt=""
            fill
            sizes="(max-width: 600px) 76vw, (max-width: 1100px) 40vw, (min-width: 1500px) 24vw, 30vw"
            loading={eager ? 'eager' : 'lazy'}
            fallback={fallback}
          />
        ) : (
          fallback
        )}
        <span className="tile-category">
          <CategoryIcon name={challenge.category.icon} size={17} />
          {challenge.category.name}
          {challenge.yearRange && ` · ${challenge.yearRange.from}–${challenge.yearRange.to}`}
        </span>
        <span className="tile-number">#{String(challenge.number).padStart(3, '0')}</span>
        <span className="tile-play" aria-hidden="true">
          <Play size={26} fill="currentColor" />
        </span>
        <div className="tile-overlay">
          <h3>{challenge.mode.name}</h3>
          <span>
            {result
              ? result.status === 'won'
                ? `${result.score} pts · Solved`
                : 'Completed'
              : `${challenge.attemptLimit} guesses`}
          </span>
        </div>
      </div>
    </Link>
  );
}
export function ChallengeCollection({
  data,
  title = 'Today’s lineup',
  description,
  initialCategory = 'all',
  headingLevel = 'h2',
  eagerImages = true,
}: {
  data: HubData;
  title?: string;
  description?: string;
  initialCategory?: string;
  headingLevel?: 'h1' | 'h2';
  eagerImages?: boolean;
}) {
  const Heading = headingLevel;
  const [category, setCategory] = useState(initialCategory);
  const [mode, setMode] = useState('all');
  const { range } = useYearRange();
  const [displayData, setDisplayData] = useState(data);
  const [rangeBusy, setRangeBusy] = useState(false);
  const [rangeError, setRangeError] = useState('');
  useEffect(() => {
    if (!range) {
      setDisplayData(data);
      setRangeBusy(false);
      setRangeError('');
      return;
    }
    let active = true;
    setRangeBusy(true);
    setRangeError('');
    const query = new URLSearchParams({
      date: data.date || data.challenges[0]?.releaseDate || new Date().toISOString().slice(0, 10),
      from: String(range.from),
      to: String(range.to),
    });
    fetchJson<HubData>(`/api/hub?${query}`)
      .then((result) => {
        if (active) setDisplayData(result);
      })
      .catch(() => {
        if (active) setRangeError('Could not load this year range. Try again shortly.');
      })
      .finally(() => {
        if (active) setRangeBusy(false);
      });
    return () => {
      active = false;
    };
  }, [range, data]);
  const active = data.categories.filter((value) => value.available);
  const challenges = displayData.challenges.filter(
    (challenge) =>
      (category === 'all' || challenge.category.slug === category) &&
      (mode === 'all' || challenge.mode.slug === mode)
  );
  return (
    <section className="collection" id="challenges">
      <div className="section-heading">
        <div>
          <Heading>{title}</Heading>
          {description && <p className="muted">{description}</p>}
        </div>
        <Countdown />
      </div>
      <div className="filter-row">
        <fieldset className="category-filters" aria-label="Filter categories">
          <button
            type="button"
            aria-pressed={category === 'all'}
            onClick={() => setCategory('all')}
          >
            All
          </button>
          {active.map((value) => (
            <button
              type="button"
              key={value.slug}
              aria-pressed={category === value.slug}
              onClick={() => setCategory(value.slug)}
            >
              <CategoryIcon name={value.icon} size={20} />
              {value.slug === 'television' ? 'TV' : value.slug === 'games' ? 'Games' : value.name}
            </button>
          ))}
        </fieldset>
        <label className="mode-select">
          <span className="sr-only">Game mode</span>
          <select value={mode} onChange={(event) => setMode(event.target.value)}>
            <option value="all">All modes</option>
            {data.modes.map((value) => (
              <option key={value.slug} value={value.slug}>
                {value.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <YearRangeControls />
      {rangeBusy ? (
        <div className="empty-state" role="status">
          <p>Loading this year range…</p>
        </div>
      ) : rangeError ? (
        <div className="empty-state">
          <p role="alert">{rangeError}</p>
        </div>
      ) : challenges.length ? (
        <div className="challenge-rows">
          {active
            .filter((value) =>
              challenges.some((challenge) => challenge.category.slug === value.slug)
            )
            .map((value, rowIndex) => (
              <section
                className="challenge-row"
                key={value.slug}
                aria-label={`${value.name} challenges`}
              >
                <div className="row-heading">
                  <h3>
                    <CategoryIcon name={value.icon} size={24} />
                    {value.slug === 'movies'
                      ? 'Movie challenges'
                      : value.slug === 'television'
                        ? 'One more episode'
                        : value.slug === 'games'
                          ? 'Enter player two'
                          : value.name}
                  </h3>
                  <Link
                    href={`/categories/${value.slug}`}
                    aria-label={`See all ${value.name} challenges`}
                  >
                    <ArrowRight size={22} />
                  </Link>
                </div>
                <div className="challenge-grid">
                  {challenges
                    .filter((challenge) => challenge.category.slug === value.slug)
                    .map((challenge, index) => (
                      <ChallengeTile
                        key={challenge.key}
                        challenge={challenge}
                        eager={eagerImages && rowIndex === 0 && index < 2}
                      />
                    ))}
                </div>
              </section>
            ))}
        </div>
      ) : (
        <div className="empty-state">
          <Layers size={36} />
          <h3>
            {range
              ? 'No puzzles in this year range yet.'
              : data.available
                ? 'No challenges here yet.'
                : 'The next drop is loading.'}
          </h3>
          <p>
            {range
              ? 'Try a wider range or choose All years.'
              : data.available
                ? 'Try another filter.'
                : 'Check back shortly.'}
          </p>
        </div>
      )}
    </section>
  );
}
export function HomeHub({ data }: { data: HubData }) {
  const progress = useProgress();
  const stats = statistics(progress.records);
  const achievements = earnedAchievements(progress.records, progress.definitions);
  const featured = data.challenges[0];
  return (
    <div className="page-shell home-shell">
      <section className="hero">
        <LoadingImage
          src="/brand/cinema.jpg"
          alt=""
          fill
          frameClassName="hero-backdrop"
          className="hero-backdrop-image"
          sizes="100vw"
          loading="eager"
          fetchPriority="high"
          fallback={<span aria-hidden="true" />}
        />
        <div className="hero-arcade" aria-hidden="true">
          <div className="arcade-orbit" />
          <Gamepad2 strokeWidth={1} />
          <span>INSERT CURIOSITY</span>
        </div>
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="live-dot" /> MOVIES. TV. GAMES.
          </p>
          <h1>
            PRESS PLAY.
            <br />
            <span>PROVE IT.</span>
          </h1>
          <p className="hero-description">Know the frame. Name the game.</p>
          <div className="hero-actions">
            <Link
              className="button button-primary"
              href={featured ? `/play/${featured.key}` : '/today'}
            >
              <Play size={22} fill="currentColor" /> Play today
            </Link>
            <Link className="button button-secondary" href="#challenges">
              Browse challenges <ArrowRight size={20} />
            </Link>
          </div>
        </div>
        <div className="hero-bottom">
          <span>
            <span className="live-dot" /> DAILY DROP
          </span>
          <span>{String(data.challenges.length).padStart(2, '0')} CHALLENGES</span>
        </div>
      </section>
      <div className="daily-strip">
        <span>
          <Flame size={23} />
          <strong>{stats.currentStreak}</strong> day streak
        </span>
        <span>New puzzles. Every day.</span>
        <Link href="/statistics">
          Your stats <ArrowUpRight size={20} />
        </Link>
      </div>
      <ChallengeCollection data={data} eagerImages={false} />
      <Link href="/archive" className="archive-banner">
        <div>
          <span className="eyebrow">MISSED A DROP?</span>
          <h2>The archive awaits.</h2>
        </div>
        <span className="archive-banner-action">
          Keep playing <ArrowRight size={24} />
        </span>
      </Link>
      {achievements.length > 0 && (
        <section className="achievement-strip">
          <span className="eyebrow">ACHIEVEMENTS UNLOCKED</span>
          {achievements.slice(-3).map((achievement) => (
            <span key={achievement.slug}>
              <Sparkles size={20} />
              {achievement.name}
            </span>
          ))}
        </section>
      )}
    </div>
  );
}
