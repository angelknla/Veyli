'use client';
import { Eye, Plus, Save } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { AdminRecord, AdminSnapshot, Entity } from '../contracts';
import Preview from './Preview';
import ProviderImport from './ProviderImport';
import RecordEditor from './RecordEditor';

const collections: Record<
  Entity,
  keyof Pick<AdminSnapshot, 'categories' | 'modes' | 'items' | 'media' | 'challenges'>
> = {
  category: 'categories',
  mode: 'modes',
  item: 'items',
  media: 'media',
  challenge: 'challenges',
};
function blank(entity: Entity, snapshot: AdminSnapshot): AdminRecord {
  const category = snapshot.categories[0];
  const mode = snapshot.modes[0];
  if (entity === 'item')
    return {
      slug: '',
      title: '',
      category_id: category?.id,
      release_year: 2026,
      synopsis: '',
      source_url: '',
      aliases: [],
      active: true,
    };
  if (entity === 'category')
    return {
      slug: '',
      name: '',
      description: '',
      accent: '#ff3045',
      icon: 'sparkles',
      active: false,
      position: snapshot.categories.length,
    };
  if (entity === 'mode')
    return {
      slug: '',
      name: '',
      description: '',
      icon: 'layers',
      active: false,
      initial_clues: 1,
      clues_per_miss: 1,
      default_attempts: 8,
      default_scores: [1000, 800, 650, 500, 400, 300, 200, 100],
      position: snapshot.modes.length,
    };
  if (entity === 'media')
    return {
      slug: '',
      kind: 'image',
      storage_path: null,
      quote_text: null,
      author: '',
      license: '',
      license_url: '',
      source_url: '',
      approved: false,
    };
  return {
    category_id: category?.id,
    mode_id: mode?.id,
    answer_id: snapshot.items.find((item) => item.category_id === category?.id)?.id,
    accepted_answer_ids: [],
    release_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    status: 'draft',
    difficulty: 'medium',
    attempt_limit: mode?.default_attempts || 8,
    scores: mode?.default_scores || [1000, 800, 650, 500, 400, 300, 200, 100],
    clues: [
      {
        position: 1,
        kind: 'image',
        media_id: snapshot.media.find((media) => media.kind === 'image' && media.approved)?.id,
        text_content: null,
        presentation: 'full',
        blur_amount: 0,
        crop_percent: 100,
      },
    ],
  };
}
export default function Admin({
  initial,
  providers,
}: {
  initial: AdminSnapshot;
  providers: Record<string, boolean>;
}) {
  const [snapshot, setSnapshot] = useState(initial);
  const [entity, setEntity] = useState<Entity>('challenge');
  const [record, setRecord] = useState<AdminRecord>(
    initial.challenges[0] || blank('challenge', initial)
  );
  const [filter, setFilter] = useState('');
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const records = snapshot[collections[entity]].filter((value) =>
    String(value.title || value.name || value.public_key || value.slug)
      .toLowerCase()
      .includes(filter.toLowerCase())
  );
  function change(name: string, value: unknown) {
    setRecord((current) => ({ ...current, [name]: value }));
    setMessage('');
  }
  async function refreshSources() {
    setBusy(true);
    setError('');
    setMessage('Importing sources and refreshing upcoming puzzles…');
    try {
      const response = await fetch('/api/admin/sync', { method: 'POST' });
      const report = await response.json();
      if (!response.ok)
        throw new Error('Source sync unavailable. Existing puzzles are still playable.');
      const refreshed = await fetch('/api/admin/snapshot');
      if (refreshed.ok) setSnapshot(await refreshed.json());
      setMessage(
        `${report.catalogue} source titles synced · ${report.scheduled} upcoming rounds scheduled${report.unavailable?.length ? ` · Unavailable sources: ${report.unavailable.join(', ')}` : ''}`
      );
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Source sync failed.');
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/admin/save', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ entity, payload: record }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.issues
            ?.map((issue: { path: string; message: string }) => `${issue.path}: ${issue.message}`)
            .join(' · ') ||
            (data.error === 'content_locked'
              ? 'A played challenge or reveal rule cannot be edited. Schedule a new round instead.'
              : data.error === 'content_conflict'
                ? 'This slug or daily category/mode already exists. Choose a different value.'
                : 'Could not save. Check references and try again.')
        );
      const refresh = await fetch('/api/admin/snapshot', { cache: 'no-store' });
      if (!refresh.ok)
        throw new Error(
          'Saved, but the studio could not refresh. Reload to check the saved content.'
        );
      const next = (await refresh.json()) as AdminSnapshot;
      setSnapshot(next);
      setRecord(next[collections[entity]].find((value) => value.id === data.id) || record);
      setMessage('Saved. Public challenges release according to the UTC server clock.');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }
  async function lifecycle() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/admin/lifecycle', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: record.id, status: record.status }),
      });
      if (!response.ok)
        throw new Error('Could not update lifecycle. Played rounds cannot become drafts.');
      setMessage('Lifecycle updated; game rules are unchanged.');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not update lifecycle.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page-shell admin-shell">
      <header className="admin-heading">
        <div>
          <p className="eyebrow">PROTECTED INTERNAL WORKSPACE</p>
          <h1>The content studio.</h1>
        </div>
        <Button variant="secondary" size="small" disabled={busy} onClick={refreshSources}>
          {busy ? 'Working…' : 'Refresh sources'}
        </Button>
      </header>
      <div className="stats-grid">
        {[
          { label: 'Anonymous players', value: snapshot.analytics.players },
          { label: 'Rounds started', value: snapshot.analytics.games },
          { label: 'Completed rounds', value: snapshot.analytics.completed },
          {
            label: 'Win rate',
            value: `${snapshot.analytics.completed ? Math.round((snapshot.analytics.wins / snapshot.analytics.completed) * 100) : 0}%`,
          },
        ].map((metric) => (
          <div key={metric.label}>
            <div className="stat-number">{metric.value}</div>
            <div className="stat-label">{metric.label}</div>
          </div>
        ))}
      </div>
      <nav className="admin-tabs" aria-label="Content collections">
        {(Object.keys(collections) as Entity[]).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={entity === value}
            onClick={() => {
              setEntity(value);
              setRecord(snapshot[collections[value]][0] || blank(value, snapshot));
              setFilter('');
              setPreview(false);
              setError('');
              setMessage('');
            }}
          >
            {collections[value]}
          </button>
        ))}
      </nav>
      {entity === 'item' && (
        <ProviderImport
          providers={providers}
          snapshot={snapshot}
          onImport={(value) => {
            setRecord(value);
            setError('');
            setMessage('Review the imported metadata and write an original summary before saving.');
          }}
        />
      )}
      <div className="admin-layout">
        <aside>
          <Button
            variant="secondary"
            size="small"
            onClick={() => {
              setRecord(blank(entity, snapshot));
              setError('');
              setPreview(false);
            }}
          >
            <Plus size={15} />
            New {entity}
          </Button>
          <input
            className="editor-list-search"
            aria-label={`Filter ${collections[entity]}`}
            placeholder="Filter this collection…"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
          <div className="admin-sidebar">
            {records.map((value) => (
              <button
                key={String(value.id)}
                type="button"
                className={record.id === value.id ? 'selected' : ''}
                onClick={() => {
                  setRecord(value);
                  setPreview(false);
                  setError('');
                  setMessage('');
                }}
              >
                {String(value.title || value.name || value.public_key || value.slug)}
                <small>
                  {value.release_year
                    ? String(value.release_year)
                    : value.release_date
                      ? `${value.release_date} · ${value.status}`
                      : value.approved
                        ? 'Rights approved'
                        : value.active
                          ? 'Active'
                          : ''}
                </small>
              </button>
            ))}
          </div>
        </aside>
        <section className="admin-editor" aria-label={`${entity} editor`}>
          {Boolean(record.played) && (
            <p className="editor-warning">
              This challenge has been played. Its content is locked; create a new daily round to
              change it.
            </p>
          )}
          <RecordEditor
            key={`${entity}-${record.id || 'new'}`}
            entity={entity}
            record={record}
            snapshot={snapshot}
            onChange={change}
          />
          <div className="editor-actions">
            {Boolean(record.played) && (
              <Button disabled={busy} variant="secondary" onClick={() => void lifecycle()}>
                Update lifecycle only
              </Button>
            )}
            <Button disabled={busy || Boolean(record.played)} onClick={() => void save()}>
              <Save size={16} />
              {busy ? 'Saving…' : `Save ${entity}`}
            </Button>
            {entity === 'challenge' && (
              <Button variant="secondary" onClick={() => setPreview((value) => !value)}>
                <Eye size={16} />
                {preview ? 'Hide preview' : 'Preview clues'}
              </Button>
            )}
          </div>
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
          <p className="status-message" role="status">
            {message}
          </p>
          {preview && entity === 'challenge' && <Preview record={record} snapshot={snapshot} />}
        </section>
      </div>
      <p className="admin-help">
        Future rounds stay private until their UTC release date. Publish only content with recorded,
        reviewed media rights. Challenge answers, attempts, scores and reveal rules become immutable
        once played.
      </p>
    </div>
  );
}
