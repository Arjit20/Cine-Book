import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import seatRoutes from './routes/seat.routes.js';
import { connectDB } from './config/db.js';
import { errorHandler } from './middleware/error.js';
import authRoutes from './routes/auth.routes.js';
import movieRoutes from './routes/movie.routes.js';
import apiMovieRoutes from './routes/api.movies.js';
import adminRoutes from './routes/admin.routes.js';
import Show from './models/show.models.js';
import Movie from './models/movie.models.js';
import Booking from './models/booking.models.js';
import { authenticate, requireAuth, generateToken } from './utils/auth.js'; // ✅ fixed import path
import User from './models/user.models.js';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Middleware
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Demo mode: auto-create and sign-in a demo user for seamless presentations
app.use(async (req, res, next) => {
  try {
    if (process.env.DEMO_MODE === 'true' && !req.cookies.token) {
      let demoUser = await User.findOne({ email: 'demo@cinebook.com' });
      if (!demoUser) {
        demoUser = new User({ email: 'demo@cinebook.com', password: 'demo1234', role: 'user' });
        await demoUser.save();
      }
      const token = generateToken(demoUser);
      res.cookie('token', token, { httpOnly: true });
      return res.redirect(req.originalUrl || '/movies');
    }
  } catch (e) {
    console.error('Demo mode error:', e);
  }
  next();
});

app.use(authenticate); // ensures req.user is always available

// Mount routes
app.use('/auth', authRoutes);

// Root route
app.get('/', (req, res) => {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.redirect('/login');
  }
  res.redirect('/movies');
});

// Auth pages
app.get('/register', (req, res) => {
  res.render('register', { user: req.user });
});

app.get('/login', async (req, res) => {
  try {
    res.render('login', { 
      user: req.user,
      redirect: req.query.redirect || '/movies'
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error loading login page');
  }
});

app.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
});

// Movies dashboard
app.get('/movies', async (req, res, next) => {
  try {
    const movies = await Movie.find();
    const shows = await Show.find();

    const showsByMovie = shows.reduce((acc, show) => {
      const key = String(show.movieId || '');
      if (!acc[key]) acc[key] = [];
      acc[key].push(show);
      return acc;
    }, {});

    res.render('movies', { movies, user: req.user, showsByMovie });
  } catch (error) {
    next(error);
  }
});

// Seat selection
app.get('/seatSelection/:movieId', requireAuth, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.movieId);
    if (!movie) {
      return res.redirect('/movies');
    }

    let requestedShowTime = req.query.showTime ? decodeURIComponent(String(req.query.showTime)) : undefined;

    let show = null;

    if (requestedShowTime) {
      show = await Show.findOne({ movieId: movie._id, timing: requestedShowTime });
      if (!show) {
        show = await Show.create({ movieId: movie._id, timing: requestedShowTime, bookedSeats: [] });
      }
    } else {
      show = await Show.findOne({ movieId: movie._id });
      if (!show) {
        show = await Show.create({ movieId: movie._id, timing: '10:00 AM', bookedSeats: [] });
      }
    }

    return res.render('seatSelection', {
      movie,
      user: req.user,
      bookings: movie.bookings || [],
      show
    });
  } catch (error) {
    console.error('Error in seat selection:', error);
    return res.redirect('/movies');
  }
});

// Admin panel
app.get('/admin', (req, res) => {
  res.render('admin');
});

// User booking history
app.get('/my-bookings', requireAuth, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user._id })
      .populate('movieId', 'title posterUrl')
      .populate('showId', 'timing')
      .sort({ bookingDate: -1 });
    
    res.render('myBookings', { bookings, user: req.user });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.redirect('/movies');
  }
});

// Routes
app.use('/', seatRoutes);
app.use('/', movieRoutes);
app.use('/api/movies', apiMovieRoutes);
app.use('/api', adminRoutes);

// WebSocket
let bookedSeats = [];
io.on('connection', (socket) => {
  console.log('User connected');
  socket.emit('seatsBooked', bookedSeats);

  socket.on('bookSeats', (seats) => {
    try {
      seats.forEach((seat) => {
        if (!bookedSeats.includes(seat)) bookedSeats.push(seat);
      });
      io.emit('seatsBooked', bookedSeats);
    } catch (err) {
      console.error('WebSocket error:', err);
    }
  });
});

// Error handler
app.use(errorHandler);

// Start server
connectDB()
  .then(() => {
    server.listen(3000, () => {
      console.log('Server running at http://localhost:3000');
    });
  })
  .catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
