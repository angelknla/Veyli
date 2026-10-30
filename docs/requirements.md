# VEYLI — Master Product & Engineering Requirements

**Document type:** Product Requirements & Implementation Brief  
**Version:** 1.0  
**Product status:** Initial development specification  
**Working brand:** Veyli  
**Frontend:** Next.js 16 + React 19  
**Language:** TypeScript  
**Runtime:** Node.js 26  
**Backend / Database:** Supabase + PostgreSQL  
**Deployment target:** Vercel

---

# 1. Product vision

## 1.1 Overview

Build Veyli, a premium, cinematic entertainment guessing platform where people challenge their knowledge of movies, television, video games, music and pop culture.

Users discover daily challenges across different entertainment categories and game modes. They identify the correct answer using images, progressive clues, posters, quotes and other interactive formats.

The product should combine the addictive simplicity of daily guessing games with the design quality and usability of a premium entertainment platform.

Veyli should feel like a destination people enjoy visiting every day.

## 1.2 Product objectives

1. Create an addictive but accessible daily entertainment experience.
2. Deliver a distinctive and premium visual identity.
3. Support multiple entertainment categories and game modes.
4. Make sharing results effortless.
5. Encourage repeat visits through streaks, challenges and achievements.
6. Allow users to play immediately without accounts or registration.
7. Build an extensible platform that can grow beyond its initial game modes.

## 1.3 Product principles

- Entertainment first.
- Design is a core feature, not an afterthought.
- Zero-friction access.
- Mobile-first experience.
- Quality over quantity.
- Reusable game mechanics.
- Secure, server-authoritative gameplay.
- No unnecessary complexity.

---

# 2. Target audience

Veyli targets two audiences.

### Casual players

- Want quick daily entertainment.
- Prefer simple and intuitive gameplay.
- Enjoy sharing their results.
- Typically play for a few minutes.

### Entertainment enthusiasts

- Have strong knowledge of movies, games, music and television.
- Enjoy difficult and obscure challenges.
- Appreciate statistics, streaks and competitive elements.
- Want more variety and depth.

The product must accommodate both without making the interface complicated.

---

# 3. Entertainment categories

The platform must support multiple entertainment categories.

| Category | Examples |
|---|---|
| Movies | Films, directors, actors |
| Television | Shows, episodes, characters |
| Video games | Games, characters, franchises |
| Music | Artists, albums, songs |
| Pop culture | Iconic moments, celebrities, entertainment |

Categories must be data-driven and configurable.

Do not hardcode entertainment categories throughout the application.

### Initial content priorities

Prioritise:
1. Movies.
2. Television.
3. Video games.

Design the architecture to support music and pop culture from the beginning, even if their content libraries are introduced later.

---

# 4. Game modes

Multiple game modes must be available at launch.

All modes should use a shared game-engine architecture with configurable rules.

## 4.1 Classic — Progressive clues

The primary game mode.

Players identify an entertainment item through progressively revealed visual clues.

Rules:
- Six attempts by default.
- Start with one revealed clue.
- Reveal another clue after an incorrect answer.
- Correct answers immediately end the game.
- Exhausting all attempts results in a loss.
- Reveal the correct answer after completion.

Configuration should support different attempt limits and clue counts.

## 4.2 One Frame — Single image

Players identify the entertainment item from one image.

Rules:
- One initial image.
- Limited guesses.
- No progressive clues.
- Configurable scoring.
- Reveal the answer after completion.

## 4.3 Poster — Promotional artwork

Identify a movie, TV show or video game using promotional artwork.

Possible variations:
- Full poster.
- Cropped poster.
- Blurred poster.
- Progressively revealed poster.

The challenge configuration controls the presentation.

## 4.4 Quote — Identify the source

Players identify the movie, TV show or video game associated with a quote.

Rules:
- Display an excerpt.
- Allow users to search for the correct source.
- Support accepted alternative answers.
- Optionally reveal contextual hints.
- Use properly sourced and licensed content.

## 4.5 Future game modes

The architecture should support:
- Audio recognition.
- Soundtrack identification.
- Character identification.
- Screenshot identification.
- Actor identification.
- Timed challenges.
- Multiple-choice quizzes.
- Head-to-head competitions.

Do not implement future modes as incomplete placeholders.

---

# 5. Daily challenge system

Daily challenges are the central product mechanic.

Requirements:
- New challenges are released daily.
- All players receive the same challenge for the same category, mode and date.
- Challenges can be scheduled in advance.
- Each challenge has a unique identifier.
- Previous challenges are accessible through an archive.
- Future challenges cannot be accessed.
- Completed challenges cannot be replayed for additional competitive scores.
- Challenge availability is determined server-side.

Define a consistent release timezone. Use UTC initially unless a different product decision is made.

### Challenge configuration

Each challenge must support:

- Category.
- Game mode.
- Correct entertainment item.
- Accepted answer aliases.
- Difficulty.
- Clues.
- Clue reveal order.
- Maximum attempts.
- Scoring configuration.
- Publication date.
- Status.
- Media assets.
- Media attribution and licensing information.

Challenge lifecycle:

`draft → scheduled → published → archived`

---

# 6. Gameplay and answer validation

## 6.1 Answer search

Build an autocomplete experience that supports:

- Search by entertainment title.
- Instant suggestions.
- Title and release-year display.
- Keyboard navigation.
- Enter to select and submit.
- Case-insensitive matching.
- Normalised punctuation and whitespace.
- Alternative titles and aliases.
- Disambiguation for remakes and similarly named items.
- Clear feedback for invalid and duplicate guesses.

Players should select valid catalogue entries rather than submit arbitrary text.

## 6.2 Guess validation

All answers must be validated server-side.

The server must:
- Identify the current challenge.
- Validate the selected answer.
- Check whether the game is active.
- Prevent duplicate submissions.
- Update attempts atomically.
- Reveal clues according to game rules.
- Calculate scores.
- Return only information the player is permitted to see.

The correct answer must never be included in the initial client response.

## 6.3 Game persistence

Persist progress across:
- Page refreshes.
- Browser navigation.
- Temporary connection failures.
- Returning visits.

The server is authoritative for guesses, attempts, results and scores.

Local storage may be used for UI state and caching, but never as the source of truth for competitive results.

---

# 7. Account-free product architecture

**This is a non-negotiable product requirement.**

Veyli does not have user accounts.

There must be:
- No registration.
- No login.
- No logout.
- No Supabase Auth.
- No social authentication.
- No account creation prompts.
- No user profile system.
- No account-based friends system.
- No account migration functionality.

Anyone can open the application and play immediately.

## 7.1 Anonymous player identity

Use an anonymous, pseudonymous player identifier.

Requirements:
- Generate an identifier automatically.
- Persist it locally.
- Associate game sessions with that identifier.
- Never require personal information.
- Do not expose internal database IDs.
- Do not trust arbitrary client-provided identifiers for security-sensitive operations.

For server-side session integrity, use a server-issued, signed, HttpOnly cookie or equivalent secure mechanism.

No account registration or login should be involved.

## 7.2 Local statistics

Track:
- Total games played.
- Games won.
- Win percentage.
- Current streak.
- Longest streak.
- Average attempts.
- Average score.
- Category performance.
- Game-mode performance.

Persist personal statistics locally.

Clearing browser data may result in losing local statistics. Make this limitation clear rather than introducing accounts.

## 7.3 Anonymous leaderboards

Leaderboards may use anonymous player identities and optional display aliases.

Requirements:
- No real names or email addresses required.
- Avoid exposing persistent internal identifiers.
- Prevent trivial score manipulation.
- Allow players to participate without registering.

Do not introduce a traditional social network or account system.

---

# 8. Scoring and gamification

Use configurable scoring strategies.

Example Classic scoring:

| Attempts | Score |
|---|---:|
| 1 | 1000 |
| 2 | 800 |
| 3 | 600 |
| 4 | 400 |
| 5 | 200 |
| 6 | 100 |
| Failed | 0 |

Scoring must be calculated server-side.

### Achievements

Potential achievements:
- First win.
- Perfect first guess.
- Five-day streak.
- Thirty-day streak.
- Movie expert.
- Gaming expert.
- TV specialist.
- Perfect weekly performance.
- All-category completion.

Achievements should be data-driven and stored locally initially.

---

# 9. Results and sharing

Sharing should be a core product feature.

After each game display:
- Win/loss state.
- Correct answer.
- Attempts used.
- Score.
- Challenge number.
- Category.
- Game mode.
- Relevant movie/game/show information.
- Share functionality.

### Shareable result cards

Generate branded, spoiler-free results.

Support:
- Clipboard copying.
- Native mobile sharing.
- Social-friendly result images.
- Direct challenge links.

The shared result must not reveal the answer unless the user explicitly chooses to share a spoiler.

The result card should have a distinctive Veyli identity.

---

# 10. UI/UX and visual design

## 10.1 Visual direction

Premium cinematic editorial design.

The application should feel like a combination of:
- A premium entertainment publication.
- A modern gaming product.
- A cinematic discovery platform.

### Design language

- Dark-first theme.
- Deep black and charcoal backgrounds.
- Restrained accent colours.
- High-quality entertainment imagery.
- Distinctive typography.
- Elegant layouts.
- Subtle gradients.
- Cinematic transitions.
- Generous spacing.
- Carefully designed micro-interactions.

Avoid generic SaaS aesthetics, excessive cards, excessive gradients, unnecessary borders and cluttered interfaces.

## 10.2 Typography

Use:
- A distinctive display typeface for branding and headings.
- A highly legible sans-serif for functional UI.
- Consistent typographic hierarchy.

Typography must reinforce the brand identity.

## 10.3 Motion

Use animations intentionally:
- Progressive clue reveals.
- Guess submission.
- Correct and incorrect answer feedback.
- Results transitions.
- Modal transitions.
- Hover states.
- Loading states.

Respect reduced-motion preferences.

## 10.4 Responsive design

Mobile-first implementation.

Optimise for:
- Mobile.
- Tablet.
- Desktop.

The game must be comfortable to play on smaller screens without compromising the visual experience.

## 10.5 Accessibility

Target WCAG 2.2 AA.

Implement:
- Semantic HTML.
- Keyboard accessibility.
- Visible focus indicators.
- Screen-reader support.
- Sufficient colour contrast.
- Accessible forms and errors.
- Reduced-motion support.

---

# 11. Application navigation

Proposed navigation:

- Today.
- Categories.
- Archive.
- Leaderboard.
- Statistics.

No login, profile or account navigation.

### Homepage

The homepage should be an entertainment discovery experience.

Include:
- Today's featured challenge.
- Available daily challenges.
- Entertainment categories.
- Game mode selection.
- Current streak.
- Recent achievements.
- Challenge archive access.

Keep the experience focused and immediately playable.

---

# 12. Administration

Build a protected internal administration interface.

Administrators should be able to:

- Create and edit entertainment items.
- Manage categories.
- Manage alternative titles.
- Upload and manage media.
- Create daily challenges.
- Configure game modes.
- Schedule challenges.
- Preview challenges.
- Reorder clues.
- Configure scoring.
- Manage difficulty.
- Publish and archive challenges.
- View basic analytics.

Admin access must be separated from public player access.

No player account system should be introduced to support administration.

Use an appropriately protected administrative access mechanism, such as deployment-level protection or a separate administrative identity provider.

---

# 13. Entertainment data and media

Potential integrations:

- TMDB for movie and TV metadata.
- IGDB or another suitable provider for video games.
- MusicBrainz for music metadata.

Build provider adapters so game logic is independent of external data providers.

Requirements:
- Cache appropriate metadata.
- Handle external API failures.
- Support manually curated content.
- Track content provenance.
- Track media licensing.
- Avoid unnecessary API requests.

**Media licensing is mandatory.**

Access to metadata does not automatically grant permission to use promotional artwork, movie stills, audio clips or copyrighted quotes commercially.

Use authorised sources and maintain attribution and licensing records.

---

# 14. Technical architecture

## 14.1 Technology stack

| Area | Technology |
|---|---|
| Framework | Next.js 16 |
| UI | React 19 |
| Language | TypeScript strict |
| Runtime | Node.js 26 |
| Rendering | Next.js App Router |
| Styling | Tailwind CSS |
| Components | shadcn/ui, customised |
| Icons | Lucide |
| Animations | Motion |
| Database | Supabase PostgreSQL |
| Storage | Supabase Storage |
| Validation | Zod |
| Testing | Vitest + Playwright |
| Deployment | Vercel |
| Monitoring | Sentry or equivalent |

Use Next.js server capabilities for application APIs and business logic initially. Do not introduce a separate Node.js server unless a clear architectural requirement justifies it.

Do not install unnecessary dependencies.

## 14.2 Architecture principles

- Feature-oriented architecture.
- Modular business logic.
- Reusable UI components.
- Separation of concerns.
- Server-side validation.
- Independent game engine.
- Typed data contracts.
- Explicit error handling.
- Database migrations tracked in Git.
- Clear boundaries between public and private data.

## 14.3 Suggested project structure

```text
src/
├── app/
│   ├── (marketing)/
│   ├── (game)/
│   │   ├── today/
│   │   ├── categories/
│   │   ├── archive/
│   │   ├── leaderboard/
│   │   └── statistics/
│   ├── admin/
│   └── api/
│
├── features/
│   ├── game/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── engine/
│   │   ├── services/
│   │   └── types/
│   ├── entertainment/
│   ├── challenges/
│   ├── statistics/
│   ├── leaderboard/
│   ├── achievements/
│   └── sharing/
│
├── components/
│   ├── ui/
│   ├── layout/
│   └── shared/
│
├── lib/
│   ├── supabase/
│   ├── validation/
│   ├── security/
│   ├── utilities/
│   └── constants/
│
└── types/
```

This is a suggested starting point, not a requirement to create empty folders or unnecessary abstractions.

---

# 15. Database design

Use Supabase PostgreSQL.

Suggested tables:

| Table | Purpose |
|---|---|
| `entertainment_items` | Movies, TV shows, games, music |
| `entertainment_categories` | Category definitions |
| `entertainment_aliases` | Alternative titles |
| `game_modes` | Game mode definitions |
| `challenges` | Daily challenges |
| `challenge_clues` | Clues and reveal order |
| `game_sessions` | Anonymous game sessions |
| `game_guesses` | Submitted answers |
| `player_statistics` | Anonymous player statistics |
| `achievements` | Achievement definitions |
| `player_achievements` | Earned achievements |
| `media_assets` | Media references and licensing |

Database requirements:
- UUID primary keys.
- UTC timestamps.
- Appropriate foreign keys.
- Unique constraints.
- Indexes for frequently queried columns.
- Database constraints for valid states.
- Atomic game updates.
- Version-controlled migrations.

Do not create a conventional `users` or `profiles` table.

Anonymous player records must not become an alternative account system.

## 15.1 Public and private data boundaries

The correct answer, accepted aliases and unrevealed clues must not be exposed through public queries.

Separate sensitive challenge data from public challenge presentation data.

Use server-only database access for sensitive operations.

Never expose the Supabase service-role key to the browser.

---

# 16. API and game-engine requirements

The game engine must be independent of React.

Suggested responsibilities:

- Challenge retrieval.
- Session initialisation.
- Guess submission.
- Answer validation.
- Clue reveal.
- Attempt management.
- Game completion.
- Scoring.
- Statistics updates.
- Result generation.

Example conceptual game-state contract:

```ts
type GameStatus =
  | "in_progress"
  | "won"
  | "lost";

interface GameState {
  challengeId: string;
  sessionId: string;
  attemptsUsed: number;
  revealedClues: number;
  status: GameStatus;
  score: number;
}
```

This is an illustrative contract. Final types must reflect the actual database and game rules.

The game engine should support configurable game modes rather than embedding Classic-specific logic throughout the application.

---

# 17. Security requirements

- Correct answers must never be exposed before completion.
- Validate all guesses server-side.
- Calculate scores server-side.
- Prevent duplicate submissions.
- Protect against concurrent requests.
- Apply rate limiting.
- Use signed anonymous session cookies.
- Validate all inputs.
- Protect administrative endpoints.
- Apply appropriate Supabase RLS policies.
- Keep privileged credentials server-only.
- Avoid caching personalised game state.
- Avoid leaking internal identifiers.
- Protect against challenge enumeration and answer brute-forcing.

A browser-generated UUID alone is not a security mechanism.

---

# 18. Testing requirements

Use Vitest for unit and integration tests and Playwright for E2E tests.

### Game engine tests

- Correct guesses.
- Incorrect guesses.
- Maximum attempts.
- Clue progression.
- Duplicate submissions.
- Alternative titles.
- Case and punctuation normalisation.
- Scoring.
- Game completion.
- Concurrent submissions.
- Invalid game states.

### Application tests

- Daily challenge loading.
- Category navigation.
- Mode selection.
- Search autocomplete.
- Game persistence.
- Results display.
- Sharing.
- Archive navigation.
- Anonymous session persistence.
- Responsive layouts.

### Quality gates

Before considering a feature complete:
- Type checking passes.
- Linting passes.
- Relevant automated tests pass.
- Production build succeeds.
- Accessibility has been reviewed.

---

# 19. Performance and reliability

- Excellent Core Web Vitals.
- Optimised image delivery.
- Responsive image sizing.
- Lazy-load non-critical media.
- Avoid unnecessary client-side JavaScript.
- Efficient Supabase queries.
- Cache public challenge metadata appropriately.
- Do not cache sensitive game state.
- Graceful API failure handling.
- Useful loading and error states.
- Prevent unnecessary rerenders.

---

# 20. MVP delivery scope

## Included

- Premium cinematic design system.
- Homepage.
- Movies, TV and video game categories.
- Classic game mode.
- One Frame game mode.
- Poster game mode.
- Quote game mode.
- Daily challenge system.
- Answer autocomplete.
- Server-side game engine.
- Anonymous player sessions.
- Local statistics.
- Streaks.
- Shareable results.
- Challenge archive.
- Leaderboard with anonymous identities.
- Protected administration.
- Supabase database and storage.
- Automated tests.
- Deployment-ready application.

## Excluded initially

- User registration.
- Login.
- Social authentication.
- User profiles.
- Friends.
- Real-time multiplayer.
- Private tournaments.
- User-generated challenges.
- Paid subscriptions.
- Audio game mode.
- Music content library.

---

# 21. Acceptance criteria

The MVP is complete when:

1. Anyone can play without creating an account.
2. There is no player login or registration functionality.
3. The application supports multiple entertainment categories.
4. Multiple game modes are playable.
5. Daily challenges are consistent across players.
6. Guess validation happens server-side.
7. Clues are revealed according to game rules.
8. Game progress persists across refreshes.
9. Correct answers are not exposed prematurely.
10. Scores cannot be manipulated through client-side state.
11. Results and statistics are displayed correctly.
12. Shareable results work on desktop and mobile.
13. Previous challenges can be accessed through the archive.
14. Administrators can manage challenges.
15. The interface works across mobile, tablet and desktop.
16. Critical game-engine tests pass.
17. Accessibility and security have been reviewed.
18. The production build succeeds.

---

# 22. Product success metrics

Track:
- Daily active players.
- Returning players.
- Games played per session.
- Challenge completion rate.
- Average guesses.
- Win percentage.
- Share rate.
- Category popularity.
- Game-mode popularity.
- Streak participation.

Measure retention without introducing unnecessary registration barriers.

---

# 23. Implementation instructions for the AI coding agent

The agent must approach this as a senior software engineer responsible for delivering a production-quality product.

## Before implementation

1. Inspect the existing repository.
2. Understand existing conventions and dependencies.
3. Identify existing infrastructure.
4. Review the Supabase configuration.
5. Identify missing environment variables.
6. Review the existing database schema, if one exists.
7. Identify ambiguities and risks.
8. Propose a technical implementation plan.

Do not blindly replace existing configuration or overwrite working code.

## During implementation

- Work incrementally.
- Keep changes focused.
- Follow the established architecture.
- Avoid monolithic components.
- Avoid duplicated business logic.
- Use strict TypeScript.
- Validate inputs and outputs.
- Implement meaningful tests.
- Keep database migrations in source control.
- Avoid unnecessary dependencies.
- Use real data and real functionality.
- Do not create fake implementations merely to make the UI look complete.

## Design expectations

Do not settle for generic AI-generated interfaces.

Pay particular attention to:
- Visual hierarchy.
- Typography.
- Spacing.
- Image presentation.
- Responsive behaviour.
- Micro-interactions.
- Empty states.
- Loading states.
- Error states.

The product should feel intentionally designed.

## Delivery workflow

Implement in stages:

**Stage 1:** Repository analysis, architecture and technical plan.

**Stage 2:** Design system, foundations and application shell.

**Stage 3:** Supabase schema, migrations and secure server-side access.

**Stage 4:** Generic game engine and Classic mode.

**Stage 5:** Additional game modes.

**Stage 6:** Entertainment catalogue and search.

**Stage 7:** Results, statistics, sharing and archive.

**Stage 8:** Administration.

**Stage 9:** Testing, security, accessibility and performance.

**Stage 10:** Production readiness and documentation.

At the end of each stage, report:
- What was implemented.
- Files and components changed.
- Database changes.
- Tests performed.
- Outstanding issues.
- Recommended next steps.

Do not claim that something is complete if it has only been partially implemented.

## Final engineering principle

Build Veyli as a cohesive entertainment platform, not as several disconnected guessing games.

The game engine, entertainment catalogue, challenge system, content management and design system must work together through clear and reusable interfaces.

Prioritise a polished, reliable and genuinely enjoyable MVP over unnecessary complexity.

---

# 24. Final product definition

Veyli is a premium, account-free daily entertainment guessing platform.

It allows anyone to test their knowledge of entertainment through multiple interactive game modes, beautifully presented challenges and shareable results.

It is designed to be:
- Instantly accessible.
- Cinematic.
- Intuitive.
- Addictive.
- Extensible.
- Secure.
- Mobile-first.

**The objective is to create a product people return to every day because playing it is genuinely enjoyable.**