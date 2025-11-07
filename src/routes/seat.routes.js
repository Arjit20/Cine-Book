import express from "express";
import Show from "../models/show.models.js";
import Movie from "../models/movie.models.js";
import Booking from "../models/booking.models.js";
import { sendTicketSMS } from "../utils/sms.js";
import { requireAuth } from "../utils/auth.js";

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
router.post("/book", requireAuth, async (req, res, next) => {
  try {
    const { showId, seats, userPhone, userEmail } = req.body;
    console.log("Booking seats:", seats, "for show:", showId);
    
    if (!showId || !seats || !Array.isArray(seats)) {
      return res.status(400).json({ error: "Invalid booking data" });
    }

    // Find the show and movie
    const show = await Show.findById(showId).populate('movieId');
    if (!show) {
      return res.status(404).json({ error: "Show not found" });
    }

    const movie = show.movieId;
    if (!movie) {
      return res.status(404).json({ error: "Movie not found" });
    }

    // Check if seats are already booked
    const alreadyBooked = seats.filter(seat => show.bookedSeats.includes(seat));
    if (alreadyBooked.length > 0) {
      return res.status(400).json({ 
        error: `Seats already booked: ${alreadyBooked.join(', ')}` 
      });
    }

    // Calculate total amount
    const seatPrice = show.price || 250;
    const totalAmount = seats.length * seatPrice;

    // Normalize phone to E.164 (default to +91 if 10-digit local)
    let normalizedPhone = 'N/A';
    if (userPhone && typeof userPhone === 'string') {
      const digits = userPhone.replace(/\D/g, '');
      if (digits.length === 10) {
        normalizedPhone = `+91${digits}`;
      } else if (digits.length === 11 && digits.startsWith('0')) {
        normalizedPhone = `+91${digits.slice(1)}`;
      } else if (digits.length === 12 && digits.startsWith('91')) {
        normalizedPhone = `+${digits}`;
      } else if (userPhone.trim().startsWith('+')) {
        normalizedPhone = userPhone.trim();
      }
    }

    // Create booking record
    const booking = new Booking({
      userId: req.user ? req.user._id : null,
      movieId: movie._id,
      showId: show._id,
      seats: seats,
      totalAmount: totalAmount,
      showDate: new Date(),
      showTime: show.timing || show.showTime || '10:00 AM',
      phoneNumber: normalizedPhone || req.user?.phone || 'N/A',
      email: userEmail || req.user?.email || 'N/A'
    });

    await booking.save();

    // Update the show - add seats to bookedSeats array
    const result = await Show.updateOne(
      { _id: showId },
      { 
        $addToSet: { 
          bookedSeats: { 
            $each: seats 
          } 
        } 
      }
    );

    console.log("Update result:", result);

    if (result.modifiedCount === 1) {
      // Send SMS ticket
      if (normalizedPhone !== 'N/A' || req.user?.phone) {
        const smsResult = await sendTicketSMS(
          normalizedPhone || req.user.phone,
          {
            ticketId: booking.ticketId,
            movieTitle: movie.title,
            showTime: booking.showTime,
            seats: seats,
            totalAmount: totalAmount,
            showDate: booking.showDate
          }
        );
        
        if (!smsResult.success) {
          console.error('SMS failed:', smsResult.error);
        }
      }

      res.json({ 
        success: true, 
        message: `Seats ${seats.join(', ')} booked successfully!`,
        ticketId: booking.ticketId,
        totalAmount: totalAmount
      });
    } else {
      res.status(500).json({ error: "Failed to update booking" });
    }

  } catch (err) {
    console.error("Error booking seats:", err);
    res.status(500).json({ error: err.message });
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
    booking.status = 'cancelled';
    await booking.save();

    return res.json({ success: true, message: 'Booking cancelled and seats released.' });
  } catch (err) {
    console.error('Error cancelling booking:', err);
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