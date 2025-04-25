// Place this file in: library-management-system/config/auth.js

// JWT configuration settings
module.exports = {
    JWT_SECRET: process.env.JWT_SECRET || 'your_jwt_secret_key',  // Should use environment variable in production
    TOKEN_EXPIRY: '24h',  // Token expiry time
    COOKIE_EXPIRY: 24 * 60 * 60 * 1000  // Cookie expiry time in milliseconds (24 hours)
  };