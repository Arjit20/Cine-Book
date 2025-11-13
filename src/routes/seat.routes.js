import express from "express";
import Show from "../models/show.models.js";
import Movie from "../models/movie.models.js";
import Booking from "../models/booking.models.js";
import { sendTicketSMS } from "../utils/sms.js";
import { requireAuth } from "../utils/auth.js";
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
    const { showId, seats, userEmail } = req.body;

    console.log("Booking request:", { showId, seats, userEmail });

    if (!showId || !seats || !userEmail) {
      return res.json({ success: false, error: "Missing required fields" });
    }

    const show = await Show.findById(showId).populate("movieId");
    if (!show) {
      return res.json({ success: false, error: "Show not found" });
    }

    // Check seat availability
    const unavailableSeats = seats.filter((seat) => show.bookedSeats.includes(seat));
    if (unavailableSeats.length > 0) {
      return res.json({ success: false, error: "Some seats are no longer available" });
    }

    // Book seats
    await Show.findByIdAndUpdate(showId, {
      $addToSet: { bookedSeats: { $each: seats } },
    });

    const ticketId = `TKT${Date.now()}${Math.random().toString(36).substr(2, 4)}`.toUpperCase();
    const ticketDetails = {
      ticketId,
      movieTitle: show.movieId.title,
      seats,
      showTime: show.timing,
      amount: seats.length * 250,
    };

    // Send email
    let emailStatus = "";
    try {
      await sendBookingConfirmation(userEmail, ticketDetails);
      emailStatus = `📧 Confirmation sent to ${userEmail}`;
      console.log("Email sent successfully to:", userEmail);
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      emailStatus = `⚠️ Booking confirmed but email delivery failed: ${emailError.message}`;
    }

    return res.json({
      success: true,
      ticketId,
      totalAmount: ticketDetails.amount,
      emailStatus,
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