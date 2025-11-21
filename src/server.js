import express from 'express';
import https from 'https';
import http from 'http'; // added
import fs from 'fs';
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
import paymentRoutes from './routes/payment.routes.js';
import Show from './models/show.models.js';
import Movie from './models/movie.models.js';
import Booking from './models/booking.models.js';
import { authenticate, requireAuth, generateToken } from './utils/auth.js';
import User from './models/user.models.js';
import dotenv from 'dotenv';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';

dotenv.config();

// =====================================================
// FIX 1: Proper ES Module Path Fix
// =====================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =====================================================
// JWT Secret fallback for dev mode
// =====================================================
if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('ERROR: JWT_SECRET is not set.');
    process.exit(1);
  }
  process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
  console.warn('No JWT_SECRET found — using a temporary development secret.');
}

const app = express();

// =====================================================
// HTTPS SERVER (robust: try env / common paths; fall back to HTTP)
// =====================================================
const loadSSLOptions = () => {
  // prefer explicit environment paths
  const keyCandidates = [
    process.env.SSL_KEY_PATH,
    path.join(__dirname, '..', 'certs', 'localhostkey.pem'),
    path.join(__dirname, '..', 'certs', 'localhost-key.pem'),
    path.join(__dirname, '..', 'certs', 'localhost.key'),
    'c:\\certs\\localhostkey.pem', // keep as last-resort legacy path
  ].filter(Boolean);

  const certCandidates = [
    process.env.SSL_CERT_PATH,
    path.join(__dirname, '..', 'certs', 'localhostcert.pem'),
    path.join(__dirname, '..', 'certs', 'localhost-cert.pem'),
    path.join(__dirname, '..', 'certs', 'localhost.crt'),
    'c:\\certs\\localhostcert.pem',
  ].filter(Boolean);

  // If PEM contents are provided directly in env, use them
  if (process.env.SSL_KEY && process.env.SSL_CERT) {
    return {
      key: process.env.SSL_KEY,
      cert: process.env.SSL_CERT
    };
  }

  // Try to find a pair of existing files
  for (const keyPath of keyCandidates) {
    for (const certPath of certCandidates) {
      try {
        if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
          return {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath)
          };
        }
      } catch (err) {
        // continue searching other candidates
      }
    }
  }

  return null;
};

const sslOptions = loadSSLOptions();

let server;
if (sslOptions) {
  server = https.createServer(sslOptions, app);
  console.log('HTTPS server created (SSL certificates loaded).');
} else {
  server = http.createServer(app);
  console.warn('SSL certificates not found — falling back to HTTP. To enable HTTPS set SSL_KEY_PATH and SSL_CERT_PATH or place certs in ./certs/');
}

const io = new Server(server);

// =====================================================
// View Engine
// =====================================================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// =====================================================
// Middleware
// =====================================================
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Demo mode
app.use(async (req, res, next) => {
  try {
    if (false && process.env.DEMO_MODE === 'true' && !req.cookies.token) {
      let demoUser = await User.findOne({ email: 'demo@cinebook.com' });
      if (!demoUser) {
        demoUser = new User({
          name: 'Demo User',
          email: 'demo@cinebook.com',
          password: 'demo1234',
          role: 'user'
        });
        await demoUser.save();
      }
      const token = generateToken(demoUser);
      res.cookie('token', token, { httpOnly: true });

      if (req.path !== '/movies') return res.redirect('/movies');
    }
  } catch (e) {
    console.error('Demo error:', e);
  }
  next();
});

app.use(authenticate);

// =====================================================
// Routes
// =====================================================

app.get('/', (req, res) => res.redirect('/movies'));

app.get('/test', (req, res) => res.send('Server is working fine!'));

app.get('/login', (req, res) => {
  const redirectParam = req.query.redirect ? `?redirect=${encodeURIComponent(req.query.redirect)}` : '';
  return res.redirect('/auth/login' + redirectParam);
});

app.get('/register', (req, res) => res.redirect('/auth/register'));

app.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/auth/login');
});

app.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/auth/login');
});

// Old seats route → redirect
app.get('/seats/:movieId', (req, res) => {
  const movieId = req.params.movieId;
  const query = Object.keys(req.query).length ? '?' + new URLSearchParams(req.query).toString() : '';
  return res.redirect(`/seatSelection/${movieId}${query}`);
});

// Auth
app.use('/auth', authRoutes);

// Payment
app.use('/payment', paymentRoutes);

// Movies page
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

    // Ensure each movie object has a `shows` array (backwards compatibility).
    const moviesForView = movies.map(m => {
      const obj = typeof m.toObject === 'function' ? m.toObject() : { ...m };
      obj.shows = showsByMovie[String(m._id)] || [];
      return obj;
    });

    // Debug logs for troubleshooting
    console.log(`[movies route] movies found: ${movies.length}, shows found: ${shows.length}`);
    // log first 5 movies with shows count and poster URL
    moviesForView.slice(0,5).forEach(m => {
      console.log(` - ${m.title} (${m._id}): shows=${m.shows.length}, poster=${m.posterUrl || 'none'}`);
    });

    // Classify movies: now showing (has active shows or releaseDate <= today) vs coming soon
    const today = new Date();
    const nowShowing = [];
    const comingSoon = [];

    moviesForView.forEach(m => {
      const hasShows = (m.shows || []).length > 0;
      const releaseDate = m.releaseDate ? new Date(m.releaseDate) : null;
      const active = m.isActive !== undefined ? m.isActive : true;

      if (!active) return; // skip deactivated movies

      if (hasShows || (releaseDate && releaseDate <= today)) {
        nowShowing.push(m);
      } else if (releaseDate && releaseDate > today) {
        comingSoon.push(m);
      } else if (!releaseDate && !hasShows) {
        // treat movies with no shows and no releaseDate as now showing fallback
        nowShowing.push(m);
      }
    });

    // If debug query param provided, return JSON snapshot
    if (req.query.debug === '1') {
      return res.json({
        nowShowingCount: nowShowing.length,
        comingSoonCount: comingSoon.length,
        sampleNowShowing: nowShowing.slice(0,10).map(m => ({_id: m._id, title: m.title}))
      });
    }

    res.render('movies', { nowShowing, comingSoon, user: req.user, showsByMovie });
  } catch (error) {
    next(error);
  }
});

// Seat selection page
app.get('/seatSelection/:movieId', requireAuth, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.movieId);
    if (!movie) return res.redirect('/movies');

    const requestedShowTime = req.query.showTime
      ? decodeURIComponent(String(req.query.showTime))
      : undefined;

    let show;

    if (requestedShowTime) {
      show = await Show.findOne({ movieId: movie._id, timing: requestedShowTime });
      if (!show) {
        show = await Show.create({
          movieId: movie._id,
          timing: requestedShowTime,
          bookedSeats: [],
          movieTitle: movie.title,
          price: 250
        });
      }
    } else {
      show = await Show.findOne({ movieId: movie._id });
      if (!show) {
        show = await Show.create({
          movieId: movie._id,
          timing: '10:00 AM',
          bookedSeats: [],
          movieTitle: movie.title,
          price: 250
        });
      }
    }

    res.render('seatSelection', {
      movie,
      user: req.user,
      bookings: movie.bookings || [],
      show
    });
  } catch {
    return res.redirect('/movies');
  }
});

// Admin
app.get('/admin', (req, res) => res.render('admin'));

// Backwards-compatible redirect: allow `/movies/admin` to reach admin page
app.get('/movies/admin', (req, res) => res.redirect('/admin'));

// Booking history
app.get('/my-bookings', authenticate, (req, res, next) => {
  if (!req.user) {
    return res.redirect(`/auth/login?redirect=/my-bookings`);
  }
  next();
}, async (req, res) => {
  try {
    console.log('📖 /my-bookings accessed by authenticated user:', req.user._id);
    const bookings = await Booking.find({ userId: req.user._id })
      .populate('movieId', 'title posterUrl')
      .populate('showId', 'timing')
      .sort({ bookingDate: -1 });

    console.log('Found', bookings.length, 'bookings');
    res.render('myBookings', { bookings, user: req.user });
  } catch (err) {
    console.error('Error loading my-bookings:', err);
    res.redirect('/movies');
  }
});

// API + Routes
app.use('/api/movies', apiMovieRoutes);
app.use('/movies', movieRoutes);
app.use('/seats', seatRoutes);
app.use('/api', adminRoutes);

// =====================================================
// Socket.IO
// =====================================================
let bookedSeats = [];

io.on('connection', (socket) => {
  console.log('User connected');
  socket.emit('seatsBooked', bookedSeats);

  socket.on('bookSeats', (seats) => {
    try {
      seats.forEach(seat => {
        if (!bookedSeats.includes(seat)) bookedSeats.push(seat);
      });

      io.emit('seatsBooked', bookedSeats);
    } catch (err) {
      console.error('WebSocket error:', err);
    }
  });
});

// =====================================================
// Error Handler
// =====================================================
app.use(errorHandler);

// =====================================================
// START SERVER
// =====================================================
connectDB()
  .then(() => {
    server.listen(3000, () => {
      const protocol = sslOptions ? 'https' : 'http';
      console.log(`${protocol.toUpperCase()} Server running at ${protocol}://localhost:3000`);
    });
  })
  .catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
