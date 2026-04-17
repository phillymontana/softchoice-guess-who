import { queries } from '../db/index.js';
import { Filter } from 'bad-words';

const filter = new Filter();

/**
 * Submit a vote. Each call inserts a new row (+1 to the tally).
 * If the user is changing a previous vote, pass previousVoteId — that row is
 * deleted first (swap), so the net total stays accurate.
 * Returns the updated tallies plus the new row's voteId for the client to store.
 */
export const submitVote = (imageKey, guessName, ip, previousVoteId = null) => {
  const trimmedName = guessName.trim();

  // If changing a vote, atomically remove the old row first
  if (previousVoteId) {
    queries.deleteVoteById.run(previousVoteId);
  }

  if (trimmedName === '__unknown__') {
    const { lastInsertRowid } = queries.insertVote.run(imageKey, '__unknown__', ip);
    return { ...getTallies(imageKey), voteId: Number(lastInsertRowid) };
  }

  // Profanity filter
  if (filter.isProfane(trimmedName)) {
    throw new Error('Name contains inappropriate content.');
  }

  // Canonicalise the name (case-insensitive merge so "Ron" and "ron" share one bucket)
  const existingNames = queries.getDistinctNames.all(imageKey);
  const lowercaseNewName = trimmedName.toLowerCase();
  const match = existingNames.find(e => e.guess_name.toLowerCase() === lowercaseNewName);
  const canonicalName = match ? match.guess_name : trimmedName;

  const { lastInsertRowid } = queries.insertVote.run(imageKey, canonicalName, ip);

  return { ...getTallies(imageKey), voteId: Number(lastInsertRowid) };
};


export const getTallies = (imageKey) => {
  const namedVoteCount = queries.getNamedVoteCount.get(imageKey).named_vote_count;
  const topGuesses = queries.getTopGuesses.all(imageKey).map(row => ({
    name: row.guess_name,
    count: row.vote_count
  }));

  return {
    imageKey,
    namedVoteCount,
    topGuesses
  };
};

export const getLeaderboard = () => {
  return queries.getLeaderboard.all().map(row => ({
    imageKey: row.image_key,
    namedVoteCount: row.named_vote_count,
    topGuess: row.top_guess
  }));
};
