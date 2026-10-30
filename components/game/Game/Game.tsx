'use client';

import { ArrowLeft, Check, HelpCircle, Quote as QuoteIcon, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import AnswerSearch from '@/components/game/AnswerSearch/AnswerSearch';
import Facts from '@/components/game/Facts/Facts';
import styles from '@/components/game/Game/Game.module.css';
import Results from '@/components/game/Results/Results';
import LoadingImage from '@/components/LoadingImage/LoadingImage';
import PageLoading from '@/components/layout/PageLoading/PageLoading';
import { Button } from '@/components/ui/Button/Button';
import buttonStyles from '@/components/ui/Button/Button.module.css';
import { Dialog } from '@/components/ui/Dialog/Dialog';
import { Dotted } from '@/components/ui/Dotted/Dotted';
import sharedStyles from '@/components/ui/Shared/Shared.module.css';
import { type CatalogueItem, type GameState, gameStateSchema } from '@/features/game/contracts';
import { recordCompletion } from '@/features/statistics/store';
import { fetchJson } from '@/lib/fetch-json';
import { cn } from '@/lib/utils';

const messages: Record<string, string> = {
  duplicate_answer: 'You’ve already tried that title. Pick another.',
  invalid_answer: 'Choose a valid title from this category.',
  game_complete: 'This round is already complete.',
  rate_limited: 'A little too fast. Please wait a minute and try again.',
  challenge_unavailable: 'This challenge is not available.',
  database_unavailable: 'The puzzles are temporarily unavailable. Please try again.',
};
const Game = ({ challengeKey }: { challengeKey: string }) => {
  const [state, setState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [selectedClue, setSelectedClue] = useState(0);
  const reduceMotion = useReducedMotion();
  const load = useCallback(
    async (isCurrent: () => boolean = () => true) => {
      try {
        const result = gameStateSchema.parse(await fetchJson(`/api/challenges/${challengeKey}`));
        if (!isCurrent()) return;
        setState(result);
        setSelectedClue(Math.max(0, result.clues.length - 1));
        recordCompletion(result);
        setError('');
      } catch (failure) {
        if (isCurrent())
          setError(
            failure instanceof Error
              ? messages[failure.message] || 'Could not load the round. Please try again.'
              : 'Could not load the round.'
          );
      } finally {
        if (isCurrent()) setLoading(false);
      }
    },
    [challengeKey]
  );
  useEffect(() => {
    let active = true;
    setLoading(true);
    void load(() => active);
    return () => {
      active = false;
    };
  }, [load]);
  useLayoutEffect(() => {
    // The round replaces a shorter loading view; keep its image at the top on arrival.
    if (!loading) window.scrollTo({ top: 0, behavior: 'instant' });
  }, [loading]);
  const guess = async (item: CatalogueItem) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/challenges/${challengeKey}/guess`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug: item.slug }),
      });
      const data = await response.json();
      if (!response.ok) {
        const message = messages[data.error] || 'Could not confirm the guess. Please try again.';
        if (data.error === 'game_complete' || data.error === 'duplicate_answer') await load();
        throw new Error(message);
      }
      const result = gameStateSchema.parse(data);
      setState(result);
      setSelectedClue(Math.max(0, result.clues.length - 1));
      recordCompletion(result);
    } catch (failure) {
      if (failure instanceof TypeError) {
        await load();
        setError(
          'The connection was interrupted. Your round has been checked; review the attempts before trying again.'
        );
      } else setError(failure instanceof Error ? failure.message : 'Could not confirm your guess.');
    } finally {
      setBusy(false);
    }
  };
  if (loading) return <PageLoading label="Setting the scene…" />;
  if (!state)
    return (
      <div className={cn(sharedStyles.pageShell, sharedStyles.narrowShell)}>
        <Link href="/" className={cn(sharedStyles.textLink, styles.textLink)}>
          <ArrowLeft size={17} />
          Back to today
        </Link>
        <div className={sharedStyles.emptyState}>
          <h1>
            <Dotted>The mystery will have to wait.</Dotted>
          </h1>
          <p role="alert">{error}</p>
          <Button
            onClick={() => {
              setLoading(true);
              void load();
            }}
          >
            Try again
          </Button>
        </div>
      </div>
    );
  const clue = state.clues[selectedClue] || state.clues[0];
  return (
    <div className={cn(sharedStyles.pageShell, styles.gameShell)}>
      <div className={styles.gameTopline}>
        <Link href="/" className={cn(sharedStyles.textLink, styles.textLink)}>
          <ArrowLeft size={16} />
          Today’s challenges
        </Link>
        <span>
          {state.challenge.releaseDate} / #{state.challenge.number}
        </span>
        <Dialog
          title="Follow your instincts."
          description={`${state.challenge.mode.name}: ${state.challenge.mode.description}`}
          trigger={
            <button
              className={buttonStyles.iconButton}
              type="button"
              aria-label="How to play this mode"
            >
              <HelpCircle size={20} />
            </button>
          }
        >
          <div className={styles.dialogBody}>
            <p>
              You have {state.challenge.attemptLimit} guesses. Search for a title and select a
              catalogue entry.
            </p>
            <p>
              {state.challenge.mode.progressive
                ? 'Each miss reveals more of the mystery.'
                : 'This mode uses one image throughout the round.'}{' '}
              A correct answer ends the round immediately.
            </p>
            <p>
              The fewer guesses you need, the more points you earn. You can revisit your finished
              round, but it scores once.
            </p>
            <p>Progress is saved automatically on this browser. No account is needed.</p>
          </div>
        </Dialog>
      </div>
      <div className={styles.gameHeading}>
        <p className={cn(sharedStyles.eyebrow, styles.eyebrow)}>
          {state.challenge.category.name.toUpperCase()} / {state.challenge.difficulty.toUpperCase()}
        </p>
        <h1>
          {state.challenge.mode.name}
          <span className={sharedStyles.brandDot}>.</span>
        </h1>
        <p>{state.challenge.mode.description}</p>
      </div>
      <div
        data-mode={state.challenge.mode.slug}
        data-finished={state.status !== 'in_progress'}
        className={cn(
          styles.gameLayout,
          state.challenge.mode.slug === 'classic' ? styles.gameLayoutClassic : undefined,
          state.status === 'in_progress' ? styles.gameLayoutActive : styles.gameLayoutFinished
        )}
      >
        <section className={styles.clueSection} aria-label="Revealed clues">
          {state.challenge.mode.slug === 'classic' ? (
            <div className={styles.classicClues}>
              {state.clues[0]?.imageUrl && (
                <div
                  className={cn(styles.clueStage, styles.classicFrame)}
                  data-testid="clue-stage classic-frame"
                >
                  <LoadingImage
                    src={state.clues[0].imageUrl}
                    alt="The frame for this mystery"
                    fill
                    sizes="(max-width: 850px) 92vw, (max-width: 1100px) 50vw, 58vw"
                    loading="eager"
                    fetchPriority="high"
                  />
                </div>
              )}
            </div>
          ) : (
            <>
              <AnimatePresence mode="wait">
                <motion.div
                  key={clue?.imageUrl || clue?.position}
                  className={cn(
                    styles.clueStage,
                    clue?.kind === 'image' ? styles.clueImage : styles.clueWords
                  )}
                  data-testid={`clue-stage ${clue?.kind === 'image' ? 'clue-image' : 'clue-words'}`}
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  {clue?.kind === 'image' && clue.imageUrl ? (
                    <LoadingImage
                      src={clue.imageUrl}
                      alt={`Visual clue ${clue.position} for this entertainment mystery`}
                      fill
                      sizes="(max-width: 850px) 92vw, (max-width: 1100px) 50vw, 58vw"
                      loading="eager"
                      fetchPriority="high"
                    />
                  ) : (
                    <div>
                      <QuoteIcon size={34} />
                      <blockquote>{clue?.text}</blockquote>
                      <span>
                        {clue?.kind === 'quote'
                          ? 'A line from the source'
                          : 'A little more context'}
                      </span>
                    </div>
                  )}
                  <span className={styles.clueCaption}>
                    CLUE {clue?.position || 1} / {state.clues.length} REVEALED
                  </span>
                </motion.div>
              </AnimatePresence>
              <fieldset className={styles.clueNavigation} aria-label="Choose a revealed clue">
                {state.clues.map((value, index) => (
                  <button
                    key={value.position}
                    type="button"
                    aria-label={`Show clue ${value.position}`}
                    aria-pressed={selectedClue === index}
                    onClick={() => {
                      setSelectedClue(index);
                    }}
                  >
                    {String(value.position).padStart(2, '0')}
                  </button>
                ))}
                {state.status === 'in_progress' && (
                  <span>
                    {state.challenge.mode.slug === 'one-frame'
                      ? 'The block shrinks after a miss.'
                      : state.challenge.mode.progressive
                        ? 'More clues after a miss.'
                        : 'One frame. Make it count.'}
                  </span>
                )}
              </fieldset>
            </>
          )}
        </section>
        <div className={styles.gameControls}>
          {state.status === 'in_progress' ? (
            <>
              <div className={styles.attemptSummary}>
                <span>THE ROUND</span>
                <strong>{state.challenge.attemptLimit - state.attemptsUsed} guesses left</strong>
              </div>
              <div
                className={styles.attemptDots}
                role="img"
                aria-label={`${state.attemptsUsed} of ${state.challenge.attemptLimit} attempts used`}
              >
                {Array.from({ length: state.challenge.attemptLimit }, (_, index) => (
                  <span
                    key={index}
                    className={index < state.attemptsUsed ? styles.used : undefined}
                  >
                    {index + 1}
                  </span>
                ))}
              </div>
              <AnswerSearch
                category={state.challenge.category.slug}
                guessed={state.guesses.map((value) => value.slug)}
                busy={busy}
                onGuess={guess}
              />
              {error && (
                <p role="alert" className={cn(sharedStyles.inlineError, styles.inlineError)}>
                  {error}
                </p>
              )}
              <div className={styles.guessHistory} data-testid="guess-history" aria-live="polite">
                <span className={cn(sharedStyles.eyebrow, styles.eyebrow)}>YOUR GUESSES</span>
                {state.guesses.length ? (
                  <ol
                    className={styles.guessHistoryList}
                    aria-label="Previous guesses"
                    // biome-ignore lint/a11y/noNoninteractiveTabindex: The scrollable guess history needs keyboard access.
                    tabIndex={0}
                  >
                    {[...state.guesses].reverse().map((value) => (
                      <li key={value.slug}>
                        <span>
                          {value.title}
                          <small>{value.year}</small>
                        </span>
                        {value.correct ? <Check size={18} /> : <X size={18} />}
                        <span className={'sr-only'}>
                          {value.correct ? 'Correct guess.' : 'Incorrect guess.'}
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className={sharedStyles.muted}>Your move.</p>
                )}
              </div>
            </>
          ) : (
            <Results state={state} />
          )}
          {state.challenge.mode.slug === 'classic' && <Facts state={state} />}
        </div>
      </div>
    </div>
  );
};

export default Game;
