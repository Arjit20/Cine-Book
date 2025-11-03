import express from 'express';
import User from '../models/user.models.js';
import { generateToken } from '../utils/auth.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Register
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, role = 'user' } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) throw new Error('Email already registered');

    const user = new User({ email, password, role });
    await user.save();

    const token = generateToken(user);

    res.cookie('token', token, {
      httpOnly: true,
      secure: false, // true in prod
    });

    res.status(201).json({ token });
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).send('Invalid credentials');
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return res.status(401).send('Invalid credentials');
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.cookie('token', token, { httpOnly: true });
    res.redirect(req.query.redirect || '/movies');
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).send('Error during login');
  }
});

// ✅ Logout
router.get('/logout', (req, res) => {
  res.clearCookie('token');
  req.user = null;
  res.redirect('/movies');
});

export default router;
