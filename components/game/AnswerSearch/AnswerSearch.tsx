'use client';

import { ArrowUpRight, LoaderCircle, Search } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import styles from '@/components/game/AnswerSearch/AnswerSearch.module.css';
import { Button } from '@/components/ui/Button/Button';
import sharedStyles from '@/components/ui/Shared/Shared.module.css';
import { cachedTitles, findTitles } from '@/features/game/catalogue-client';
import type { CatalogueItem } from '@/features/game/contracts';

const AnswerSearch = ({
  category,
  guessed,
  busy,
  onGuess,
}: {
  category: string;
  guessed: string[];
  busy: boolean;
  onGuess: (item: CatalogueItem) => Promise<void>;
}) => {
  const id = useId();
  const container = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<CatalogueItem[]>([]);
  const [selected, setSelected] = useState<CatalogueItem | null>(null);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (open && items.length)
      document.getElementById(`${id}-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open, items, id]);
  useEffect(() => {
    if (!query.trim() || selected) {
      setItems([]);
      setLoading(false);
      return;
    }
    const cached = cachedTitles(category, query);
    setItems(cached?.items || []);
    setActive(0);
    if (cached && !cached.more) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(
      async () => {
        try {
          await findTitles(category, query, controller.signal, (items) => {
            setItems(items);
          });
        } catch {
          if (!controller.signal.aborted)
            setError('Search is temporarily unavailable. Please try again.');
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      },
      cached ? 0 : 120
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, category, selected]);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);
  const submit = async (item: CatalogueItem | null) => {
    if (!item) {
      setError('Choose a title from the suggestions.');
      return;
    }
    if (guessed.includes(item.slug)) {
      setError('You have already tried that title. Choose another.');
      return;
    }
    setOpen(false);
    await onGuess(item);
    setQuery('');
    setSelected(null);
    setItems([]);
  };
  return (
    <div className={styles.answerSearch} ref={container}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit(selected || (open ? items[active] || null : null));
        }}
      >
        <label className={styles.answerLabel} htmlFor={id}>
          What’s your guess?
        </label>
        <div className={styles.searchControl}>
          <Search size={20} />
          <input
            id={id}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open && !selected && query.trim().length > 0}
            aria-controls={`${id}-suggestions`}
            aria-activedescendant={open && items[active] ? `${id}-${active}` : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            autoComplete="off"
            placeholder="Search for a title…"
            value={query}
            disabled={busy}
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelected(null);
              setOpen(true);
              setError('');
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setOpen(true);
                setActive((index) => Math.min(index + 1, items.length - 1));
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActive((index) => Math.max(0, index - 1));
              } else if (event.key === 'Escape') setOpen(false);
            }}
          />
          {loading && <LoaderCircle className={'spin'} data-testid="spin" size={18} />}
          <Button type="submit" disabled={busy || !query.trim()}>
            {busy ? (
              <>
                <LoaderCircle className={'spin'} data-testid="spin" size={17} />
                <span>Checking…</span>
              </>
            ) : (
              <>
                Guess <ArrowUpRight size={17} />
              </>
            )}
          </Button>
        </div>
        {open && !selected && query.trim() && (
          <div
            tabIndex={-1}
            id={`${id}-suggestions`}
            className={styles.suggestions}
            role="listbox"
            aria-label="Title suggestions"
          >
            {items.map((item, index) => (
              <div
                tabIndex={-1}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    void submit(items[active] || null);
                  }
                }}
                id={`${id}-${index}`}
                key={item.slug}
                role="option"
                aria-selected={active === index}
                aria-disabled={guessed.includes(item.slug)}
                onPointerMove={() => setActive(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setSelected(item);
                  setQuery(item.title);
                  setOpen(false);
                  setError('');
                }}
              >
                <span>{item.title}</span>
                <span>{guessed.includes(item.slug) ? 'Already guessed' : item.year}</span>
              </div>
            ))}
            {!items.length && (
              <div className={styles.searchMessage} role="status">
                {loading ? 'Searching the catalogue…' : 'No titles found. Try an alternative name.'}
              </div>
            )}
          </div>
        )}
      </form>
      <p className={styles.searchHelp}>Select a title. Press Enter to guess.</p>
      {error && (
        <p className={sharedStyles.inlineError} id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default AnswerSearch;
