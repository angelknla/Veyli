'use client';

import { CalendarRange } from 'lucide-react';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import styles from '@/components/challenges/YearRange/YearRange.module.css';
import buttonStyles from '@/components/ui/Button/Button.module.css';
import sharedStyles from '@/components/ui/Shared/Shared.module.css';
import { type YearRange, yearRangeSchema } from '@/features/challenges/years';
import { cn } from '@/lib/utils';

const Context = createContext<{
  range: YearRange | null;
  setRange: (range: YearRange | null) => void;
}>({ range: null, setRange: () => {} });
const key = 'veyli:year-range';
export const YearRangeProvider = ({ children }: { children: ReactNode }) => {
  const [range, update] = useState<YearRange | null>(null);
  useEffect(() => {
    try {
      const value = localStorage.getItem(key);
      if (value) {
        const parsed = yearRangeSchema.safeParse(JSON.parse(value));
        if (parsed.success) update(parsed.data);
      }
    } catch {}
  }, []);
  const setRange = (value: YearRange | null) => {
    update((current) =>
      current?.from === value?.from && current?.to === value?.to ? current : value
    );
    try {
      if (value) localStorage.setItem(key, JSON.stringify(value));
      else localStorage.removeItem(key);
    } catch {}
  };
  return <Context value={{ range, setRange }}>{children}</Context>;
};
export const useYearRange = () => useContext(Context);
const YearRangeControls = () => {
  const { range, setRange } = useYearRange();
  const currentYear = new Date().getUTCFullYear();
  const [from, setFrom] = useState('2000');
  const [to, setTo] = useState(String(currentYear));
  const [error, setError] = useState('');
  useEffect(() => {
    if (range) {
      setFrom(String(range.from));
      setTo(String(range.to));
    }
  }, [range]);
  return (
    <form
      className={styles.yearRange}
      aria-label="Challenge year range"
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = yearRangeSchema.safeParse({ from: Number(from), to: Number(to) });
        if (!parsed.success) {
          setError(`Choose years from 1800 to ${currentYear}, with the start before the end.`);
          return;
        }
        setError('');
        setRange(parsed.data);
      }}
    >
      <span className={styles.yearRangeLabel}>
        <CalendarRange size={20} />
        Years
      </span>
      <label>
        <span className={'sr-only'}>From</span>
        <input
          type="number"
          min={1800}
          max={currentYear}
          required
          value={from}
          onChange={(event) => setFrom(event.target.value)}
          aria-label="From year"
        />
      </label>
      <span aria-hidden="true" className={styles.yearRangeDivider}>
        —
      </span>
      <label>
        <span className={'sr-only'}>To</span>
        <input
          type="number"
          min={1800}
          max={currentYear}
          required
          value={to}
          onChange={(event) => setTo(event.target.value)}
          aria-label="To year"
        />
      </label>
      <button
        type="submit"
        className={cn(buttonStyles.button, buttonStyles.buttonSmall, buttonStyles.buttonSecondary)}
      >
        Apply
      </button>
      <button
        type="button"
        className={cn(
          buttonStyles.button,
          buttonStyles.buttonSmall,
          range ? buttonStyles.buttonGhost : buttonStyles.buttonPrimary
        )}
        onClick={() => {
          setError('');
          setRange(null);
        }}
      >
        All years
      </button>
      {range && (
        <span className={styles.rangeActive} role="status">
          {range.from}–{range.to}
        </span>
      )}
      {error && (
        <p className={cn(sharedStyles.inlineError, styles.inlineError)} role="alert">
          {error}
        </p>
      )}
    </form>
  );
};

export default YearRangeControls;
