import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
});

export const getImages = async () => {
  const response = await api.get('/images');
  return response.data;
};

export const getVotes = async (imageKey) => {
  const response = await api.get(`/votes/${encodeURIComponent(imageKey)}`);
  return response.data;
};

export const submitVote = async (voteData) => {
  const response = await api.post('/votes', voteData);
  return response.data;
};

export const getLeaderboard = async () => {
  const response = await api.get('/leaderboard');
  return response.data;
};

export default api;
