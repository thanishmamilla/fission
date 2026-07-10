const jwt = require('jsonwebtoken');
const User = require('../models/User');
const db = require('../config/db');

// Protect routes - requires authentication
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_12345');

      // Get user from database/mock
      if (db.isMock()) {
        const mockData = db.getMockData();
        const user = mockData.users.find((u) => u._id === decoded.id);
        if (!user) {
          return res.status(401).json({ success: false, error: 'Not authorized, user not found' });
        }
        // Don't expose password
        const { password, ...userWithoutPassword } = user;
        req.user = userWithoutPassword;
      } else {
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
          return res.status(401).json({ success: false, error: 'Not authorized, user not found' });
        }
        req.user = user;
      }

      next();
    } catch (error) {
      console.error('Auth error:', error.message);
      return res.status(401).json({ success: false, error: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'Not authorized, no token provided' });
  }
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `User role '${req.user ? req.user.role : 'none'}' is not authorized to access this route`
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
