# Development guide

Setup, content sources, game rules, image handling, administration and verification. See the [project overview](../README.md) for features and engineering decisions.

## Local setup

```sh
nvm use
yarn install --frozen-lockfile
yarn dev
```

Use the localhost URL printed by Next. This project requires Node 26, Yarn Classic, Next 16, React 19 and TypeScript 7. Run local commands from the repository root. A fresh checkout needs an ignored `.env.local` based on [`.env.example`](../.env.example). Keep provider, Supabase and administration credentials server-only. Generate separate random values for `ANONYMOUS_COOKIE_SECRET` (at least 32 characters) and `ADMIN_ACCESS_KEY` (at least 24 characters). Configure `SUPABASE_URL` and the server-side `SUPABASE_SECRET_KEY` before opening database-backed pages.

## Database setup

Veyli can share an existing Supabase project. Its tables and functions use the `veyli_` prefix, and images use the private `veyli-media` bucket. The current development installation shares FitnessJourni’s project.

For a fresh installation, run **`supabase/setup.sql`** in Supabase SQL Editor, then **`yarn db:sync`** to import source content. Alternatively, configure a private `DATABASE_URL` and run `yarn db:migrate` before syncing. `yarn db:check` checks connectivity and daily challenge availability. Import commands below require the corresponding provider credentials.

`setup.sql` is the single current definition of the platform: tables, indexes, protected game functions, categories, modes, achievements and private storage. It contains no entertainment title, media or challenge seeds. Rerunning it preserves existing content, clues, guesses and scores.

Historical rounds and their uploaded images stay in Supabase for saved results and archive playback. Small fixtures under `tests/fixtures/` are used only by isolated test databases.

## Source content

Movies and TV use TMDB; games use RAWG; artists and pop-culture characters use Wikidata/Wikimedia Commons, with MusicBrainz for music facts and album matching. Optional IGDB metadata support accepts `IGDB_CLIENT_ID` and `IGDB_CLIENT_SECRET`.

```sh
yarn db:sync
yarn db:sync --catalogue-only
yarn db:sync --categories=music,pop-culture
yarn db:sync --catalogue-only --pages=12 --pool-size=300
yarn db:sync --cached-only --categories=television
```

Sync imports a broad catalogue, downloads and attributes approved media, and schedules today plus thirty upcoming days. It preserves existing daily answers, opened rounds, editorial drafts and completed results. Cached choices and puzzles remain usable during provider outages. Catalogue searches use aliases and remakes, return up to 60 matches, and can import additional movie/TV/game search results.

Movie Classic and One Frame use reviewed scene stills listed in `data/movie-scene-frames.json`. Unreviewed promotional backdrops are excluded from those modes. TV frame modes use stills from aired episodes rather than series artwork. `yarn db:scenes` and `yarn db:tv-scenes` correct frame media while preserving answers, guesses and scores. Poster uses separate movie/TV artwork, game covers, or licensed music album covers when available.

With `SOURCE_SYNC_ENABLED=true`, background maintenance extends the rolling queue after cached hub pages are served. Deployments must enable that flag or schedule `yarn db:sync` externally for unattended refreshes. Source refresh routes allow up to 300 seconds where supported.

Providers do not supply licensed dialogue. Existing Quote rounds retain their curated, licensed text; new Quote content is managed through the studio rather than source sync.

The current release is non-commercial with `TMDB_IMAGE_USAGE=noncommercial`. Commercial TMDB image use needs a separate agreement and `TMDB_IMAGE_USAGE=licensed`. Commons imports record author, source and licence and accept CC0, public domain, CC BY and CC BY-SA. Credits includes provider notices and the homepage photograph’s attribution. Each completed round lists its own media credits, including historical images.

## Game presentation

Classic keeps its image visible and adds a factual clue after each miss. Music Classic begins with a 10% central crop and gradually zooms out. Facts appear beneath guesses, within the image-height desktop column.

One Frame starts with a black central rectangle covering 80% of the image’s area. The rectangle follows the image’s aspect ratio and shrinks after each miss. Poster blur progresses through 30, 20, 13, 8, 5, 3, 1 and 0. Completion reveals the full image. Image transformations are authorised on the server; preview and gameplay show the same permitted initial image.

Images reserve their layout space and show a skeleton until loaded. The hero, active clue and first browse previews load eagerly; remaining images load lazily with responsive sizes. Private clue URLs go directly to Veyli, preserving player cookies. Source and rendered image caches each retain at most 32 MiB for five minutes and share simultaneous work. Public thumbnails cache for 60 seconds with content revisions; private images revalidate with ETags after every access check. Completion changes the image URL when the reveal changes. Simultaneous JSON reads and repeated result-image downloads also share requests.

Year-range preferences are saved in the browser and applied on the server. Eligible additional source rounds fill missing modes without replacing daily rounds or multiplying leaderboard scores. Narrow ranges can lack suitable approved imagery.

## Content studio

`/admin` uses a separate HTTP Basic gateway: username `admin`, password from private `ADMIN_ACCESS_KEY`. Production administration requires HTTPS. Players have no login or Supabase Auth flow.

The studio manages titles, aliases, categories, modes, approved media, scoring, ordered clues and publication schedules. Opened challenge rules are immutable. Studio previews contain spoilers; public previews reveal only the initial permitted image and do not create game sessions. **Refresh sources** runs the source importer.

## Code structure

`app/` contains Next routes and API boundaries. `features/` groups gameplay, challenges, sources, statistics, sharing and administration. Shared UI lives in `components/`, with the header and footer together under `components/layout/`. `lib/` holds server infrastructure and small shared utilities. All local imports use the `@/` alias. Styling stays in `styles/` and the installation component’s CSS module.

## Verification

```sh
yarn test
yarn typecheck
yarn lint
VEYLI_BUILD_DIRECTORY=.next-build yarn build
yarn test:e2e
```

Unit tests sit beside the modules they exercise and use Node by default; the installation component opts into jsdom. `tests/integration/` exercises real PostgreSQL transactions with PGlite. `tests/fixtures/` supplies a small catalogue, three days of rounds and generated images. `tests/support/` contains database helpers and the development-only adapter. The adapter is disabled in production and on Vercel.

`tests/e2e/` groups browser coverage into browsing, gameplay, administration and API enforcement. UI flows run in desktop and emulated mobile Chromium, including axe accessibility checks. API-only assertions run once on the desktop project. Playwright uses port 3100 and `.next-e2e`, preserving the local dev server. Build, test and screenshot outputs are ignored by Git.

## Deployment

Set private variables from `.env.example`, including `SUPABASE_URL`/`SUPABASE_SECRET_KEY`, `ANONYMOUS_COOKIE_SECRET`, `ADMIN_ACCESS_KEY` and provider credentials. Keep the same cookie signing secret across deployments to retain browser progress. Do not expose secrets with `NEXT_PUBLIC_` or enable the integration database in deployment.

The app includes a manifest, service worker, favicon, Apple touch icon and installation icons. Real-device installation and native sharing need HTTPS verification. Logs redact credentials; `MONITORING_ENDPOINT` optionally receives structured errors.

## Third-party licenses

Application code is licensed under [AGPL-3.0-only](../LICENSE). Provider images and imported media retain their own terms; source links, authors and licences are recorded with each asset. [Content credits](../app/credits/page.tsx) lists the homepage photograph and provider notices. Manrope retains its [SIL Open Font License](../public/fonts/Manrope-OFL.txt).

The [original product brief](requirements.md) records the initial requirements; this guide describes the current implementation.
