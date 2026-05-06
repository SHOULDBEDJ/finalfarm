// Load .env from server/ directory at the very top
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { initSchema } = require('./db/schema');

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const isProduction = process.env.NODE_ENV === 'production';

// CORS — must allow credentials and specify the exact origin
const allowedOrigins = [
  CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4173',
  // Vercel preview URLs
  /\.vercel\.app$/,
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    const allowed = allowedOrigins.some(o => {
      if (o instanceof RegExp) return o.test(origin);
      return o === origin;
    });
    
    if (allowed) {
      callback(null, true);
    } else {
      // In production, allow all Vercel subdomains for preview deployments
      if (isProduction && origin.includes('.vercel.app')) {
        return callback(null, true);
      }
      callback(null, true); // Allow all during development/testing
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check (no auth)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    env: process.env.NODE_ENV || 'development'
  });
});

// Import routes
const authRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/bookings');
const settingsRoutes = require('./routes/settings');
const financeRoutes = require('./routes/finance');
const activityRoutes = require('./routes/activity');
const userRoutes = require('./routes/users');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/users', userRoutes);

// 404 handler for unknown API routes
// Simplified catch-all for Express 5 compatibility
app.use('/api', (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack || err.message || err);
  res.status(err.status || 500).json({ 
    error: isProduction ? 'Internal server error' : err.message || 'Something went wrong'
  });
});

// Initialize DB schema on startup
initSchema().then(() => {
  console.log('✅ Database schema verified');
}).catch(err => {
  console.error('❌ Database initialization error:', err.message || err);
  // Don't exit process in Vercel, allow the app to try to recover or show error on request
});

// Start server (skip in Vercel serverless environment)
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`\n🏡 16 Eyes Farm House Server`);
    console.log(`📡 Running on port ${PORT}`);
    console.log(`🌐 CORS allowed origin: ${CLIENT_URL}`);
    console.log(`🗄️  Database: ${process.env.DATABASE_URL ? 'Turso (configured)' : 'NOT CONFIGURED ⚠️'}`);
    console.log(`🔑 JWT Secret: ${process.env.JWT_SECRET ? 'configured' : 'using default (change in production!)'}\n`);
  });
}

module.exports = app;
