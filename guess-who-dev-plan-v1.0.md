# Guess Who: AI or Real? — App Development Plan
**Prepared for:** Google Antigravity
**Prepared by:** Product & Engineering
**Document version:** 1.0
**Date:** April 16, 2026
**Based on PRD:** v1.1 (April 16, 2026)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Team & Roles](#2-team--roles)
3. [Repository & Project Structure](#3-repository--project-structure)
4. [Environment Setup](#4-environment-setup)
5. [Development Phases](#5-development-phases)
   - [Phase 1 — Backend Foundation](#phase-1--backend-foundation-week-12)
   - [Phase 2 — Frontend Gallery](#phase-2--frontend-gallery-week-23)
   - [Phase 3 — Vote Modal & Voting Logic](#phase-3--vote-modal--voting-logic-week-34)
   - [Phase 4 — Polish, Testing & Security](#phase-4--polish-testing--security-week-45)
   - [Phase 5 — Leaderboard & Share Metadata](#phase-5--leaderboard--share-metadata-week-56)
   - [Phase 6 — Deployment & Launch](#phase-6--deployment--launch-week-6)
6. [Technical Specifications](#6-technical-specifications)
7. [API Contract](#7-api-contract)
8. [Database Schema & Migrations](#8-database-schema--migrations)
9. [Component Architecture](#9-component-architecture)
10. [Testing Strategy](#10-testing-strategy)
11. [Performance Requirements](#11-performance-requirements)
12. [Accessibility Requirements](#12-accessibility-requirements)
13. [Security Requirements](#13-security-requirements)
14. [Deployment Architecture](#14-deployment-architecture)
15. [Definition of Done](#15-definition-of-done)
16. [Risk Register](#16-risk-register)

---

## 1. Project Overview

"Guess Who: AI or Real?" is a social guessing game where users browse AI-generated portrait photos and collaboratively vote on who the person in each image might be. Community-sourced name guesses are tallied and surfaced in real time.

**Core loop:**
1. User opens the app and sees a responsive gallery of AI-generated portraits.
2. User taps a card, a modal opens showing the image and up to 3 existing name guesses (with vote counts) plus an "I don't know" option.
3. User selects an existing guess or types a new name and submits.
4. The tally updates immediately. "I don't know" votes are recorded but excluded from displayed counts.
5. Users can view a leaderboard of most-guessed images.

**Key constraints:**
- No user accounts. All votes are anonymous.
- Images sourced directly from a public GCS bucket — no backend proxying.
- All bucket images are shown; cards with broken/missing images are silently hidden.
- SQLite is the data store for all votes.

---

## 2. Team & Roles

| Role | Responsibilities |
|---|---|
| **Tech Lead** | Architecture decisions, code review sign-off, deployment, risk management |
| **Backend Engineer(s)** | Express API, SQLite schema, GCS XML parsing, caching layer, rate limiting |
| **Frontend Engineer(s)** | React components, Tailwind/shadcn styling, React Query integration, responsive layout |
| **QA Engineer** | Test plans, manual testing across devices, automated test coverage |
| **Designer** | Component designs in Figma (gallery card, modal, leaderboard), design tokens |
| **Product Owner** | Acceptance criteria sign-off, backlog prioritization, stakeholder communication |

---

## 3. Repository & Project Structure

### 3.1 Monorepo Layout

```
guess-who/
├── apps/
│   ├── client/               # React (Vite) frontend
│   │   ├── src/
│   │   │   ├── components/   # Shared UI components
│   │   │   ├── pages/        # Route-level page components
│   │   │   ├── hooks/        # Custom React hooks
│   │   │   ├── store/        # Zustand stores
│   │   │   ├── services/     # Axios API service layer
│   │   │   ├── utils/        # Helpers (image validation, formatting)
│   │   │   └── main.jsx      # Vite entry point
│   │   ├── public/
│   │   ├── index.html
│   │   └── vite.config.js
│   │
│   └── server/               # Node.js (Express) backend
│       ├── src/
│       │   ├── routes/       # Express route handlers
│       │   ├── services/     # Business logic (GCS, votes)
│       │   ├── db/           # SQLite setup, migrations, queries
│       │   ├── middleware/   # Rate limiting, error handling, CORS
│       │   └── index.js      # Server entry point
│       └── data/
│           └── votes.db      # SQLite database file (gitignored)
│
├── .env.example
├── .gitignore
├── package.json              # Root workspace config (npm workspaces or pnpm)
└── README.md
```

### 3.2 Branching Strategy

- `main` — production-ready code only. Protected branch. Requires PR + 1 approval to merge.
- `develop` — integration branch. All feature branches merge here first.
- `feature/<ticket-id>-short-description` — individual feature branches off `develop`.
- `fix/<ticket-id>-short-description` — bug fix branches.
- `release/v<semver>` — release staging branches cut from `develop` before merging to `main`.

### 3.3 Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(modal): add vote confirmation state after submission
fix(gallery): silently hide cards with broken image URLs
chore(db): add index on image_key column
docs(api): update votes endpoint response schema
```

---

## 4. Environment Setup

### 4.1 Prerequisites

| Tool | Minimum version |
|---|---|
| Node.js | 20.x LTS |
| npm / pnpm | npm 10+ or pnpm 9+ |
| Git | 2.x |
| VS Code (recommended) | Latest |

### 4.2 Environment Variables

Create `.env` in `apps/server/` (copy from `.env.example`):

```env
# Server
PORT=3001
NODE_ENV=development

# GCS
GCS_BUCKET_URL=https://storage.googleapis.com/cabana-oasis-assets-next26/
GCS_CACHE_TTL_SECONDS=300

# SQLite
DB_PATH=./data/votes.db

# Rate limiting
RATE_LIMIT_WINDOW_MS=86400000
RATE_LIMIT_MAX_PER_IMAGE=1
```

Create `.env` in `apps/client/` (copy from `.env.example`):

```env
VITE_API_BASE_URL=http://localhost:3001
```

### 4.3 First-Time Setup

```bash
# Clone the repo
git clone https://github.com/google-antigravity/guess-who.git
cd guess-who

# Install all dependencies (root + workspaces)
npm install

# Start both client and server in development mode
npm run dev
```

The client will run on `http://localhost:5173` and the server on `http://localhost:3001`.

---

## 5. Development Phases

---

### Phase 1 — Backend Foundation (Week 1–2)

**Goal:** A working Express API that parses the GCS bucket XML, caches image metadata in memory, and stores/retrieves votes from SQLite.

#### Tickets

**BE-001 — Project scaffolding**
- Initialize `apps/server` with Express, `better-sqlite3`, `node-cron`, `axios`, `cors`, `express-rate-limit`, `dotenv`.
- Set up `nodemon` for development hot-reload.
- Create the `src/` directory structure as specified in §3.1.
- Wire up a basic health-check route: `GET /api/health → { status: "ok" }`.
- **Acceptance:** Server starts without errors; health check returns 200.

**BE-002 — SQLite setup & migrations**
- Create `src/db/index.js` that opens (or creates) the SQLite database at `DB_PATH`.
- Run the `votes` table DDL and index on startup if they don't exist (see §8).
- Export typed query functions: `insertVote`, `getTopGuesses`, `getNamedVoteCount`, `getAllImageVoteSummaries`.
- **Acceptance:** Database file is created on first run; all query functions are callable and return correct shapes.

**BE-003 — GCS XML parser & in-memory cache**
- Create `src/services/gcsService.js`.
- On server startup, fetch `GCS_BUCKET_URL` and parse the XML response.
- Extract all `<Contents>` elements into a `contents` array using an XML parser (e.g., `fast-xml-parser`).
- Sort by `<LastModified>` descending into `contentsSorted`.
- Construct `imageUrl` for each item: `GCS_BUCKET_URL + key`.
- Cache `contentsSorted` in memory; refresh every `GCS_CACHE_TTL_SECONDS` using `node-cron`.
- **Acceptance:** `contentsSorted` is populated on startup and matches the expected object schema from PRD §4.2.

**BE-004 — `GET /api/images` endpoint**
- Return the full `contentsSorted` array.
- Response shape: array of `{ key, imageUrl, lastModified, size }`.
- **Acceptance:** Endpoint returns 200 with a non-empty array; items are sorted newest-first.

**BE-005 — `GET /api/votes/:imageKey` endpoint**
- Accept an encoded `imageKey` path parameter.
- Return `namedVoteCount` (excludes `__unknown__`) and `topGuesses` (top 3 named, descending by count).
- If no votes exist, return `namedVoteCount: 0, topGuesses: []`.
- **Acceptance:** Returns correct tallies for a seeded image key; excludes `__unknown__` from all counts.

**BE-006 — `POST /api/votes` endpoint**
- Accept `{ imageKey, guessName }` in the request body.
- Validate: both fields required; `guessName` must be a non-empty string after trimming.
- Normalize: trim whitespace; compare case-insensitively against existing guesses for that image to find the canonical stored casing (use the first-submitted casing).
- Insert the vote record.
- Return updated tallies (same shape as `GET /api/votes/:imageKey` response, plus `success: true`).
- **Acceptance:** Vote is recorded; duplicate name variants are deduplicated; updated tallies are returned.

**BE-007 — `GET /api/leaderboard` endpoint**
- Return all image keys that have at least 1 named vote, sorted by `namedVoteCount` descending.
- Each item: `{ imageKey, imageUrl, namedVoteCount, topGuess }` where `topGuess` is the single top named guess name.
- Construct `imageUrl` from the in-memory cache using `imageKey`.
- **Acceptance:** Returns correct ordering; images with 0 named votes are excluded.

**BE-008 — CORS & error handling middleware**
- Apply CORS middleware allowing requests from `VITE_API_BASE_URL` and `localhost:5173`.
- Apply a global error handler that returns `{ error: "message" }` with appropriate status codes.
- **Acceptance:** Frontend dev server can call the API without CORS errors.

---

### Phase 2 — Frontend Gallery (Week 2–3)

**Goal:** A fully responsive image gallery that fetches all images from the API, renders cards, and silently drops cards with broken image URLs.

#### Tickets

**FE-001 — Project scaffolding**
- Initialize `apps/client` with Vite + React.
- Install and configure Tailwind CSS, shadcn/ui, React Query, Zustand, Axios, React Router v6.
- Set up the `src/` directory structure as in §3.1.
- Create `src/services/api.js` — an Axios instance pointed at `VITE_API_BASE_URL`.
- **Acceptance:** `npm run dev` runs the client; Tailwind styles apply; shadcn/ui `Button` renders.

**FE-002 — React Query setup & image fetching hook**
- Wrap the app in `QueryClientProvider`.
- Create `src/hooks/useImages.js` — calls `GET /api/images`, returns `{ images, isLoading, isError }`.
- **Acceptance:** Hook returns image data when the server is running; loading state is `true` before data arrives.

**FE-003 — `ImageCard` component**
- Props: `{ imageUrl, imageKey, lastModified, namedVoteCount, topGuessName, onClick }`.
- Renders the photo (lazy-loaded via `loading="lazy"`).
- Shows `namedVoteCount` as a badge and `topGuessName` as a label below the image (both hidden if zero votes).
- On image `onError`, calls a passed-in `onError` callback (parent removes it from rendered list).
- Skeleton loading state while image is loading (`onLoad` toggles visibility).
- **Acceptance:** Card renders correctly with and without vote data; broken image triggers onError; skeleton shows then disappears.

**FE-004 — `GalleryPage` component**
- Fetches images via `useImages`.
- Maintains a `hiddenKeys` Set in local state; adds to it when `ImageCard.onError` fires.
- Renders `ImageCard` for each image not in `hiddenKeys`.
- Responsive grid using Tailwind: `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4`.
- Shows skeleton grid during initial load (8–12 placeholder cards).
- Also fetches `namedVoteCount` and `topGuessName` for each visible card via `GET /api/votes/:imageKey` (can be batched or lazy per visible card).
- **Acceptance:** Gallery renders all valid images; broken images disappear silently; grid reflows correctly at all breakpoints.

**FE-005 — Routing setup**
- Configure React Router v6 with routes:
  - `/` → `GalleryPage`
  - `/leaderboard` → `LeaderboardPage` (stub for now)
- Add a simple `NavBar` component with links to both routes.
- **Acceptance:** Navigation between routes works; NavBar renders on both pages.

---

### Phase 3 — Vote Modal & Voting Logic (Week 3–4)

**Goal:** A fully functional vote modal with option selection, new name input, submission, optimistic update, and confirmation state.

#### Tickets

**FE-006 — `useVotes` hook**
- Accepts `imageKey`.
- Calls `GET /api/votes/:imageKey` on mount; returns `{ namedVoteCount, topGuesses, isLoading }`.
- **Acceptance:** Returns correct data for a given image key.

**FE-007 — `useSubmitVote` mutation hook**
- Wraps `POST /api/votes` in a React Query `useMutation`.
- On success: invalidates the `useVotes` query for the image key to trigger a refetch.
- Returns `{ mutate: submitVote, isLoading, isSuccess, isError }`.
- **Acceptance:** Submitting a vote updates the tally shown in the modal without a page reload.

**FE-008 — `VoteModal` component**
- Triggered by clicking an `ImageCard`; receives `{ imageKey, imageUrl, lastModified }` as props.
- Renders full-size photo (aspect-ratio preserved, `object-fit: contain`).
- Uses `useVotes(imageKey)` to populate voting options.
- Voting options rendered as selectable tiles (shadcn/ui `RadioGroup` or equivalent):
  - Up to 3 named guess tiles, each showing the name and vote count badge.
  - Always a 4th "I don't know" tile (sends `__unknown__`).
- "Suggest a new name" text input below the options. Typing into it auto-selects it as the active choice; selecting a tile clears the text input.
- "Submit Vote" button — disabled until a selection or new name is entered.
- On submit: calls `submitVote({ imageKey, guessName })`; shows a spinner; on success, shows a brief confirmation message ("Vote recorded! ✓") and disables the form.
- Close button (✕ top-right), backdrop click, and Escape key all close the modal.
- Focus trap inside modal while open.
- **Acceptance:** All interactions work correctly; vote is recorded in DB; tally refreshes; modal closes cleanly.

**FE-009 — Modal state in Zustand**
- Create `src/store/modalStore.js` with `openModal(imageKey, imageUrl, lastModified)` and `closeModal()` actions and state.
- `GalleryPage` dispatches `openModal` on card click; `VoteModal` reads from the store.
- **Acceptance:** Opening and closing the modal via any trigger works correctly; store resets on close.

**FE-010 — Optimistic vote tally update on card**
- After a successful vote submission, the `ImageCard` for that image should reflect the updated `namedVoteCount` and `topGuessName` without a full gallery reload.
- Achieved via React Query cache invalidation of the per-image votes query.
- **Acceptance:** Card vote badge updates immediately after modal submission.

---

### Phase 4 — Polish, Testing & Security (Week 4–5)

**Goal:** Production-quality UX, error handling, accessibility, rate limiting, and profanity filtering. Full test coverage.

#### Tickets

**BE-009 — IP-based rate limiting**
- Apply `express-rate-limit` to `POST /api/votes`.
- Window: `RATE_LIMIT_WINDOW_MS` (default 24h). Max: `RATE_LIMIT_MAX_PER_IMAGE` (default 1) per IP per image key.
- Custom key generator: `req.ip + ':' + req.body.imageKey`.
- On limit exceeded: return HTTP 429 with `{ error: "You have already voted on this image." }`.
- **Acceptance:** Same IP cannot vote on the same image twice within the window; different images are unaffected.

**BE-010 — Profanity filter on submitted names**
- Integrate a profanity filtering library (e.g., `bad-words`) on the `POST /api/votes` handler.
- If `guessName` (excluding `__unknown__`) matches a blocked term, return HTTP 400 with `{ error: "Name contains inappropriate content." }`.
- **Acceptance:** Offensive names are rejected with a 400; clean names pass through.

**BE-011 — Input validation hardening**
- `guessName` max length: 100 characters.
- `imageKey` must be a non-empty string; reject keys not present in the current `contentsSorted` cache.
- **Acceptance:** Over-length names and invalid image keys are rejected with 400 errors.

**FE-011 — Error states**
- `GalleryPage`: if `GET /api/images` fails, show a full-page error state with a retry button.
- `VoteModal`: if vote submission fails (non-429), show an inline error message.
- `VoteModal`: if rate limit hit (429), show "You've already voted on this one!" message.
- **Acceptance:** All error paths surface a message to the user; no unhandled promise rejections.

**FE-012 — Accessibility (a11y) pass**
- All `ImageCard` elements have `role="button"`, `tabIndex={0}`, `aria-label` including the top guess name.
- `VoteModal` traps focus when open; restores focus to the triggering card on close.
- All form elements have associated `<label>` elements.
- Color contrast on vote badges meets WCAG 2.1 AA (4.5:1 minimum).
- Escape key closes modal.
- **Acceptance:** Full keyboard-only navigation is possible through the gallery and modal; no axe-core violations.

**FE-013 — Vote fingerprinting (localStorage)**
- On successful vote submission, store a hash of `imageKey` in `localStorage` under `voted_images`.
- On modal open, check `localStorage`; if the image key is present, show a "You've already voted on this" state instead of the voting form.
- **Acceptance:** Re-opening a modal for a voted image shows the already-voted state, even after a page reload.

**QA-001 — Backend unit tests**
- Test framework: `vitest` or `jest`.
- Cover: `gcsService` XML parsing, `insertVote` deduplication logic, `getTopGuesses` query, rate limiting, profanity filter, input validation.
- Minimum 80% line coverage on `src/services/` and `src/db/`.
- **Acceptance:** All tests pass in CI.

**QA-002 — Frontend component tests**
- Test framework: Vitest + React Testing Library.
- Cover: `ImageCard` (renders correctly, fires onError, fires onClick), `VoteModal` (renders options, submit flow, error states), `GalleryPage` (hides broken images, renders skeletons).
- **Acceptance:** All tests pass in CI.

**QA-003 — End-to-end tests**
- Framework: Playwright.
- Scenarios:
  1. Load gallery → cards render → click card → modal opens → select option → submit → tally updates.
  2. Load gallery → click card → type new name → submit → name appears in tally.
  3. Submit vote → reopen same card → already-voted state shown.
  4. Attempt to vote twice from same IP (mocked) → 429 handled gracefully.
- **Acceptance:** All E2E scenarios pass against a local test server with seeded data.

---

### Phase 5 — Leaderboard & Share Metadata (Week 5–6)

**Goal:** A fully functional leaderboard page and Open Graph share metadata per image.

#### Tickets

**FE-014 — `LeaderboardPage` component**
- Calls `GET /api/leaderboard`.
- Renders a ranked list of image thumbnails with: rank number, thumbnail, top named guess, named vote count.
- Clicking a thumbnail opens the `VoteModal` for that image (same flow as gallery).
- Responsive layout: single column on mobile, two columns on desktop.
- **Acceptance:** Leaderboard displays correct ranking; modal opens correctly from it.

**FE-015 — Shareable image URLs**
- Update React Router to support a route: `/image/:imageKey` that pre-opens the modal for that specific image.
- Add Open Graph meta tags to `index.html` dynamically (via `react-helmet-async`):
  - `og:title`: "Can you guess who this is? | Guess Who: AI or Real?"
  - `og:image`: the image URL from GCS
  - `og:url`: the canonical URL for that image
- **Acceptance:** Navigating to `/image/:imageKey` opens the gallery with the correct modal open; OG tags are present in the document head.

**FE-016 — NavBar polish**
- Active route highlighting on Gallery and Leaderboard links.
- Mobile-friendly layout (links collapse or remain visible without a hamburger menu given there are only two routes).
- **Acceptance:** NavBar looks correct on mobile and desktop; active link is visually distinct.

---

### Phase 6 — Deployment & Launch (Week 6)

**Goal:** App deployed to production, monitored, and publicly accessible.

#### Tickets

**OPS-001 — Production environment setup**
- Choose hosting platform (Railway, Render, or Fly.io recommended).
- Configure production environment variables (see §4.2).
- Ensure SQLite `data/` directory persists across deploys (use a persistent volume if on Railway/Fly).
- **Acceptance:** Server starts cleanly in production; health check returns 200.

**OPS-002 — CI/CD pipeline**
- Use GitHub Actions (or equivalent).
- On push to `develop`: run linting, unit tests, build.
- On merge to `main`: run all tests, build, deploy to production.
- **Acceptance:** Pipeline runs green on a clean branch; failed tests block the merge.

**OPS-003 — Analytics integration**
- Integrate Plausible or PostHog (client-side snippet) into the React app.
- Track: page views, card clicks, vote submissions, "I don't know" selections, leaderboard views.
- **Acceptance:** Events appear in the analytics dashboard after manual testing.

**OPS-004 — GCS cache warm-up on startup**
- Ensure the GCS XML is fetched and cached before the first API request is served.
- Add a startup log confirming how many images were loaded from the bucket.
- **Acceptance:** Server logs the image count on startup; first `GET /api/images` request is never slow due to a cold cache.

**OPS-005 — Launch smoke test**
- QA manually tests the following on production before announcing launch:
  1. Gallery loads all images.
  2. Broken image cards are hidden.
  3. Modal opens, vote submits, tally updates.
  4. New name submission works.
  5. Rate limiting works (vote twice, see 429 message).
  6. Already-voted fingerprint state works across a page reload.
  7. Leaderboard is ranked correctly.
  8. Shareable image URL opens correct modal.
  9. Mobile layout (iOS Safari + Android Chrome) is correct.
- **Acceptance:** All 9 scenarios pass on production.

---

## 6. Technical Specifications

### 6.1 Backend Dependencies

| Package | Purpose |
|---|---|
| `express` | HTTP server framework |
| `better-sqlite3` | Synchronous SQLite driver |
| `fast-xml-parser` | Parse GCS bucket XML listing |
| `axios` | Fetch GCS bucket XML |
| `node-cron` | Schedule GCS cache refresh |
| `express-rate-limit` | IP-based rate limiting on POST /api/votes |
| `cors` | Cross-origin request handling |
| `bad-words` | Profanity filtering on submitted names |
| `dotenv` | Environment variable loading |
| `nodemon` | Dev hot-reload |

### 6.2 Frontend Dependencies

| Package | Purpose |
|---|---|
| `react` + `react-dom` | UI framework |
| `vite` | Build tool and dev server |
| `tailwindcss` | Utility-first CSS |
| `@shadcn/ui` | Pre-built accessible UI components |
| `@tanstack/react-query` | Server state management, caching |
| `zustand` | Client-side UI state (modal open/close) |
| `axios` | HTTP client |
| `react-router-dom` v6 | Client-side routing |
| `react-helmet-async` | Dynamic Open Graph meta tags |

### 6.3 GCS XML Parsing Notes

The GCS bucket listing is an XML document. Use `fast-xml-parser` to convert it to a JS object. The `<Contents>` elements will be found at `ListBucketResult.Contents` (an array if multiple items, a single object if only one — handle both). Each item maps to the schema in PRD §4.2.

```js
import { XMLParser } from 'fast-xml-parser';
const parser = new XMLParser();
const parsed = parser.parse(xmlString);
const rawContents = parsed.ListBucketResult.Contents;
const contents = Array.isArray(rawContents) ? rawContents : [rawContents];
```

### 6.4 Name Deduplication Logic

When a `POST /api/votes` request arrives:

1. Fetch all distinct `guess_name` values for the given `image_key` from the DB.
2. Compare the incoming `guessName` (trimmed, lowercased) against each existing name (also lowercased).
3. If a match is found, use the existing stored casing as the canonical name for insertion.
4. If no match is found, store the incoming name in its original trimmed casing.
5. Insert the vote with the resolved canonical name.

---

## 7. API Contract

### `GET /api/health`
```
200 OK
{ "status": "ok" }
```

### `GET /api/images`
```
200 OK
[
  {
    "key": "generated/avatars/arena_rock_1775799815951.png",
    "imageUrl": "https://storage.googleapis.com/cabana-oasis-assets-next26/generated/avatars/arena_rock_1775799815951.png",
    "lastModified": "2026-04-10T05:43:36.235Z",
    "size": 1721330
  },
  ...
]
```

### `GET /api/votes/:imageKey`
`:imageKey` is URL-encoded.
```
200 OK
{
  "imageKey": "generated/avatars/arena_rock_1775799815951.png",
  "namedVoteCount": 39,
  "topGuesses": [
    { "name": "Emma Clarke", "count": 18 },
    { "name": "Sarah M.", "count": 12 },
    { "name": "Jennifer Aniston", "count": 9 }
  ]
}
```

### `POST /api/votes`
```
Request:
{
  "imageKey": "generated/avatars/arena_rock_1775799815951.png",
  "guessName": "Emma Clarke"
}

200 OK
{
  "success": true,
  "updatedTallies": {
    "namedVoteCount": 40,
    "topGuesses": [
      { "name": "Emma Clarke", "count": 19 },
      { "name": "Sarah M.", "count": 12 },
      { "name": "Jennifer Aniston", "count": 9 }
    ]
  }
}

400 Bad Request (validation failure or profanity)
{ "error": "Name contains inappropriate content." }

429 Too Many Requests (rate limit)
{ "error": "You have already voted on this image." }
```

### `GET /api/leaderboard`
```
200 OK
[
  {
    "imageKey": "generated/avatars/arena_rock_1775799815951.png",
    "imageUrl": "https://storage.googleapis.com/...",
    "namedVoteCount": 47,
    "topGuess": "Emma Clarke"
  },
  ...
]
```

---

## 8. Database Schema & Migrations

### Schema

```sql
-- Run on server startup if table does not exist
CREATE TABLE IF NOT EXISTS votes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  image_key   TEXT NOT NULL,
  guess_name  TEXT NOT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_image_key ON votes(image_key);
```

### Key Queries

```sql
-- Insert a vote
INSERT INTO votes (image_key, guess_name) VALUES (?, ?);

-- Top 3 named guesses for an image (excludes __unknown__)
SELECT guess_name, COUNT(*) AS vote_count
FROM votes
WHERE image_key = ? AND guess_name != '__unknown__'
GROUP BY guess_name
ORDER BY vote_count DESC
LIMIT 3;

-- Named vote count for an image (excludes __unknown__)
SELECT COUNT(*) AS named_vote_count
FROM votes
WHERE image_key = ? AND guess_name != '__unknown__';

-- All distinct existing names for deduplication check
SELECT DISTINCT guess_name
FROM votes
WHERE image_key = ? AND guess_name != '__unknown__';

-- Leaderboard: images ranked by named vote count
SELECT image_key,
       COUNT(*) AS named_vote_count,
       (
         SELECT guess_name FROM votes v2
         WHERE v2.image_key = v.image_key AND v2.guess_name != '__unknown__'
         GROUP BY v2.guess_name
         ORDER BY COUNT(*) DESC
         LIMIT 1
       ) AS top_guess
FROM votes v
WHERE guess_name != '__unknown__'
GROUP BY image_key
ORDER BY named_vote_count DESC;
```

### Future Migration Path

If traffic grows beyond SQLite's comfortable range, migrate to PostgreSQL by:
1. Exporting SQLite data to CSV via `.mode csv` + `.output`.
2. Creating an identical schema in PostgreSQL.
3. Importing the CSV dump.
4. Swapping `better-sqlite3` for `pg` in the service layer (all queries remain identical).

---

## 9. Component Architecture

```
App
├── NavBar
│   ├── Link → /
│   └── Link → /leaderboard
│
├── Route: / → GalleryPage
│   ├── SkeletonGrid (loading state)
│   └── ImageCard[] (one per valid image)
│       └── [on click] → dispatches openModal() to Zustand
│
├── Route: /leaderboard → LeaderboardPage
│   └── LeaderboardItem[] (thumbnail + rank + guess + count)
│       └── [on click] → dispatches openModal() to Zustand
│
├── Route: /image/:imageKey → GalleryPage (with modal pre-opened)
│
└── VoteModal (rendered at root level, reads from Zustand)
    ├── ModalImage
    ├── VoteTally (namedVoteCount + topGuessName)
    ├── VoteOptions (RadioGroup)
    │   ├── GuessOption[] (top 1–3 named guesses with count badge)
    │   └── IDontKnowOption (always last)
    ├── NewNameInput (text field)
    ├── SubmitButton
    └── ConfirmationMessage (post-submit state)
```

---

## 10. Testing Strategy

### Unit Tests (backend — vitest)

| Module | What to test |
|---|---|
| `gcsService` | XML parsing produces correct `contents` shape; sort order is correct; single-item edge case (not array) handled |
| `db/queries` | `insertVote` stores correctly; `getTopGuesses` returns top 3 in order; `__unknown__` excluded from all named queries |
| `deduplication` | Case-insensitive match reuses existing casing; novel name stored as submitted |
| `rate limiter` | Second vote on same image+IP returns 429 |
| `profanity filter` | Blocked names return 400; clean names pass |
| `input validation` | Missing fields, over-length names, invalid imageKey all return 400 |

### Component Tests (frontend — Vitest + RTL)

| Component | What to test |
|---|---|
| `ImageCard` | Renders image; calls onError when image fails; calls onClick |
| `VoteModal` | Renders top guesses; submit button disabled until selection; submit calls mutation; confirmation state shown on success; 429 message shown on rate limit |
| `GalleryPage` | Broken image key is removed from rendered list; skeleton shown during loading |
| `LeaderboardPage` | Items rendered in correct order; clicking opens modal |
| `NewNameInput` | Typing clears tile selection; empty string cannot submit |

### E2E Tests (Playwright)

Covered in QA-003 above. Run against a local server with a seeded SQLite database and a mocked GCS response.

### Manual QA Checklist

Run before every release:

- [ ] Gallery loads on Chrome, Firefox, Safari (desktop)
- [ ] Gallery loads on iOS Safari, Android Chrome (mobile)
- [ ] Broken image cards silently disappear
- [ ] Card shows correct named vote count and top guess name
- [ ] Modal opens on tap/click
- [ ] All 3 named guess options render with vote count badges
- [ ] "I don't know" option always renders last
- [ ] Selecting a tile enables Submit
- [ ] Typing a new name enables Submit and deselects tiles
- [ ] Submit records vote; tally updates in modal and on card
- [ ] Already-voted state shown after submission (including after page reload)
- [ ] Rate limiting: second vote within 24h shows correct message
- [ ] Leaderboard ranks by named vote count
- [ ] Shareable URL `/image/:imageKey` opens correct modal
- [ ] Keyboard navigation works through gallery and modal
- [ ] Escape key closes modal

---

## 11. Performance Requirements

| Metric | Target |
|---|---|
| `GET /api/images` response time | < 100ms (cache warm) |
| `POST /api/votes` response time | < 200ms |
| First Contentful Paint (FCP) | < 1.5s on 4G |
| Largest Contentful Paint (LCP) | < 2.5s on 4G |
| Gallery images | Lazy-loaded; no images below fold block initial render |
| GCS XML cache | Refreshed every 5 minutes; never fetched on a per-request basis |
| SQLite queries | All queries use the `idx_image_key` index; no full table scans |

---

## 12. Accessibility Requirements

Following WCAG 2.1 Level AA:

- All interactive elements reachable and operable by keyboard alone.
- Focus order is logical (left-to-right, top-to-bottom within the grid; tab through modal options in order).
- Focus is trapped inside the modal while open.
- Focus returns to the triggering card when modal closes.
- All images have `alt` text describing their content (e.g., "AI-generated portrait").
- Vote count badges have sufficient contrast (minimum 4.5:1).
- `aria-live="polite"` region announces vote confirmation after submission.
- Modal has `role="dialog"` and `aria-modal="true"` with a descriptive `aria-label`.

---

## 13. Security Requirements

- **No PII stored.** No usernames, emails, or identifiers are collected or stored.
- **Rate limiting** on `POST /api/votes` prevents vote flooding (IP-based, 1 per image per 24h).
- **Input validation** on all API endpoints: required fields, type checking, max lengths, imageKey whitelist against the GCS cache.
- **Profanity filtering** on all user-submitted `guessName` values.
- **CORS** restricted to known origins (frontend domain + localhost in dev).
- **No SQL injection risk** — all queries use `better-sqlite3` prepared statements with parameterized values.
- **GCS bucket is read-only.** The backend never writes to the bucket.
- **SQLite file** stored outside the web root; not accessible via any HTTP route.
- **Environment variables** are never committed to the repository (enforced via `.gitignore` + `.env.example`).

---

## 14. Deployment Architecture

```
User browser
    │
    ▼
[CDN / Static host]           [App server host (Railway / Render / Fly.io)]
  React SPA (Vite build)  ──► Express API (Node.js)
                                    │
                                    ├── SQLite (votes.db on persistent volume)
                                    │
                                    └── GCS bucket (read-only, XML + images)
                                        storage.googleapis.com/cabana-oasis-assets-next26/
```

**Recommended hosting:**

| Layer | Option | Notes |
|---|---|---|
| Frontend | Vercel or Netlify | Free tier sufficient; automatic deploys from `main`; global CDN |
| Backend | Railway or Fly.io | Persistent volume for SQLite; environment variable management |
| Database | SQLite on persistent disk | No separate service required |
| Images | GCS (direct) | No proxying; always-available public bucket |

**SQLite persistence note:** On Railway and Fly.io, persistent volumes must be explicitly provisioned and mounted at the `DB_PATH` directory. Without this, the SQLite file is lost on every deploy. This is the single most important infrastructure concern for this application.

---

## 15. Definition of Done

A ticket is considered **Done** when all of the following are true:

- [ ] Code is written and committed to a feature branch.
- [ ] All automated tests related to the ticket pass locally and in CI.
- [ ] No new ESLint or TypeScript errors introduced.
- [ ] The PR has been reviewed and approved by at least 1 team member.
- [ ] The feature has been manually tested by the author against the acceptance criteria.
- [ ] Any new environment variables are documented in `.env.example`.
- [ ] Any API changes are reflected in §7 of this document.
- [ ] The branch is merged to `develop` and the ticket is moved to Done in the tracker.

A **release** is considered Done when:

- [ ] All phase tickets are Done.
- [ ] QA manual checklist (§10) passes fully on the staging environment.
- [ ] The production smoke test (OPS-005) passes.
- [ ] No P0 or P1 bugs are open.

---

## 16. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| SQLite file lost on redeploy (no persistent volume) | High | Critical | Provision persistent volume before first deploy; document in runbook |
| GCS bucket XML format changes | Low | High | Unit test the parser; log warnings if `Contents` array is empty on refresh |
| Vote spam before rate limiting is live | Medium | Medium | Ship rate limiting in Phase 4 before launch; monitor DB growth |
| Inappropriate name submissions go live before profanity filter | Medium | High | Ship profanity filter in Phase 4; manual moderation window if needed |
| Image load times slow on large bucket | Medium | Medium | Lazy loading + skeleton states mask this; monitor LCP in production |
| GCS bucket becomes temporarily unavailable | Very Low | Low | In-memory cache serves last-known image list; bucket treated as always-available per PRD |
| SQLite bottleneck at scale | Low | Medium | Acceptable for MVP; migration path to PostgreSQL documented in §8 |
| CORS misconfiguration blocks frontend in production | Medium | High | Test CORS headers in OPS smoke test before announcing launch |

---

*End of Development Plan v1.0*
*For questions, contact the Tech Lead or Product Owner assigned to this project.*
