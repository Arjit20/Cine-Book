import mongoose from 'mongoose';

const showSchema = new mongoose.Schema({
  movieId: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie' },
  timing: String,
  bookedSeats: [String] // Array of booked seat numbers for this show
});

export default mongoose.model('Show', showSchema);
