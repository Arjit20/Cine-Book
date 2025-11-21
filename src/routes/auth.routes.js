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
    const { name, email, password, role } = req.body;
    
    // Validate required fields
    if (!name || !email || !password) {
      return res.redirect('/auth/register?error=' + encodeURIComponent('Name, email and password are required'));
    }

    // Validate role
    const userRole = (role === 'admin' || role === 'user') ? role : 'user';

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.redirect('/auth/register?error=' + encodeURIComponent('Email already registered'));
    }

    // Create new user with role
    const user = new User({
      name,
      email,
      password,
      role: userRole
    });
    await user.save();
    const token = user.generateAuthToken();
    if (!token) {
      console.warn('JWT_SECRET missing - cannot create session token on registration');
      return res.redirect('/auth/register?error=' + encodeURIComponent('Server not configured for sessions. Please contact admin.'));
    }
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    
    // Redirect to appropriate dashboard based on role
    const redirectPath = userRole === 'admin' ? '/admin' : '/movies';
    res.redirect(redirectPath);
  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === 11000) {
      // MongoDB duplicate key error
      return res.redirect('/auth/register?error=' + encodeURIComponent('Email already registered'));
    }
    res.render('register', { error: 'Registration failed. Please try again.' });
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
    const { email, password, role } = req.body;
    const redirectUrl = req.body.redirect || req.query.redirect || '/movies';
    
    // Validate fields
    if (!email || !password) {
      return res.redirect(`/auth/login?error=${encodeURIComponent('Email and password are required')}`);
    }

    // Validate requested role
    const requestedRole = (role === 'admin' || role === 'user') ? role : 'user';

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.redirect(`/auth/login?error=${encodeURIComponent('Invalid email or password')}`);
    }

    // Check if user's role matches requested role
    if (user.role !== requestedRole) {
      return res.redirect(`/auth/login?error=${encodeURIComponent(`This account is registered as ${user.role}, not ${requestedRole}`)}`);
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