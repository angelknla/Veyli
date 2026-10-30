'use client';
import { ArrowUpRight, Check, Copy, Download, Share2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { shareText } from '@/features/sharing/share';
import type { GameState } from '../contracts';
export default function Results({ state }: { state: GameState }) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => titleRef.current?.focus(), []);
  const [message, setMessage] = useState('');
  const [spoiler, setSpoiler] = useState(false);
  const images = useRef(new Map<string, Promise<Blob>>());
  const answer = state.answer!;
  const url = () => `${window.location.origin}/play/${state.challenge.key}`;
  function resultImage() {
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
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(shareText(state, url(), spoiler));
      setMessage('Result copied.');
    } catch {
      setMessage('Clipboard is unavailable. Use your device’s share menu.');
    }
  }
  async function share() {
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
  }
  async function download() {
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
  }
  return (
    <section className="results-panel" aria-labelledby="result-title">
      <div className="result-symbol">
        {state.status === 'won' ? <Check size={30} /> : <Sparkles size={30} />}
      </div>
      <p className="eyebrow">{state.status === 'won' ? 'MYSTERY SOLVED' : 'THE REVEAL'}</p>
      <h2 id="result-title" ref={titleRef} tabIndex={-1}>
        {state.status === 'won' ? 'You knew it.' : 'Now you know.'}
      </h2>
      <div className="answer-reveal">
        <span className="muted">THE ANSWER</span>
        <h3>
          {answer.title} <span>{answer.year}</span>
        </h3>
      </div>
      <div className="result-metrics">
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
        className="guess-blocks"
        role="img"
        aria-label={`${state.attemptsUsed} attempts, ${state.status === 'won' ? 'won' : 'lost'}`}
      >
        {state.guesses.map((guess, index) => (
          <span key={guess.slug} className={guess.correct ? 'block-win' : 'block-miss'}>
            {index + 1}
          </span>
        ))}
      </div>
      <div className="share-actions">
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
      <label className="spoiler-toggle">
        <input
          type="checkbox"
          checked={spoiler}
          onChange={(event) => setSpoiler(event.target.checked)}
        />
        Include the answer when sharing (spoiler)
      </label>
      <p role="status" className="status-message">
        {message}
      </p>
      <div className="result-next">
        <Link href="/today" className="text-link">
          Another mystery <ArrowUpRight size={17} />
        </Link>
        <Link href="/statistics" className="text-link">
          See your statistics <ArrowUpRight size={17} />
        </Link>
      </div>
      <details className="media-credits">
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
}
