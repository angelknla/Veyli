'use client';
import { useEffect, useSyncExternalStore } from 'react';
import { z } from 'zod';
import { type Completion, completionSchema, type GameState } from '@/features/game/contracts';
import type { AchievementDefinition } from './compute';

const KEY = 'veyli.progress.v1';
type Snapshot = {
  records: Completion[];
  definitions: AchievementDefinition[];
  storageAvailable: boolean;
  online: boolean;
};
const empty: Snapshot = { records: [], definitions: [], storageAvailable: true, online: false };
let snapshot = empty;
let initialized = false;
const listeners = new Set<() => void>();
function publish(next: Snapshot) {
  snapshot = next;
  for (const listener of listeners) listener();
}
function save() {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ records: snapshot.records, definitions: snapshot.definitions })
    );
  } catch {
    publish({ ...snapshot, storageAvailable: false });
  }
}
export async function syncProgress() {
  try {
    const response = await fetch('/api/statistics', { cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json();
    const records = z.array(completionSchema).parse(data.completions);
    const definitions = z
      .array(
        z.object({
          slug: z.string(),
          name: z.string(),
          description: z.string(),
          rule: z.object({ metric: z.string(), threshold: z.number().int() }),
        })
      )
      .parse(data.achievements);
    publish({
      ...snapshot,
      records: [
        ...new Map(
          [...snapshot.records, ...records].map((record) => [record.key, record])
        ).values(),
      ],
      definitions,
      online: true,
    });
    save();
  } catch {
    publish({ ...snapshot, online: false });
  }
}
function initialize() {
  if (initialized) return;
  initialized = true;
  try {
    const value = localStorage.getItem(KEY);
    if (value) {
      const data = JSON.parse(value);
      publish({
        ...snapshot,
        records: z.array(completionSchema).parse(data.records),
        definitions: Array.isArray(data.definitions) ? data.definitions : [],
      });
    }
  } catch {
    publish({ ...snapshot, storageAvailable: false });
  }
  void syncProgress();
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function useProgress() {
  const state = useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => empty
  );
  useEffect(initialize, []);
  return state;
}
export function recordCompletion(state: GameState) {
  if (state.status === 'in_progress' || !state.completedAt) return;
  initialize();
  const record: Completion = {
    key: state.challenge.key,
    category: state.challenge.category.slug,
    mode: state.challenge.mode.slug,
    releaseDate: state.challenge.releaseDate,
    completedAt: state.completedAt,
    status: state.status,
    attemptsUsed: state.attemptsUsed,
    score: state.score,
  };
  publish({
    ...snapshot,
    records: [
      ...new Map([...snapshot.records, record].map((entry) => [entry.key, entry])).values(),
    ],
  });
  save();
}
