'use client';

import { ArrowUpRight, Check, Copy, Download, Share2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import relatedStyles2 from '@/components/admin/Admin/Admin.module.css';
import styles from '@/components/game/Results/Results.module.css';
import { Button } from '@/components/ui/Button/Button';
import { Dotted } from '@/components/ui/Dotted/Dotted';
import sharedStyles from '@/components/ui/Shared/Shared.module.css';
import type { GameState } from '@/features/game/contracts';
import { shareText } from '@/features/sharing/share';

const Results = ({ state }: { state: GameState }) => {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => titleRef.current?.focus(), []);
  const [message, setMessage] = useState('');
  const [spoiler, setSpoiler] = useState(false);
  const images = useRef(new Map<string, Promise<Blob>>());
  const answer = state.answer!;
  const url = () => `${window.location.origin}/play/${state.challenge.key}`;
  const resultImage = () => {
    const path = `/api/share/${state.challenge.key}${spoiler ? '?spoiler=true' : ''}`;
    const existing = images.current.get(path);
    if (existing) return existing;
    const promise = fetch(path)
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.blob();
      })
      .catch((error) => {
        images.current.delete(path);
        throw error;
      });
    images.current.set(path, promise);
    return promise;
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareText(state, url(), spoiler));
      setMessage('Result copied.');
    } catch {
      setMessage('Clipboard is unavailable. Use your device’s share menu.');
    }
  };
  const share = async () => {
    try {
      const filename = `veyli-${state.challenge.key}.png`;
      if (navigator.canShare?.({ files: [new File([], filename, { type: 'image/png' })] })) {
        const file = new File([await resultImage()], filename, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], text: shareText(state, url(), spoiler) });
          return;
        }
      }
      if (navigator.share)
        await navigator.share({ text: shareText(state, url(), spoiler), url: url() });
      else await copy();
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError'))
        setMessage('Sharing is unavailable. You can copy the result instead.');
    }
  };
  const download = async () => {
    try {
      const objectUrl = URL.createObjectURL(await resultImage());
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `veyli-${state.challenge.key}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      setMessage('Result image downloaded.');
    } catch {
      setMessage('Could not generate the result image. Please try again.');
    }
  };
  return (
    <section className={styles.resultsPanel} aria-labelledby="result-title">
      <div className={styles.resultSymbol}>
        {state.status === 'won' ? <Check size={30} /> : <Sparkles size={30} />}
      </div>
      <p className={sharedStyles.eyebrow}>
        {state.status === 'won' ? 'MYSTERY SOLVED' : 'THE REVEAL'}
      </p>
      <h2 id="result-title" ref={titleRef} tabIndex={-1}>
        <Dotted>{state.status === 'won' ? 'You knew it.' : 'Now you know.'}</Dotted>
      </h2>
      <div className={styles.answerReveal} data-testid="answer-reveal">
        <span className={sharedStyles.muted}>THE ANSWER</span>
        <h3>
          {answer.title} <span>{answer.year}</span>
        </h3>
      </div>
      <div className={styles.resultMetrics} data-testid="result-metrics">
        <div>
          <strong>{state.score.toLocaleString()}</strong>
          <span>points earned</span>
        </div>
        <div>
          <strong>
            {state.attemptsUsed}/{state.challenge.attemptLimit}
          </strong>
          <span>guesses used</span>
        </div>
        <div>
          <strong>#{state.challenge.number}</strong>
          <span>daily challenge</span>
        </div>
      </div>
      <div
        className={styles.guessBlocks}
        role="img"
        aria-label={`${state.attemptsUsed} attempts, ${state.status === 'won' ? 'won' : 'lost'}`}
      >
        {state.guesses.map((guess, index) => (
          <span key={guess.slug} className={guess.correct ? styles.blockWin : styles.blockMiss}>
            {index + 1}
          </span>
        ))}
      </div>
      <div className={styles.shareActions}>
        <Button onClick={() => void share()}>
          <Share2 size={17} />
          Share result
        </Button>
        <Button variant="secondary" onClick={() => void copy()}>
          <Copy size={17} />
          Copy
        </Button>
        <Button variant="ghost" onClick={() => void download()} aria-label="Download result image">
          <Download size={18} />
        </Button>
      </div>
      <label className={styles.spoilerToggle}>
        <input
          type="checkbox"
          checked={spoiler}
          onChange={(event) => setSpoiler(event.target.checked)}
        />
        Include the answer when sharing (spoiler)
      </label>
      <p role="status" className={relatedStyles2.statusMessage}>
        {message}
      </p>
      <div className={styles.resultNext}>
        <Link href="/" className={sharedStyles.textLink}>
          Another mystery <ArrowUpRight size={17} />
        </Link>
        <Link href="/statistics" className={sharedStyles.textLink}>
          See your statistics <ArrowUpRight size={17} />
        </Link>
      </div>
      <details className={styles.mediaCredits}>
        <summary>About the answer & media credits</summary>
        <p>Images are resized for Veyli. Puzzle versions may add a crop, blur or central cover.</p>
        <p>{answer.synopsis}</p>
        <a href={answer.sourceUrl} target="_blank" rel="noreferrer">
          Read about {answer.title}
        </a>
        {answer.credits.map((credit) => (
          <p key={credit.sourceUrl}>
            {credit.author} · {credit.license} ·{' '}
            <a href={credit.sourceUrl} target="_blank" rel="noreferrer">
              Source
            </a>
            {credit.licenseUrl && (
              <>
                {' '}
                ·{' '}
                <a href={credit.licenseUrl} target="_blank" rel="noreferrer">
                  Licence
                </a>
              </>
            )}
          </p>
        ))}
      </details>
    </section>
  );
};

export default Results;
