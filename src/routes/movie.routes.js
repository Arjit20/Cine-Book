import express from 'express';
import Show from '../models/show.models.js';

const router = express.Router();

// Get all movies/showtimes
router.get('/api/movies', async (req, res, next) => {
  try {
    const shows = await Show.find();
    res.json(shows);
  } catch (error) {
    next(error);
  }
});

export default router;