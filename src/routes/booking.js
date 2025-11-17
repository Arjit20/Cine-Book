const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Show = require('../models/Show');
const { sendBookingConfirmation } = require('../utils/mailer');
const { authenticate, requireAuth } = require('../middleware/auth');

// Book tickets
router.post('/book', authenticate, requireAuth, async (req, res) => {
	try {
		const { showId, seats, userEmail, email, phoneNumber } = req.body;
		const recipientEmail = (userEmail || email || req.user.email || '').toString().trim();

		if (!recipientEmail) {
			return res.status(400).json({ success: false, message: 'Recipient email is required' });
		}
		if (!showId || !seats || seats.length === 0) {
			return res.status(400).json({ success: false, message: 'Show ID and seats are required' });
		}

		const show = await Show.findById(showId).populate('movie');
		if (!show) {
			return res.status(404).json({ success: false, message: 'Show not found' });
		}

		const unavailableSeats = seats.filter(seat => show.bookedSeats.includes(seat));
		if (unavailableSeats.length > 0) {
			return res.status(400).json({ success: false, message: `Seats already booked: ${unavailableSeats.join(', ')}` });
		}

		const booking = new Booking({
			user: req.user._id, // for "My Bookings"
			show: showId,
			seats,
			recipientEmail, // for ticket delivery
			phoneNumber,
			totalPrice: seats.length * show.price,
		});
		await booking.save();

		show.bookedSeats.push(...seats);
		await show.save();

		await sendBookingConfirmation(recipientEmail, {
			showId,
			seats: seats.join(', '),
			date: show.showTime,
			movieTitle: show.movie ? show.movie.title : 'Movie',
			bookingId: booking._id,
		});

		return res.json({
			success: true,
			message: 'Booking confirmed. Confirmation email sent.',
			booking: { _id: booking._id, seats, recipientEmail, totalPrice: booking.totalPrice }
		});
	} catch (err) {
		return res.status(500).json({ success: false, message: 'Booking failed', error: err.message });
	}
});

// Get user's bookings
router.get('/my-bookings', authenticate, requireAuth, async (req, res) => {
	try {
		const bookings = await Booking.find({ user: req.user._id })
			.populate({ path: 'show', populate: { path: 'movie' } })
			.sort({ createdAt: -1 });
		return res.json({ success: true, bookings });
	} catch (err) {
		return res.status(500).json({ success: false, message: 'Failed to fetch bookings', error: err.message });
	}
});

module.exports = router;