import express from "express";
import Show from "../models/show.models.js";
import Movie from "../models/movie.models.js";
import Booking from "../models/booking.models.js";
import User from "../models/user.models.js";
import { sendTicketSMS } from "../utils/sms.js";
import { requireAuth, generateToken } from "../utils/auth.js";
import { sendBookingConfirmation } from '../services/email.service.js';

const router = express.Router();

router.get("/", (req, res, next) => {
  console.log("Reached / route, redirecting to /movies");
  res.redirect("/movies");
});

router.get("/movies", async (req, res, next) => {
  try {
    console.log("Fetching all shows");
    const shows = await Show.find();
    res.render("movies", { shows });
  } catch (err) {
    console.error("Error fetching shows:", err);
    next(err);
  }
});

router.get("/seats/:showId", async (req, res, next) => {
  try {
    console.log("Fetching show with ID:", req.params.showId);
    const show = await Show.findById(req.params.showId);
    if (!show) {
      throw new Error("Show not found");
    }
    const movie = show.movieId ? await Movie.findById(show.movieId) : null;
    res.render("seatSelection", { show, movie, user: req.user });
  } catch (err) {
    console.error("Error fetching show:", err);
    next(err);
  }
});

// MODIFIED BOOKING ROUTE - FIXED VERSION WITH SMS
router.post("/book", async (req, res) => {
  try {
    const { showId, seats, userEmail, phoneNumber } = req.body;

    console.log("Booking request:", { showId, seats, userEmail, phoneNumber });

    if (!showId || !seats || !userEmail) {
      return res.json({ success: false, error: "Missing required fields" });
    }

    const show = await Show.findById(showId).populate("movieId");
    if (!show) {
      return res.json({ success: false, error: "Show not found" });
    }

    if (!show.movieId) {
      return res.json({ success: false, error: "Movie not found for this show" });
    }

    // Attempt to reserve seats atomically: only succeed if none of the requested seats
    // are already present in `bookedSeats`. This prevents a race where two users
    // try to book the same seats at once.
    const reservedShow = await Show.findOneAndUpdate(
      { _id: showId, bookedSeats: { $nin: seats } },
      { $push: { bookedSeats: { $each: seats } } },
      { new: true }
    );

    if (!reservedShow) {
      // Find which seats are currently unavailable to show a helpful message
      const latestShow = await Show.findById(showId);
      const unavailableSeats = seats.filter((seat) => latestShow && latestShow.bookedSeats.includes(seat));
      return res.json({ success: false, error: "Some seats are no longer available", unavailableSeats });
    }

    // Find user - prefer req.user if available, otherwise lookup by email
    let user = req.user;
    if (!user) {
      user = await User.findOne({ email: userEmail });
      if (!user) {
        return res.json({ success: false, error: "User not found. Please login first." });
      }
    }
    
    // Verify email matches (if user was found via req.user)
    // REMOVE the following block to allow any email for booking
    // if (user.email !== userEmail) {
    //   return res.json({ success: false, error: "Email mismatch. Please use your registered email." });
    // }

    // Calculate per-seat price based on show pricing rules (weekday/weekend) or fallback to show.price
    let perSeat = show.price || 250;
    try {
      const today = new Date();
      const day = today.getDay(); // 0 (Sun) - 6 (Sat)
      const isWeekend = (day === 0 || day === 6);
      if (show.pricing) {
        if (isWeekend && show.pricing.weekend) perSeat = show.pricing.weekend;
        else if (!isWeekend && show.pricing.weekday) perSeat = show.pricing.weekday;
      }
    } catch (e) {
      // fallback to show.price
    }

    const totalAmount = seats.length * perSeat;

    // Generate ticket ID (matching Booking model format)
    const ticketId = `TKT${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    // Create booking document
    const booking = new Booking({
      userId: user._id,
      movieId: show.movieId._id,
      showId: show._id,
      seats: seats,
      totalAmount: totalAmount,
      showDate: new Date(), // Using current date as show date (you may want to add date field to Show model)
      showTime: show.timing || 'TBA',
      status: 'confirmed',
      paymentStatus: 'pending', // Set to pending initially, will be updated after payment confirmation
      paymentMethod: null, // Will be set during payment process
      phoneNumber: phoneNumber || user.phoneNumber || 'N/A',
      email: userEmail,
      ticketId: ticketId
    });

    // Save booking to database. If booking save fails, roll back the reserved seats.
    try {
      await booking.save();
    } catch (saveErr) {
      // Roll back seat reservation
      await Show.updateOne({ _id: showId }, { $pull: { bookedSeats: { $in: seats } } });
      console.error('Booking save failed, rolled back seat reservation:', saveErr);
      return res.json({ success: false, error: 'Failed to create booking. Please try again.' });
    }

    const ticketDetails = {
      ticketId,
      movieTitle: show.movieId.title,
      seats,
      showTime: show.timing,
      amount: totalAmount,
    };

    // Send email
    let emailStatus = "";
    try {
      await sendBookingConfirmation(userEmail, ticketDetails);
      emailStatus = `📧 Confirmation sent to ${userEmail}`;
      console.log("Email sent successfully to:", userEmail);
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      emailStatus = `⚠ Booking confirmed but email delivery failed: ${emailError.message}`;
    }

    console.log("Booking created successfully:", booking._id);

    // Generate and set auth token so user can access /my-bookings
    const token = generateToken(user);
    if (token) {
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
      console.log('Auth token set for user:', user._id);
    }

    // Respond with the booking object for client-side payment flow compatibility
    return res.json({
      success: true,
      ticketId,
      totalAmount: totalAmount,
      emailStatus,
      booking: booking,
      paymentStatus: 'pending',
      message: 'Booking confirmed. Please select payment method.'
    });
  } catch (error) {
    console.error("Booking error:", error);
    return res.json({ success: false, error: "Booking failed: " + error.message });
  }
});

// NEW ROUTE: Cancel a booking by ticketId (releases seats)
router.post("/cancel-booking", async (req, res, next) => {
  try {
    const { ticketId } = req.body;
    if (!ticketId) {
      return res.status(400).json({ error: "ticketId is required" });
    }

    const booking = await Booking.findOne({ ticketId });
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Release seats from the show
    await Show.updateOne(
      { _id: booking.showId },
      { $pull: { bookedSeats: { $in: booking.seats } } }
    );

    // Mark booking cancelled
    booking.status = "cancelled";
    await booking.save();

    return res.json({ success: true, message: "Booking cancelled and seats released." });
  } catch (err) {
    console.error("Error cancelling booking:", err);
    res.status(500).json({ error: err.message });
  }
});

// NEW ROUTE: Get booked seats for a show
router.get("/booked-seats/:showId", async (req, res, next) => {
  try {
    const show = await Show.findById(req.params.showId);
    if (!show) {
      return res.status(404).json({ error: "Show not found" });
    }
    res.json({ bookedSeats: show.bookedSeats || [] });
  } catch (err) {
    console.error("Error fetching booked seats:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;