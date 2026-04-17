import { queries } from '../db/index.js';
import { Filter } from 'bad-words';

const filter = new Filter();

export const submitVote = (imageKey, guessName, ip) => {
  const trimmedName = guessName.trim();

  // Every vote is a straight +1 INSERT — no deletion, no IP deduplication.
  // The database is the single source of truth for cumulative vote tallies.

  if (trimmedName === '__unknown__') {
    queries.insertVote.run(imageKey, '__unknown__', ip);
    return getTallies(imageKey);
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

  queries.insertVote.run(imageKey, canonicalName, ip);

  return getTallies(imageKey);
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
