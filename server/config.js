const path = require('path');

const config = {
  // Database
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/su-takip',
  JWT_SECRET: process.env.JWT_SECRET || 'su-takip-secret-key-2024',
  
  // Server
  PORT: process.env.PORT || 5001,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // SQLite Database Path
  SQLITE_PATH: process.env.SQLITE_PATH || path.join(__dirname, 'su-takip.db'),
  
  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production' ? '*' : 'http://localhost:3000'),
  
  // Security
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS) || 12,
  
  // Session
  SESSION_SECRET: process.env.SESSION_SECRET || 'su-takip-session-secret-2024'
};

module.exports = config;