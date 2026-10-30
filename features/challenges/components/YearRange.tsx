'use client';
import { CalendarRange } from 'lucide-react';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { type YearRange, yearRangeSchema } from '../years';

const Context = createContext<{
  range: YearRange | null;
  setRange: (range: YearRange | null) => void;
}>({ range: null, setRange: () => {} });
const key = 'veyli:year-range';
export function YearRangeProvider({ children }: { children: ReactNode }) {
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
  function setRange(value: YearRange | null) {
    update((current) =>
      current?.from === value?.from && current?.to === value?.to ? current : value
    );
    try {
      if (value) localStorage.setItem(key, JSON.stringify(value));
      else localStorage.removeItem(key);
    } catch {}
  }
  return <Context value={{ range, setRange }}>{children}</Context>;
}
export const useYearRange = () => useContext(Context);
export default function YearRangeControls() {
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
      className="year-range"
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
      <span className="year-range-label">
        <CalendarRange size={20} />
        Years
      </span>
      <label>
        <span className="sr-only">From</span>
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
      <span aria-hidden="true" className="year-range-divider">
        —
      </span>
      <label>
        <span className="sr-only">To</span>
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
      <button type="submit" className="button button-small button-secondary">
        Apply
      </button>
      <button
        type="button"
        className={`button button-small ${range ? 'button-ghost' : 'button-primary'}`}
        onClick={() => {
          setError('');
          setRange(null);
        }}
      >
        All years
      </button>
      {range && (
        <span className="range-active" role="status">
          {range.from}–{range.to}
        </span>
      )}
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
