const express = require('express');
const router = express.Router();
import Show from '../models/show.models.js';
const auth = require('../middleware/auth');

// GET seat selection page
router.get('/:showId', auth.optional, async (req, res, next) => {
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

// POST booking
router.post('/seatSelection/:showId/book', async (req, res, next) => {
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

module.exports = router;
