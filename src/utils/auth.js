import jwt from 'jsonwebtoken';
import User from '../models/user.models.js';

export const generateToken = (user) => {
  if (!process.env.JWT_SECRET) {
    console.warn('JWT_SECRET is not set. generateToken will return null.');
    return null;
  }
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

export const authenticate = async (req, res, next) => {
  try {
    // If JWT secret isn't configured, we can't verify tokens - treat as unauthenticated
    if (!process.env.JWT_SECRET) {
      req.user = null;
      return next();
    }

    const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    req.user = user || null;
    next();
  } catch (err) {
    req.user = null;
    next();
  }
};

export const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.redirect(`/auth/login?redirect=${req.originalUrl}`);
  }
  next();
};