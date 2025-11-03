import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  movieId: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true },
  showId: { type: mongoose.Schema.Types.ObjectId, ref: 'Show', required: true },
  seats: [{ type: String, required: true }], // Array of seat numbers like ['A1', 'A2']
  totalAmount: { type: Number, required: true },
  bookingDate: { type: Date, default: Date.now },
  showDate: { type: Date, required: true },
  showTime: { type: String, required: true },
  status: { type: String, enum: ['confirmed', 'cancelled'], default: 'confirmed' },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'paid' },
  phoneNumber: { type: String, required: true },
  email: { type: String, required: true },
  ticketId: { type: String, unique: true, required: true }
});

// Generate unique ticket ID
bookingSchema.pre('save', function(next) {
  if (!this.ticketId) {
    this.ticketId = `TKT${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  }
  next();
});

export default mongoose.model('Booking', bookingSchema);

