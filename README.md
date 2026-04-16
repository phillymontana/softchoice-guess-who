# 🤖 Guess Who: AI or Real?

> A community-driven social guessing game where players collaboratively identify AI-generated portraits.

![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=flat-square&logo=sqlite&logoColor=white)
![License](https://img.shields.io/badge/License-ISC-blue?style=flat-square)

---

## ✨ Features

- 🖼️ **AI Portrait Gallery** — Browse hundreds of AI-generated portraits served directly from Google Cloud Storage, sorted newest first
- 🗳️ **Anonymous Community Voting** — Click any portrait to open the vote modal and guess who the AI was trying to portray
- 🔄 **Change Your Vote** — Changed your mind? Update your guess at any time — the database only ever keeps your most recent vote per image
- 📊 **Live Tallies** — Vote counts and top community guesses update in real-time after every submission
- 🏆 **Leaderboard** — See which portraits have received the most community engagement
- 🛡️ **Profanity Filter** — All submitted names are screened before being saved
- 💾 **Persistent SQLite Database** — All votes survive server restarts and redeployments

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite 6, Tailwind CSS 4 |
| **State Management** | TanStack Query (server state), Zustand (UI state) |
| **Backend** | Node.js 20, Express 4 |
| **Database** | SQLite via `better-sqlite3` |
| **Images** | Google Cloud Storage (public bucket) |
| **Process Management** | PM2 (production) / Nodemon (development) |

---

## 📁 Project Structure

```
softchoice-guess-who/
├── apps/
│   ├── client/               # React/Vite frontend
│   │   └── src/
│   │       ├── components/   # ImageCard, VoteModal, NavBar
│   │       ├── hooks/        # useImages, useVotes
│   │       ├── pages/        # GalleryPage, LeaderboardPage
│   │       ├── services/     # axios API client
│   │       └── store/        # Zustand modal store
│   └── server/               # Node.js/Express backend
│       └── src/
│           ├── db/           # SQLite schema & queries
│           ├── routes/       # API route handlers
│           ├── scripts/      # DB management utilities
│           └── services/     # GCS image fetching, voting logic
├── package.json              # NPM workspaces root
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- npm 9+

### Install & Run

```bash
# Clone the repository
git clone https://github.com/phillymontana/softchoice-guess-who.git
cd softchoice-guess-who

# Install all dependencies (client + server)
npm install

# Start both client and server in development mode
npm run dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3001/api |

### Environment Variables

Create `apps/server/.env` based on the example:

```bash
cp apps/server/.env.example apps/server/.env
```

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Backend server port |
| `NODE_ENV` | `development` | Environment mode |
| `GCS_BUCKET_URL` | *(see .env.example)* | Public GCS bucket URL |
| `GCS_CACHE_TTL_SECONDS` | `300` | How often to refresh the image list |
| `DB_PATH` | `./data/votes.db` | Path to the SQLite database file |

---

## 🗄️ Database Management

The project includes built-in CLI scripts to manage the SQLite database:

```bash
# View the 20 most recent vote entries
npm run db:view

# Delete ALL votes (full reset)
npm run db:clear
```

> **To fully reset the app for a fresh demo:** run `npm run db:clear`, restart the server, and click the reset icon in the app's navbar to clear the browser's local vote history.

---

## 🌐 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/images` | Returns all images sorted newest first |
| `GET` | `/api/votes/:imageKey` | Returns vote tallies for a single image |
| `POST` | `/api/votes` | Submit or update a vote |
| `GET` | `/api/leaderboard` | Returns top-voted images |
| `GET` | `/api/health` | Health check |

### POST `/api/votes`

```json
{
  "imageKey": "generated/avatars/arena_rock_1775799815951.png",
  "guessName": "David Bowie"
}
```

Submit `"__unknown__"` as `guessName` to record an "I don't know" vote. The server replaces any prior vote from the same IP address, so each user always has exactly one active vote per image.

---

## ☁️ Deployment

This app is designed to deploy to a single **Google Compute Engine `e2-micro` VM** (always free tier) using nginx as a reverse proxy.

See [deployment_guide.md](./docs/deployment_guide.md) for full step-by-step instructions including:
- VM setup and SSH access
- nginx configuration
- PM2 process management
- Free HTTPS via Let's Encrypt

---

## 📜 License

ISC © Softchoice
