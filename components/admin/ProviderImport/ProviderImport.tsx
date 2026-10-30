import { Search } from 'lucide-react';
import { useState } from 'react';
import fieldStyles from '@/components/admin/Fields/Fields.module.css';
import styles from '@/components/admin/ProviderImport/ProviderImport.module.css';
import { Button } from '@/components/ui/Button/Button';
import sharedStyles from '@/components/ui/Shared/Shared.module.css';
import type { AdminRecord, AdminSnapshot } from '@/features/admin/contracts';
import type { ProviderItem } from '@/features/entertainment/providers';
import { normalizeTitle } from '@/features/game/engine';

const ProviderImport = ({
  providers,
  snapshot,
  onImport,
}: {
  providers: Record<string, boolean>;
  snapshot: AdminSnapshot;
  onImport: (record: AdminRecord) => void;
}) => {
  const [provider, setProvider] = useState('tmdb');
  const [kind, setKind] = useState('movies');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<ProviderItem[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const search = async () => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(
        `/api/admin/providers?provider=${provider}&kind=${kind}&query=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error === 'provider_unconfigured'
            ? 'This provider needs credentials in the private environment.'
            : 'Provider unavailable. You can create this item manually.'
        );
      setItems(data.items);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Provider unavailable.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className={styles.providerImport}>
      <h2 className={fieldStyles.editorSectionTitle}>Import factual metadata</h2>
      <p className={fieldStyles.adminHelp}>
        Imports titles, dates and provenance. Artwork and copyrighted excerpts require separate
        rights review.
      </p>
      <form
        className={styles.providerForm}
        onSubmit={(event) => {
          event.preventDefault();
          void search();
        }}
      >
        <label>
          <span className={'sr-only'}>Metadata provider</span>
          <select
            value={provider}
            onChange={(event) => {
              setProvider(event.target.value);
              setKind(event.target.value === 'tmdb' ? 'movies' : 'games');
            }}
          >
            {Object.entries(providers).map(([name, enabled]) => (
              <option key={name} value={name}>
                {name.toUpperCase()}
                {enabled ? '' : ' (not configured)'}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={'sr-only'}>Provider category</span>
          <select value={kind} onChange={(event) => setKind(event.target.value)}>
            {snapshot.categories
              .filter((category) =>
                provider === 'tmdb'
                  ? ['movies', 'television'].includes(String(category.slug))
                  : category.slug === 'games'
              )
              .map((category) => (
                <option key={String(category.slug)} value={String(category.slug)}>
                  {String(category.name)}
                </option>
              ))}
          </select>
        </label>
        <input
          aria-label="Find an entertainment title"
          placeholder="Search metadata…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Button
          type="submit"
          variant="secondary"
          size="small"
          disabled={busy || query.trim().length < 2}
        >
          <Search size={15} />
          {busy ? 'Searching' : 'Search'}
        </Button>
      </form>
      {error && (
        <p className={sharedStyles.inlineError} role="alert">
          {error}
        </p>
      )}
      <div className={styles.providerResults}>
        {items.map((item) => (
          <button
            key={`${item.provider}-${item.providerId}`}
            type="button"
            onClick={() => {
              const category = snapshot.categories.find((value) => value.slug === item.category);
              if (!category) {
                setError('Create the matching category first.');
                return;
              }
              onImport({
                slug: `${normalizeTitle(item.title).replace(/ /g, '-')}-${item.year}`,
                title: item.title,
                release_year: item.year,
                category_id: category.id,
                synopsis: '',
                source_url: item.sourceUrl,
                aliases: item.aliases,
                active: true,
                provenance: {
                  provider: item.provider,
                  providerId: item.providerId,
                  importedAt: new Date().toISOString(),
                },
              });
              setItems([]);
            }}
          >
            {item.title} ({item.year}) · import into editor
          </button>
        ))}
      </div>
    </section>
  );
};

export default ProviderImport;
