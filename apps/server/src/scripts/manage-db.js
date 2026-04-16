import Database from 'better-sqlite3';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const dbPath = process.env.DB_PATH || './data/votes.db';
const db = new Database(dbPath);

const action = process.argv[2];

if (action === 'clear') {
  console.log('⚠️  Clearing all votes from database...');
  db.prepare('DELETE FROM votes').run();
  console.log('✅  Database cleared.');
  console.log('\n💡  IMPORTANT: To fully reset for testing:');
  console.log('    1. Restart this server (to clear IP rate limits and in-memory maps)');
  console.log('    2. Click the "Info" icon in the Website NavBar (to clear your browser LocalStorage)');
} else if (action === 'view') {
  const votes = db.prepare('SELECT * FROM votes ORDER BY created_at DESC LIMIT 20').all();
  console.log('\n--- Latest 20 Votes ---');
  if (votes.length === 0) {
    console.log('No votes found.');
  } else {
    console.table(votes);
  }
} else {
  console.log('\nUsage:');
  console.log('  npm run db:view  - Show recent entries');
  console.log('  npm run db:clear - Delete ALL entries');
}
