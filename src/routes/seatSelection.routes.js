import express from 'express';
import Show from '../models/show.models.js';
import { authenticate, requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET seat selection page
router.get('/:showId', authenticate, async (req, res, next) => {
  try {
    const show = await Show.findById(req.params.showId).populate('movie');
    if (!show) return res.status(404).send('Show not found');

    res.render('seatSelection', {
      show,
      movie: show.movie,
      user: req.user || null
    });
  } catch (error) {
    next(error);
  }
});

router.get('/seatSelection/:showId', async (req, res, next) => {
  try {
    const show = await Show.findById(req.params.showId);
    if (!show) return res.status(404).send('Show not found');

    res.render('seatSelection', { show });
  } catch (error) {
    next(error);
  }
});

// POST booking - requires authentication
router.post('/seatSelection/:showId/book', requireAuth, async (req, res, next) => {
  try {
    const { seats } = req.body; // seats is an array of seat numbers
    const show = await Show.findById(req.params.showId);
    if (!show) return res.status(404).send('Show not found');

    // Add new bookings, avoid duplicates
    show.bookedSeats = Array.from(new Set([...(show.bookedSeats || []), ...seats]));
    await show.save();

    res.redirect(`/seatSelection/${show._id}`);
  } catch (error) {
    next(error);
  }
});

router.get('/seatSelection/:movieId', async (req, res, next) => {
  try {
    const shows = await Show.find({ movieId: req.params.movieId });
    res.render('showSelection', { shows });
  } catch (error) {
    next(error);
  }
});

export default router;
