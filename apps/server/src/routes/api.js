import express from 'express';
import * as gcsService from '../services/gcsService.js';
import * as voteService from '../services/voteService.js';

const router = express.Router();

router.get('/images', (req, res) => {
  res.json(gcsService.getImages());
});

router.get('/votes/:imageKey', (req, res) => {
  try {
    const { imageKey } = req.params;
    const decodedKey = decodeURIComponent(imageKey);
    res.json(voteService.getTallies(decodedKey));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Pass req.ip to support vote replacement/negation
router.post('/votes', (req, res) => {
  try {
    const { imageKey, guessName } = req.body;

    if (!imageKey || !guessName) {
      return res.status(400).json({ error: 'imageKey and guessName are required.' });
    }

    if (guessName.length > 100) {
      return res.status(400).json({ error: 'Name must be 100 characters or less.' });
    }

    // Verify imageKey exists in cache
    if (!gcsService.getImageByKey(imageKey)) {
      return res.status(400).json({ error: 'Invalid image key.' });
    }

    const updatedTallies = voteService.submitVote(imageKey, guessName, req.ip);

    res.json({ success: true, updatedTallies });
  } catch (error) {
    const statusCode = error.message.includes('inappropriate') ? 400 : 500;
    res.status(statusCode).json({ error: error.message });
  }
});

router.get('/leaderboard', (req, res) => {
  try {
    const leaderboard = voteService.getLeaderboard().map(item => {
      const img = gcsService.getImageByKey(item.imageKey);
      return {
        ...item,
        imageUrl: img ? img.imageUrl : null
      };
    });
    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
