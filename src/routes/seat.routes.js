import express from "express";
import Show from "../models/show.models.js";
import Movie from "../models/movie.models.js";
import Booking from "../models/booking.models.js";
import { sendTicketSMS } from "../utils/sms.js";

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
router.post("/book", async (req, res, next) => {
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

    // Create booking record
    const booking = new Booking({
      userId: req.user ? req.user._id : null,
      movieId: movie._id,
      showId: show._id,
      seats: seats,
      totalAmount: totalAmount,
      showDate: new Date(),
      showTime: show.timing || show.showTime || '10:00 AM',
      phoneNumber: userPhone || req.user?.phone || 'N/A',
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
      if (userPhone || req.user?.phone) {
        const smsResult = await sendTicketSMS(
          userPhone || req.user.phone,
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