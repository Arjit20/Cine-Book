import express from 'express';
import User from '../models/user.models.js';

const router = express.Router();

// GET register page
router.get('/register', (req, res) => {
  if (req.user) {
    return res.redirect('/movies');
  }
  res.render('register', {
    user: req.user,
    error: req.query.error,
    email: req.query.email || ''
  });
});

// POST Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Validate required fields
    if (!name || !email || !password) {
      return res.redirect('/auth/register?error=' + encodeURIComponent('Name, email and password are required'));
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.redirect('/auth/register?error=' + encodeURIComponent('Email already registered'));
    }

    // Create new user
    const user = new User({ name, email, password });
    await user.save();
    
    // Try to generate token and set cookie (auto-login). If JWT secret is missing,
    // skip auto-login and redirect user to the login page with a success message.
    try {
      if (process.env.JWT_SECRET) {
        const token = user.generateAuthToken();
        res.cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
        return res.redirect('/movies');
      } else {
        console.warn('JWT_SECRET is not set. Skipping auto-login after registration.');
        return res.redirect('/auth/login?success=' + encodeURIComponent('Registration successful. Please login.'));
      }
    } catch (tokenErr) {
      console.error('Token generation error:', tokenErr);
      // Even if token generation fails, user was created. Redirect to login with a message.
      return res.redirect('/auth/login?error=' + encodeURIComponent('Registered but failed to create session. Please login.'));
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.redirect('/auth/register?error=' + encodeURIComponent('Error during registration'));
  }
});

// GET login page
router.get('/login', (req, res) => {
  if (req.user) {
    return res.redirect('/movies');
  }
  res.render('login', {
    user: req.user,
    error: req.query.error,
    success: req.query.success,
    redirect: req.query.redirect || '/movies'
  });
});

// POST Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const redirectUrl = req.body.redirect || req.query.redirect || '/movies';
    
    // Validate fields
    if (!email || !password) {
      return res.redirect(`/auth/login?error=${encodeURIComponent('Email and password are required')}`);
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.redirect(`/auth/login?error=${encodeURIComponent('Invalid email or password')}`);
    }

    // Check password
    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return res.redirect(`/auth/login?error=${encodeURIComponent('Invalid email or password')}`);
    }

    // Generate token
    const token = user.generateAuthToken();
    if (!token) {
      console.warn('JWT_SECRET missing - cannot create session token on login');
      return res.redirect('/auth/login?error=' + encodeURIComponent('Server not configured for sessions. Please contact admin.'));
    }

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.redirect(redirectUrl);
  } catch (error) {
    console.error('Login error:', error);
    res.redirect('/auth/login?error=' + encodeURIComponent('An error occurred during login'));
  }
});

// GET Logout
router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/auth/login');
});

export default router;