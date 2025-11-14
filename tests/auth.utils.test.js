import jwt from 'jsonwebtoken';
import { generateToken, requireAuth } from '../src/utils/auth.js';

// Mock setup
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';

// Create simple mock function
const mockFn = () => {
  const calls = [];
  const fn = (...args) => {
    calls.push(args);
  };
  fn.calls = calls;
  fn.toHaveBeenCalled = () => calls.length > 0;
  fn.toHaveBeenCalledWith = (expected) => JSON.stringify(calls[0]) === JSON.stringify([expected]);
  return fn;
};

describe('Auth Utils Tests', () => {
  
  describe('generateToken()', () => {
    
    test('should generate a valid JWT token', () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        name: 'Test User'
      };
      
      const token = generateToken(mockUser);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    test('should include user id in token payload', () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439012',
        email: 'user@example.com'
      };
      
      const token = generateToken(mockUser);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      expect(decoded.id).toBe(mockUser._id);
    });

    test('should return null when JWT_SECRET is not set', () => {
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;
      
      const mockUser = { _id: '507f1f77bcf86cd799439013' };
      const token = generateToken(mockUser);
      
      expect(token).toBeNull();
      
      // Restore secret
      process.env.JWT_SECRET = originalSecret;
    });

    test('should create token with 7 day expiration', () => {
      const mockUser = { _id: '507f1f77bcf86cd799439014' };
      const token = generateToken(mockUser);
      const decoded = jwt.decode(token);
      
      // Check if expiration is set (iat + 7 days in seconds)
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      const expirationSeconds = 7 * 24 * 60 * 60;
      const timeDifference = decoded.exp - decoded.iat;
      expect(timeDifference).toBe(expirationSeconds);
    });
  });

  describe('requireAuth middleware()', () => {
    
    test('should call next() when user is authenticated', () => {
      const req = { user: { _id: '507f1f77bcf86cd799439015', email: 'test@example.com' } };
      const res = {};
      const next = mockFn();
      
      requireAuth(req, res, next);
      
      expect(next.toHaveBeenCalled()).toBe(true);
    });

    test('should redirect to login when user is not authenticated', () => {
      const req = { user: null, originalUrl: '/movies' };
      const redirectMock = mockFn();
      const res = { redirect: redirectMock };
      const next = mockFn();
      
      requireAuth(req, res, next);
      
      expect(redirectMock.calls.length).toBeGreaterThan(0);
      expect(redirectMock.calls[0][0]).toContain('/auth/login');
      expect(next.toHaveBeenCalled()).toBe(false);
    });
  });
});
