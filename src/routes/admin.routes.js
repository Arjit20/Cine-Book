import express from 'express';
import Movie from '../models/movie.models.js';
import Show from '../models/show.models.js';
import Booking from '../models/booking.models.js';

const router = express.Router();

// Movies API
router.get('/movies', async (req, res) => {
  try {
    const movies = await Movie.find();
    res.json(movies);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch movies' });
  }
});

router.post('/movies', async (req, res) => {
  try {
    const movie = new Movie(req.body);
    await movie.save();
    res.status(201).json(movie);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create movie' });
  }
});

router.put('/movies/:id', async (req, res) => {
  try {
    const movie = await Movie.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!movie) return res.status(404).json({ error: 'Movie not found' });
    res.json(movie);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update movie' });
  }
});

router.delete('/movies/:id', async (req, res) => {
  try {
    const movie = await Movie.findByIdAndDelete(req.params.id);
    if (!movie) return res.status(404).json({ error: 'Movie not found' });
    res.json({ message: 'Movie deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete movie' });
  }
});

// Shows API
router.get('/shows', async (req, res) => {
  try {
    const shows = await Show.find().populate('movieId');
    res.json(shows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shows' });
  }
});

router.post('/shows', async (req, res) => {
  try {
    const { movieId, timing, price } = req.body;
    
    // Get movie title for the show
    const movie = await Movie.findById(movieId);
    if (!movie) return res.status(404).json({ error: 'Movie not found' });
    
    const show = new Show({
      movieId,
      timing,
      price: price || 250,
      movieTitle: movie.title,
      bookedSeats: []
    });
    
    await show.save();
    res.status(201).json(show);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create show' });
  }
});

router.delete('/shows/:id', async (req, res) => {
  try {
    const show = await Show.findByIdAndDelete(req.params.id);
    if (!show) return res.status(404).json({ error: 'Show not found' });
    res.json({ message: 'Show deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete show' });
  }
});

// Bookings API
router.get('/bookings', async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('movieId', 'title')
      .populate('showId', 'timing')
      .sort({ bookingDate: -1 });
    
    // Add movie title to each booking for easier display
    const bookingsWithTitles = bookings.map(booking => ({
      ...booking.toObject(),
      movieTitle: booking.movieId?.title || 'Unknown Movie'
    }));
    
    res.json(bookingsWithTitles);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

router.put('/bookings/:id/cancel', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    
    // Update booking status
    booking.status = 'cancelled';
    await booking.save();
    
    // Remove seats from show's booked seats
    await Show.findByIdAndUpdate(booking.showId, {
      $pull: { bookedSeats: { $in: booking.seats } }
    });
    
    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

export default router;

