import { queries } from '../db/index.js';
import { Filter } from 'bad-words';

const filter = new Filter();

export const submitVote = (imageKey, guessName, ip) => {
  const trimmedName = guessName.trim();
  
  // First, negate/delete any previous vote from this IP for this image
  if (ip) {
    queries.deleteUserVote.run(imageKey, ip);
  }

  if (trimmedName === '__unknown__') {
    queries.insertVote.run(imageKey, '__unknown__', ip);
    return getTallies(imageKey);
  }

  // Profanity filter
  if (filter.isProfane(trimmedName)) {
    throw new Error('Name contains inappropriate content.');
  }

  // Deduplication logic
  const existingNames = queries.getDistinctNames.all(imageKey);
  const lowercaseNewName = trimmedName.toLowerCase();
  
  const match = existingNames.find(existing => existing.guess_name.toLowerCase() === lowercaseNewName);
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
