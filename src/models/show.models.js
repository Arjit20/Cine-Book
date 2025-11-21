import mongoose from 'mongoose';

const showSchema = new mongoose.Schema({
  movieId: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie' },
  timing: String,
  bookedSeats: [String], // Array of booked seat numbers for this show
  // Pricing: base price and optional weekday/weekend overrides
  price: { type: Number, default: 250 },
  pricing: {
    weekday: { type: Number },
    weekend: { type: Number }
  }
});

export default mongoose.model('Show', showSchema);
