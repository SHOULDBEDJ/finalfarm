const db = require('../db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

exports.getAllUsers = async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT id, username, full_name, mobile, role, created_at
      FROM users
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const result = await db.execute({
      sql: `SELECT id, username, full_name, mobile, role, created_at
            FROM users
            WHERE id = ? AND deleted_at IS NULL`,
      args: [req.params.id]
    });
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateProfile = async (req, res) => {
  if (req.params.id !== req.user.id && req.user.role !== 'SuperAdmin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  const { full_name, mobile } = req.body;
  try {
    await db.execute({
      sql: 'UPDATE users SET full_name = ?, mobile = ? WHERE id = ?',
      args: [full_name, mobile, req.params.id]
    });
    res.json({ message: 'Profile updated' });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateStatus = async (req, res) => {
  const { status } = req.body;
  if (!['Active', 'Suspended'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  try {
    await db.execute({
      sql: 'UPDATE users SET status = ? WHERE id = ?',
      args: [status, req.params.id]
    });
    res.json({ message: 'Status updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updatePassword = async (req, res) => {
  if (req.params.id !== req.user.id && req.user.role !== 'SuperAdmin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  const { password } = req.body;
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.execute({
      sql: 'UPDATE users SET password = ? WHERE id = ?',
      args: [hashedPassword, req.params.id]
    });
    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.createUser = async (req, res) => {
  const { username, password, full_name, mobile, role } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  try {
    const id = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await db.execute({
      sql: 'INSERT INTO users (id, username, full_name, mobile, password, role) VALUES (?, ?, ?, ?, ?, ?)',
      args: [id, username, full_name || username, mobile || null, hashedPassword, role || 'Staff']
    });
    
    res.status(201).json({ id, message: 'User created successfully' });
  } catch (err) {
    console.error('Create user error:', err);
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
};

exports.deleteUser = async (req, res) => {
  if (req.user.role !== 'SuperAdmin') {
    return res.status(403).json({ error: 'Only SuperAdmin can delete users' });
  }
  
  const { id } = req.params;
  if (id === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete yourself' });
  }

  try {
    await db.execute({
      sql: 'UPDATE users SET deleted_at = ? WHERE id = ?',
      args: [new Date().toISOString(), id]
    });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
