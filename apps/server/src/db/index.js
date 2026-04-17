import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const dbPath = process.env.DB_PATH || './data/votes.db';

// Ensure data directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Initialize table (for fresh databases)
db.exec(`
  CREATE TABLE IF NOT EXISTS votes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    image_key   TEXT NOT NULL,
    guess_name  TEXT NOT NULL,
    ip          TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_image_key ON votes(image_key);
`);

// Migration: Add ip column if it doesn't exist (must run BEFORE creating the ip index)
try {
  db.prepare("ALTER TABLE votes ADD COLUMN ip TEXT").run();
} catch (e) {
  // Column already exists — this is expected on a fresh or already-migrated database
}

// Create ip index only after the column is guaranteed to exist
try {
  db.exec("CREATE INDEX IF NOT EXISTS idx_ip_image ON votes(ip, image_key);");
} catch (e) {
  // Index already exists
}


export default db;

// Query helpers
export const queries = {
  // Every vote is a straight +1 — no delete/dedup
  insertVote: db.prepare('INSERT INTO votes (image_key, guess_name, ip) VALUES (?, ?, ?)'),
  
  getTopGuesses: db.prepare(`
    SELECT guess_name, COUNT(*) AS vote_count
    FROM votes
    WHERE image_key = ? AND guess_name != '__unknown__'
    GROUP BY guess_name
    ORDER BY vote_count DESC
    LIMIT 3
  `),
  
  getNamedVoteCount: db.prepare(`
    SELECT COUNT(*) AS named_vote_count
    FROM votes
    WHERE image_key = ? AND guess_name != '__unknown__'
  `),
  
  getDistinctNames: db.prepare(`
    SELECT DISTINCT guess_name
    FROM votes
    WHERE image_key = ? AND guess_name != '__unknown__'
  `),
  
  getLeaderboard: db.prepare(`
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
    ORDER BY named_vote_count DESC
  `)
};
