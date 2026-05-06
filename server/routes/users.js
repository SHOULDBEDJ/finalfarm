const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth, superAdmin } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Get all users (SuperAdmin only)
router.get('/', auth, superAdmin, async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT p.id, p.username, p.full_name, p.email, p.avatar_url, p.status,
             p.last_login_at, p.created_at, r.role
      FROM profiles p
      LEFT JOIN user_roles r ON p.id = r.user_id
      ORDER BY p.created_at DESC
    `);
    res.json(result.rows.map(u => ({
      id: u.id,
      username: u.username,
      full_name: u.full_name,
      email: u.email,
      avatar_url: u.avatar_url,
      status: u.status || 'Active',
      last_login_at: u.last_login_at,
      created_at: u.created_at,
      role: u.role || 'Staff'
    })));
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single user
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.execute({
      sql: `SELECT p.id, p.username, p.full_name, p.email, p.avatar_url, p.status, p.last_login_at, p.created_at, r.role
            FROM profiles p
            LEFT JOIN user_roles r ON p.id = r.user_id
            WHERE p.id = ?`,
      args: [req.params.id]
    });
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const u = result.rows[0];
    res.json({
      id: u.id,
      username: u.username,
      full_name: u.full_name,
      email: u.email,
      avatar_url: u.avatar_url,
      status: u.status || 'Active',
      last_login_at: u.last_login_at,
      created_at: u.created_at,
      role: u.role || 'Staff'
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user profile
router.put('/:id', auth, async (req, res) => {
  // Only the user themselves or a SuperAdmin can update
  if (req.params.id !== req.user.id && req.user.role !== 'SuperAdmin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  const { full_name, email, avatar_url } = req.body;
  console.log(`Updating profile for ${req.params.id}:`, { full_name, email, hasAvatar: !!avatar_url });
  try {
    await db.execute({
      sql: 'UPDATE profiles SET full_name = ?, email = ?, avatar_url = ? WHERE id = ?',
      args: [full_name, email, avatar_url || null, req.params.id]
    });
    res.json({ message: 'Profile updated' });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Toggle user status (SuperAdmin only)
router.put('/:id/status', auth, superAdmin, async (req, res) => {
  const { status } = req.body;
  
  if (!['Active', 'Suspended'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be Active or Suspended.' });
  }
  
  try {
    await db.execute({
      sql: 'UPDATE profiles SET status = ? WHERE id = ?',
      args: [status, req.params.id]
    });
    res.json({ message: 'Status updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Change password
router.put('/:id/password', auth, async (req, res) => {
  // Only the user themselves or a SuperAdmin can change password
  if (req.params.id !== req.user.id && req.user.role !== 'SuperAdmin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  const { password } = req.body;
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.execute({
      sql: 'UPDATE profiles SET password_hash = ? WHERE id = ?',
      args: [hashedPassword, req.params.id]
    });
    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create user (SuperAdmin only)
router.post('/', auth, superAdmin, async (req, res) => {
  const { username, password, fullName, email, role } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  try {
    const id = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await db.execute({
      sql: 'INSERT INTO profiles (id, username, full_name, email, password_hash, status) VALUES (?, ?, ?, ?, ?, ?)',
      args: [id, username, fullName || username, email || null, hashedPassword, 'Active']
    });
    
    await db.execute({
      sql: 'INSERT INTO user_roles (user_id, role) VALUES (?, ?)',
      args: [id, role || 'Staff']
    });
    
    res.status(201).json({ id, message: 'User created successfully' });
  } catch (err) {
    console.error('Create user error:', err);
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
