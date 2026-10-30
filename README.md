# Veyli

A daily entertainment guessing app for movies, TV, games, music and pop culture. Identify titles from frames, posters and progressive clues, with eight guesses per round and no player account.

## Tech stack

Next.js 16 · React 19 · TypeScript · Supabase/PostgreSQL · Sharp · Vitest · PGlite · Playwright · Biome

## What it does

- Offers Classic, One Frame, Poster and Quote challenges, with daily drops and an archive.
- Filters rounds by release-year range and tracks guesses, scores, streaks and shareable results.
- Imports source catalogues and attributed media, with a protected studio for content and scheduling.

## Engineering decisions

- **The server owns the round.** [PostgreSQL game functions](supabase/setup.sql) enforce clue access, attempt limits and scoring in one transaction. The [game engine](features/game/engine.ts) validates the public state and rejects early answer reveals.
- **Images reveal only permitted clues.** The [media pipeline](lib/media.ts) applies crops, blur and central covers on the server. Bounded caches reuse downloads and renders; private images revalidate after access checks. Loading skeletons reserve space while responsive images load.
- **Source refreshes preserve history.** [Provider adapters](features/entertainment/source-client.ts) keep credentials on the server. [Content sync](features/entertainment/sync.ts) imports approved media and schedules new rounds while preserving existing answers and completed results.
- **Tests at real boundaries.** [PGlite integration tests](tests/integration) run the actual SQL for scoring, concurrency and repeatable setup. [Browser tests](tests/e2e) cover desktop and mobile gameplay, accessibility, editorial updates and forged reveal requests.

## Run locally

Use Node 26 and Yarn Classic. Follow the [database and environment setup](docs/DEVELOPMENT.md#local-setup) and [source import instructions](docs/DEVELOPMENT.md#source-content). Supabase is required for gameplay; provider keys enable catalogue and media imports.

```sh
nvm use
yarn install --frozen-lockfile
yarn dev
```

## Checks

```sh
yarn test
yarn typecheck
yarn lint
yarn build
yarn test:e2e
```

Tests use isolated databases and generated image fixtures; they do not modify live content or player progress.

## Documentation and license

[Development guide](docs/DEVELOPMENT.md) — setup, content sources, game rules, image caching, administration, deployment and verification.

Application code is licensed under [AGPL-3.0-only](LICENSE). Imported media retains its source licence. The current release uses TMDB’s non-commercial API terms; see [third-party licenses](docs/DEVELOPMENT.md#third-party-licenses).
