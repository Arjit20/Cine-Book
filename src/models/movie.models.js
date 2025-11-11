import mongoose from 'mongoose';

const movieSchema = new mongoose.Schema({
  title: String,
  genre: String,
  language: String,
  duration: Number,
  rating: Number,
  description: String,
  posterUrl: String,
  bookings: [String], // Array of booked seat numbers
  shows: [{
    theater: String,
    startTime: Date,
    bookedSeats: [String]
  }]
});

const Movie = mongoose.model('Movie', movieSchema);
export default Movie;