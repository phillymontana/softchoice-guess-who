# PRD — Guess Who: AI or Real?
**Product Requirements Document**
**Version:** 1.1
**Date:** April 16, 2026
**Status:** Draft

---

## Revision History

| Version | Date | Changes |
|---|---|---|
| 1.0 | April 16, 2026 | Initial draft |
| 1.1 | April 16, 2026 | Answered all open questions; updated data flow, vote tally rules, image filtering, gallery display, and voting anonymity model accordingly |

---

## 1. Overview

### 1.1 Product Summary

"Guess Who: AI or Real?" is a social guessing game where users are shown AI-generated portrait photos and collaboratively vote on who the person in the photo might be. It is designed as a mobile-first, responsive web application with a React.js frontend and a Node.js backend, and is accessible at any screen size.

### 1.2 Problem Statement

AI-generated portraits are proliferating rapidly across the internet, making it increasingly difficult for people to distinguish AI faces from real ones. This app turns that challenge into a playful, community-driven experience — surfacing crowd-sourced guesses while creating an entertaining social layer around AI-generated content.

### 1.3 Goals

- Allow users to browse and vote on AI-generated portrait photos.
- Surface the top community guesses per photo in a clear, ranked format.
- Give users the option to submit a new name guess or choose from existing ones.
- Display a live, community-visible named-guess tally for transparency and engagement (excluding "I don't know" votes from the count).
- Support both mobile and desktop viewports gracefully.
- Display all images from the GCS bucket that resolve to a valid image.

---

## 2. Target Users

| Persona | Description |
|---|---|
| Casual Player | Browses photos, votes on guesses for fun, no account required |
| Enthusiast | Returns regularly, submits new name guesses, tracks popular votes |
| Spectator | Watches tallies change without voting |

---

## 3. Tech Stack

### 3.1 Frontend
- **Framework:** React.js (Vite)
- **Styling:** Tailwind CSS + shadcn/ui components
- **State Management:** React Query (for server state) + Zustand (for local UI state)
- **Routing:** React Router v6
- **HTTP Client:** Axios

### 3.2 Backend
- **Runtime:** Node.js (Express.js)
- **API:** REST
- **Database:** **SQLite via better-sqlite3** *(see Section 3.3)*
- **Image Source:** Google Cloud Storage (public bucket, XML listing — always available)
- **Hosting:** Any Node-compatible host (Railway, Render, Fly.io, etc.)

### 3.3 Database Recommendation: SQLite

**Recommended database: SQLite (via `better-sqlite3`)**

**Why SQLite?**

SQLite is the right choice for this application at its current scale because it requires zero infrastructure setup, runs embedded within the Node.js process, needs no separate database server or credentials, and stores all data in a single portable `.db` file. It supports concurrent reads well and handles the write load of a voting app with thousands of users without issue. If the app scales beyond tens of thousands of daily active users, a migration path to PostgreSQL is straightforward since the schema is simple.

**Alternatives considered:**

| Database | Verdict |
|---|---|
| PostgreSQL | Best for scale, but overkill for MVP; requires a managed DB service |
| MongoDB | Flexible schema but unnecessary for this structured voting model |
| Redis | Excellent for real-time tallies but needs pairing with a persistent DB |
| LowDB (JSON file) | Too fragile for concurrent writes under any real load |
| **SQLite** | ✅ **Recommended** — embedded, zero-config, fast, portable |

---

## 4. Data Architecture

### 4.1 Image Data Flow

1. On app load (or on a scheduled cache-refresh interval), the backend fetches the XML listing from the GCS bucket:
   `https://storage.googleapis.com/cabana-oasis-assets-next26/`
2. Each `<Contents>` element is parsed and stored in-memory as an object array (`contents`).
3. The array is sorted descending by `<LastModified>` into `contentsSorted`.
4. The image URL for each item is constructed as:
   `https://storage.googleapis.com/cabana-oasis-assets-next26/` + `<Key>`
   Example: `https://storage.googleapis.com/cabana-oasis-assets-next26/generated/avatars/arena_rock_1775799815951.png`
5. **All items in `contentsSorted` are served** to the frontend via `/api/images` — there is no maximum cap on the number of images shown.
6. The frontend attempts to load each image. If an image fails to load (HTTP error, broken URL, or non-image file), that card is silently hidden from the gallery. No placeholder is shown for failed images.
7. The GCS bucket is treated as always-available; no backend proxy of image files is needed.

### 4.2 `<Contents>` Object Schema

```js
// Single item in `contents` array
{
  key: "generated/avatars/arena_rock_1775799815951.png",
  generation: "1775799816230562",
  metaGeneration: "1",
  lastModified: "2026-04-10T05:43:36.235Z",
  etag: "f58766f5d5f4d48c88634232c4a8b2d6",
  size: 1721330,
  imageUrl: "https://storage.googleapis.com/cabana-oasis-assets-next26/generated/avatars/arena_rock_1775799815951.png"
}
```

### 4.3 SQLite Schema

**Table: `votes`**

```sql
CREATE TABLE votes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  image_key   TEXT NOT NULL,
  guess_name  TEXT NOT NULL,       -- the name submitted by a user, or "__unknown__"
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_image_key ON votes(image_key);
```

**Derived query — top named guesses per image (excludes "I don't know"):**

```sql
SELECT guess_name, COUNT(*) AS vote_count
FROM votes
WHERE image_key = ?
  AND guess_name != '__unknown__'
GROUP BY guess_name
ORDER BY vote_count DESC
LIMIT 3;
```

**Derived query — total named vote count shown on card (excludes "I don't know"):**

```sql
SELECT COUNT(*) AS named_vote_count
FROM votes
WHERE image_key = ?
  AND guess_name != '__unknown__';
```

---

## 5. Features & Requirements

### 5.1 Image Gallery (Home Screen)

- Displays **all** images from `contentsSorted` in a responsive card grid — no pagination, no cap.
- Cards are sorted newest-first by `LastModified`.
- If a card's image fails to load, the card is **silently removed** from the layout (no broken image placeholder, no error state shown to the user).
- **Desktop:** 4-column grid.
- **Tablet:** 3-column grid.
- **Large mobile:** 2-column grid.
- **Mobile:** 1 or 2-column grid (based on viewport width).
- Each visible card shows:
  - The portrait photo (lazy-loaded).
  - The **named vote count** for that image (excludes "I don't know" votes).
  - The top current named guess (if any named votes exist).
- Skeleton loading state while images are loading.

### 5.2 Voting Anonymity Model

- Votes are fully anonymous. No user identity is stored or required.
- Voting options (the top named guesses from other users) are visible to all users **before** they vote — the existing community guesses are displayed openly in the modal.
- A user's own submitted vote is never attributed to them publicly or privately.

### 5.3 Vote Modal

Triggered when a user taps/clicks any image card.

**Modal contents:**
- Full-size portrait photo (with aspect-ratio preserved).
- Image metadata: upload date, named vote count.
- **Voting section** — up to 4 options, presented as radio buttons or tap-to-select tiles:
  1. Top named guess #1 (with vote count badge) — shown if ≥ 1 vote exists
  2. Top named guess #2 (with vote count badge) — shown if ≥ 1 vote exists
  3. Top named guess #3 (with vote count badge) — shown if ≥ 1 vote exists
  4. **"I don't know"** — always shown as the last option
- **"Suggest a new name" input field** — a text input allowing users to type and submit a new name guess. Submitting a name that already exists (case-insensitive match) increments its existing count rather than creating a duplicate entry.
- A **"Submit Vote"** button that:
  - Records the vote in the SQLite database.
  - Refreshes the named vote tally for the image in real time.
  - Shows a confirmation state after submission.
- **Close button** (top-right ✕) and click-outside-to-dismiss.
- Keyboard-accessible (Escape closes modal).

### 5.4 Vote Tally Display

- **Cards:** Show the named vote count (integer) and the top named guess name. "I don't know" votes do not contribute to this count.
- **Modal:** Shows all top-3 named guesses with individual vote counts. "I don't know" is always listed last with no count badge (it is an option, not a ranked guess).
- Tallies update immediately after a vote is submitted (optimistic update + server refetch).
- A global "Most Voted" leaderboard page (see Section 5.7) ranks images by named vote count.

### 5.5 Name Input & Deduplication

- User-submitted names are trimmed and compared case-insensitively for deduplication.
- Display names are stored in their original casing as first submitted.
- If a submitted name matches an existing guess (case-insensitive), the vote is added to the existing entry — no duplicate name is created.
- A minimum of **1 vote** is required for a name to appear as a top-guess option in the modal.

### 5.6 "I Don't Know" Option

- Always rendered as the 4th and final option in the modal, regardless of how many named guesses exist.
- Stored in the database as the literal string `"__unknown__"`.
- **Does not count** toward the named vote tally shown on cards or in the modal vote counts.
- Is excluded from the leaderboard ranking logic.

### 5.7 Leaderboard / Most Voted Page

- A secondary page listing all images sorted by **named vote count** descending (excludes "I don't know" votes from ranking).
- Shows image thumbnail, top named guess, and named vote count per image.
- Useful for surfacing "fan favorites" and popular photos.

### 5.8 Responsive Design

| Breakpoint | Layout |
|---|---|
| < 480px (mobile) | 1-column card grid, full-screen modal |
| 480–768px (large mobile) | 2-column card grid, centered modal |
| 768–1280px (tablet/small desktop) | 3-column card grid, centered modal with max-width |
| > 1280px (desktop) | 4-column card grid, centered modal with max-width |

---

## 6. API Endpoints

### `GET /api/images`
Returns all items in `contentsSorted` — parsed from GCS bucket XML, sorted newest-first, no limit.

**Response:**
```json
[
  {
    "key": "generated/avatars/arena_rock_1775799815951.png",
    "imageUrl": "https://storage.googleapis.com/cabana-oasis-assets-next26/generated/avatars/arena_rock_1775799815951.png",
    "lastModified": "2026-04-10T05:43:36.235Z",
    "size": 1721330
  }
]
```

### `GET /api/votes/:imageKey`
Returns vote tallies for a specific image. Named vote count excludes "I don't know" votes.

**Response:**
```json
{
  "imageKey": "generated/avatars/arena_rock_...",
  "namedVoteCount": 39,
  "topGuesses": [
    { "name": "Emma Clarke", "count": 18 },
    { "name": "Sarah M.", "count": 12 },
    { "name": "Jennifer Aniston", "count": 9 }
  ]
}
```

### `POST /api/votes`
Submits a vote. `guessName` may be any string or `"__unknown__"` for "I don't know."

**Request body:**
```json
{
  "imageKey": "generated/avatars/arena_rock_...",
  "guessName": "Emma Clarke"
}
```

**Response:**
```json
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
```

### `GET /api/leaderboard`
Returns all images with votes, sorted by `namedVoteCount` descending. "I don't know" votes excluded from ranking.

---

## 7. Out of Scope for MVP

The following are explicitly excluded from v1.0 but noted for future consideration:

- User accounts / authentication
- Per-user vote history
- Admin dashboard for moderating guesses
- Real-time vote updates via WebSocket (polling is acceptable for MVP)
- Sharing individual image cards to social media
- Comment threads per image
- Reported/flagged guesses

---

## 8. Missing Features & Suggestions

The following are gaps or improvements that should be considered before or shortly after launch:

### 8.1 Anti-Spam / Rate Limiting
Without user accounts, a single user can vote unlimited times. **Recommended:** IP-based rate limiting per image per time window (e.g., 1 vote per image per IP per 24 hours) using `express-rate-limit`.

### 8.2 Vote Fingerprinting
Use a browser fingerprint (hashed combination of user-agent, screen resolution, timezone) stored in `localStorage` to prevent the same browser from voting multiple times on the same image — even across sessions.

### 8.3 Image Caching / CDN
The GCS bucket XML listing should be cached server-side and refreshed on a schedule (e.g., every 5 minutes via a cron job) rather than fetched on every API request. Images are served directly from the public GCS bucket — no proxying required.

### 8.4 Accessibility (a11y)
- Full keyboard navigation for the gallery and modal.
- ARIA labels on all interactive elements.
- Focus trap inside the open modal.
- Sufficient color contrast ratios on vote count badges.

### 8.5 Moderation / Profanity Filter
User-submitted names should be filtered for profanity or offensive content before being stored. A basic blocklist approach or integration with a moderation API (e.g., Perspective API) is recommended.

### 8.6 Analytics
Integrate a lightweight analytics tool (e.g., Plausible, PostHog) to understand which images attract the most named votes, where users drop off, and what percentage choose "I don't know."

### 8.7 SEO & Share Metadata
Each image card (or a dedicated image detail page) should have shareable URLs with Open Graph meta tags so users can share individual photos to social media.

### 8.8 Image Categorization
The GCS bucket key path includes category hints (e.g., `arena_rock_` prefix). These could be used to add filter buttons in the gallery (e.g., "Show: Rock Stars | Politicians | Scientists").

### 8.9 "Reveal" Feature (Future)
If the true identity of any photo's subject is ever known, the app could surface a "Reveal" mode that shows the correct answer after a user votes — increasing engagement and replay value.

### 8.10 Dark Mode
Implement a system-aware and user-toggleable dark mode using Tailwind's `dark:` variant classes and shadcn/ui's theming.

### 8.11 PWA Support
Convert the app to a Progressive Web App so users can install it on their home screen and receive push notifications when a photo they voted on gets a new top guess.

---

## 9. Success Metrics

| Metric | Target (3 months post-launch) |
|---|---|
| Monthly Active Users | 5,000+ |
| Named votes per session | ≥ 3 |
| % sessions that submit a new name | ≥ 15% |
| Return visit rate (7-day) | ≥ 25% |
| Average page load time | < 2s on 4G |
| "I don't know" selection rate | < 50% (indicates photos are engaging enough to guess) |

---

## 10. Milestones

| Milestone | Description | Target |
|---|---|---|
| M1 — Backend Foundation | GCS XML parsing, SQLite setup, REST API | Week 1–2 |
| M2 — Frontend Gallery | Responsive card grid, image load filtering, sorting | Week 2–3 |
| M3 — Vote Modal | Voting UI, submit flow, named tally display | Week 3–4 |
| M4 — Polish & Testing | Error states, loading states, a11y, rate limiting | Week 4–5 |
| M5 — Leaderboard | Most-voted page (named votes), share metadata | Week 5–6 |
| M6 — Launch | Deploy to production, monitor analytics | Week 6 |

---

## 11. Resolved Questions

The following questions from v1.0 have been answered and their decisions incorporated into the relevant sections above.

| # | Question | Decision |
|---|---|---|
| 1 | Should votes be anonymous forever? | Yes — all votes are fully anonymous. Voting options are visible to all users before they vote, but individual votes are never attributed to anyone. |
| 2 | Should images be proxied through the backend? | No — the GCS bucket is always publicly available. Images are served directly from GCS; no backend proxy is needed. |
| 3 | Should "I don't know" votes count toward the tally on cards? | No — "I don't know" votes are recorded but excluded from named vote counts displayed on cards, in modals, and in leaderboard rankings. |
| 4 | What happens if the bucket contains non-portrait images? | If an image fails to load, the card is silently hidden from the gallery. No placeholder or error state is shown. |
| 5 | Minimum vote threshold for a name to appear as a top-guess option? | 1 vote — any name with at least 1 vote is eligible to appear as a top-guess option. |
| 6 | Maximum number of images shown? | No cap — all contents from the GCS bucket are shown (subject to successful image load). |

---

*End of PRD v1.1*
