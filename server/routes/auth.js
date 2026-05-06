const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { auth } = require('../middleware/auth');

const JWT_SECRET = '16eyes-farmhouse-static-secret-for-easy-deployment';

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const result = await db.execute({
      sql: 'SELECT * FROM profiles WHERE username = ?',
      args: [username]
    });

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Get user roles
    const rolesResult = await db.execute({
      sql: 'SELECT role FROM user_roles WHERE user_id = ?',
      args: [user.id]
    });
    
    const roles = rolesResult.rows.map(r => r.role);
    const primaryRole = roles.includes('SuperAdmin') ? 'SuperAdmin' : roles.includes('Admin') ? 'Admin' : 'Staff';

    const token = jwt.sign(
      { id: user.id, username: user.username, role: primaryRole },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Update last login
    await db.execute({
      sql: 'UPDATE profiles SET last_login_at = ? WHERE id = ?',
      args: [new Date().toISOString(), user.id]
    });

    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'
    });

    res.json({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        email: user.email,
        avatarUrl: user.avatar_url,
        role: primaryRole
      },
      token // Also send token in body for localStorage fallback
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/'
  });
  res.json({ message: 'Logged out successfully' });
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const result = await db.execute({
      sql: 'SELECT id, username, full_name, email, avatar_url FROM profiles WHERE id = ?',
      args: [req.user.id]
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    
    res.json({
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      email: user.email,
      avatarUrl: user.avatar_url,
      role: req.user.role
    });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
