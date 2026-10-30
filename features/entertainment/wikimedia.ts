import { z } from 'zod';
import {
  type SourceCategory,
  type SourceImage,
  type SourceTitle,
  sourceJson,
  validSourceTitle,
} from './source-client';

export function plainText(value: string) {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
export function permittedCommonsLicense(value: string) {
  return /^(CC0|Public domain|CC BY(?:-SA)?(?:\s|$))/i.test(value) && !/\bNC\b|\bND\b/i.test(value);
}
export async function commonsImage(file: string): Promise<SourceImage | null> {
  const filename = decodeURIComponent(file.split('/Special:FilePath/')[1] || file).replace(
    /^File:/,
    ''
  );
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.search = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    prop: 'imageinfo',
    titles: `File:${filename}`,
    iiprop: 'url|extmetadata',
    iiurlwidth: '1280',
  }).toString();
  const data = z
    .object({
      query: z.object({
        pages: z.array(
          z.object({
            imageinfo: z
              .array(
                z.object({
                  url: z.string(),
                  thumburl: z.string().optional(),
                  descriptionurl: z.string(),
                  extmetadata: z.record(z.string(), z.object({ value: z.coerce.string() })),
                })
              )
              .optional(),
          })
        ),
      }),
    })
    .parse(await sourceJson(url));
  const info = data.query.pages[0]?.imageinfo?.[0];
  if (!info) return null;
  const meta = info.extmetadata;
  const license = plainText(meta.LicenseShortName?.value || '');
  if (!permittedCommonsLicense(license) || meta.Restrictions?.value?.includes('nonfree'))
    return null;
  const download = info.thumburl || info.url;
  if (!['upload.wikimedia.org', 'thumb.wikimedia.org'].includes(new URL(download).hostname))
    return null;
  return {
    url: download,
    role: 'photo',
    policy: 'commons',
    sourceUrl: info.descriptionurl,
    author: plainText(
      meta.Artist?.value || meta.Credit?.value || 'Wikimedia Commons contributor'
    ).slice(0, 1000),
    license,
    licenseUrl: meta.LicenseUrl?.value || 'https://commons.wikimedia.org/wiki/Commons:Licensing',
  };
}
const binding = z.object({ value: z.string() });
const resultSchema = z.object({
  results: z.object({ bindings: z.array(z.record(z.string(), binding)) }),
});
type WikiEntity = {
  labels: Record<string, { value: string }>;
  aliases: Record<string, { value: string }[]>;
  claims: Record<string, { mainsnak: { datavalue?: { value: unknown } } }[]>;
};
async function entities(ids: string[]) {
  const result = new Map<string, WikiEntity>();
  for (let offset = 0; offset < ids.length; offset += 50) {
    const url = new URL('https://www.wikidata.org/w/api.php');
    url.search = new URLSearchParams({
      action: 'wbgetentities',
      format: 'json',
      ids: ids.slice(offset, offset + 50).join('|'),
      props: 'labels|aliases|claims',
      languages: 'en',
    }).toString();
    const data = z
      .object({
        entities: z.record(
          z.string(),
          z.object({
            labels: z.record(z.string(), z.object({ value: z.string() })).default({}),
            aliases: z.record(z.string(), z.array(z.object({ value: z.string() }))).default({}),
            claims: z
              .record(
                z.string(),
                z.array(
                  z.object({
                    mainsnak: z.object({ datavalue: z.object({ value: z.unknown() }).optional() }),
                  })
                )
              )
              .default({}),
          })
        ),
      })
      .parse(await sourceJson(url));
    for (const [id, entity] of Object.entries(data.entities)) result.set(id, entity);
  }
  return result;
}
function claimIds(entity: WikiEntity, property: string) {
  return (entity.claims[property] || []).slice(0, 3).flatMap((claim) => {
    const value = claim.mainsnak.datavalue?.value;
    return value && typeof value === 'object' && 'id' in value && typeof value.id === 'string'
      ? [value.id]
      : [];
  });
}
export async function discoverWikimedia(
  category: 'music' | 'pop-culture',
  limit = 60
): Promise<SourceTitle[]> {
  const selection =
    category === 'music'
      ? '?item wdt:P434 ?mbid; wdt:P2031 ?start; wdt:P18 ?image; wikibase:sitelinks ?links. FILTER(?links>100)'
      : '?item wdt:P31/wdt:P279* wd:Q95074; wdt:P18 ?image; wdt:P571 ?start; wikibase:sitelinks ?links. FILTER(?links>20)';
  // Keep the discovery query simple; labels/claims are fetched in bounded API batches.
  const query = `SELECT DISTINCT ?item ?start ?mbid ?image WHERE {${selection}} LIMIT ${Math.min(450, limit * 3)}`;
  const url = new URL('https://query.wikidata.org/sparql');
  url.search = new URLSearchParams({ query, format: 'json' }).toString();
  const rows = resultSchema.parse(await sourceJson(url, 45000)).results.bindings;
  const selected = [...new Map(rows.map((row) => [row.item.value, row])).values()].slice(0, limit);
  const metadata = await entities(selected.map((row) => row.item.value.split('/').pop()!));
  const properties: Record<string, string> =
    category === 'music'
      ? {
          P136: 'Genre',
          P27: 'Country',
          P264: 'Record label',
          P1303: 'Instruments',
          P106: 'Known for',
          P1412: 'Language',
          P166: 'Awards',
        }
      : {
          P170: 'Creator',
          P1080: 'Universe',
          P31: 'Character type',
          P21: 'Gender',
          P144: 'Based on',
          P106: 'Occupation',
          P495: 'Origin',
          P725: 'Voice actor',
        };
  const refs = [
    ...new Set(
      [...metadata.values()].flatMap((entity) =>
        Object.keys(properties).flatMap((property) => claimIds(entity, property))
      )
    ),
  ];
  const labels = await entities(refs);
  return selected.flatMap((row) => {
    const providerId = row.item.value.split('/').pop()!;
    const entity = metadata.get(providerId);
    const title = entity?.labels.en?.value;
    if (!entity || !title) return [];
    const year = Number(row.start.value.slice(0, 4));
    const facts = [
      { label: category === 'music' ? 'Career began' : 'First appearance', value: String(year) },
    ];
    for (const [property, label] of Object.entries(properties)) {
      const values = claimIds(entity, property)
        .map((id) => labels.get(id)?.labels.en?.value)
        .filter(Boolean);
      if (values.length) facts.push({ label, value: values.join(', ') });
    }
    const item: SourceTitle = {
      provider: 'wikidata',
      providerId,
      category,
      title,
      year,
      sourceUrl: `https://www.wikidata.org/wiki/${providerId}`,
      aliases: (entity.aliases.en || [])
        .map((alias) => alias.value)
        .filter((value) => value.length <= 200)
        .slice(0, 20),
      facts,
      images: [],
      relatedIds: {
        commonsFile: row.image.value,
        ...(row.mbid ? { musicbrainz: row.mbid.value } : {}),
      },
    };
    return validSourceTitle(item) ? [item] : [];
  });
}
export async function hydrateWikimediaTitle(item: SourceTitle): Promise<SourceTitle> {
  const file = item.relatedIds?.commonsFile;
  if (file) {
    try {
      const image = await commonsImage(file);
      if (image) item.images = [image, ...item.images.filter((value) => value.role === 'poster')];
    } catch {
      /* A missing artist photo does not prevent an available album cover. */
    }
  }
  const musicId = item.relatedIds?.musicbrainz;
  if (item.category === 'music' && musicId) {
    try {
      const url = new URL('https://musicbrainz.org/ws/2/release-group/');
      url.search = new URLSearchParams({
        query: `arid:${musicId} AND primarytype:album AND status:official`,
        fmt: 'json',
        limit: '100',
      }).toString();
      const data = z
        .object({
          count: z.number().optional(),
          'release-groups': z.array(
            z.object({
              id: z.string().optional(),
              title: z.string(),
              'first-release-date': z.string().optional(),
            })
          ),
        })
        .parse(await sourceJson(url));
      const first = data['release-groups']
        .filter((x) => /^\d{4}/.test(x['first-release-date'] || ''))
        .sort((a, b) =>
          (a['first-release-date'] || '').localeCompare(b['first-release-date'] || '')
        )[0];
      if (first) {
        const albumYear = Number(first['first-release-date']!.slice(0, 4));
        const complete = data.count !== undefined && data.count <= 100;
        if (complete) item.year = albumYear;
        item.facts = item.facts.filter((fact) => !['Album', 'Debut album'].includes(fact.label));
        item.facts.unshift({
          label: complete ? 'Debut album' : 'Album',
          value: `${first.title} (${albumYear})`,
        });
        item.sourceUrl = `https://musicbrainz.org/artist/${musicId}`;
        if (data.count !== undefined)
          item.relatedIds = { ...item.relatedIds, musicbrainzAlbumCount: String(data.count) };
        if (first.id) item.relatedIds = { ...item.relatedIds, musicbrainzReleaseGroup: first.id };
        const albums = data['release-groups'].flatMap((album) => (album.id ? [album.id] : []));
        if (albums.length)
          item.relatedIds = { ...item.relatedIds, musicbrainzAlbumGroups: albums.join(',') };
      }
    } catch {
      /* Verified Wikidata career metadata remains available during MusicBrainz outages. */
    }
  }
  if (
    item.category === 'music' &&
    (item.relatedIds?.musicbrainzAlbumGroups || item.relatedIds?.musicbrainzReleaseGroup)
  ) {
    try {
      const cover = await albumPoster(
        item.relatedIds.musicbrainzAlbumGroups || item.relatedIds.musicbrainzReleaseGroup!
      );
      if (cover) item.images = [...item.images.filter((image) => image.role !== 'poster'), cover];
    } catch {
      /* Existing approved artist/cover images survive an unavailable cover source. */
    }
  }
  return item;
}
export async function albumPoster(releaseGroup: string): Promise<SourceImage | null> {
  const groups = [
    ...new Set(releaseGroup.split(',').filter((id) => /^[0-9a-f-]{36}$/i.test(id))),
  ].slice(0, 100);
  if (!groups.length) return null;
  const url = new URL('https://query.wikidata.org/sparql');
  url.search = new URLSearchParams({
    format: 'json',
    query: `SELECT ?image WHERE {VALUES ?group {${groups.map((id) => `"${id}"`).join(' ')}} ?album wdt:P436 ?group; wdt:P18 ?image} LIMIT 8`,
  }).toString();
  const rows = resultSchema.parse(await sourceJson(url)).results.bindings;
  for (const row of rows) {
    if (!row.image) continue;
    const image = await commonsImage(row.image.value);
    if (image) return { ...image, role: 'poster' };
  }
  return null;
}
export const sourceCategories: SourceCategory[] = [
  'movies',
  'television',
  'games',
  'music',
  'pop-culture',
];
