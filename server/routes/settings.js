const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth } = require('../middleware/auth');

// Get settings — any authenticated user can read
router.get('/', auth, async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM settings WHERE id = 1');
    if (result.rows.length === 0) {
      // Initialize settings if missing
      await db.execute(`INSERT INTO settings (id, farmhouse_name) VALUES (1, '16 Eyes Farm House')`);
      const created = await db.execute('SELECT * FROM settings WHERE id = 1');
      return res.json(created.rows[0]);
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update settings — Admin or SuperAdmin only
router.put('/', auth, async (req, res) => {
  if (req.user.role !== 'Admin' && req.user.role !== 'SuperAdmin') {
    return res.status(403).json({ error: 'Access denied. Admin role required.' });
  }

  const body = { ...req.body };
  
  // Remove any non-column fields
  delete body.id;
  delete body.updated_at;
  
  const fields = Object.keys(body);
  const values = Object.values(body);
  
  if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

  const setClause = fields.map(f => `${f} = ?`).join(', ');

  try {
    await db.execute({
      sql: `UPDATE settings SET ${setClause}, updated_at = ? WHERE id = 1`,
      args: [...values, new Date().toISOString()]
    });
    res.json({ message: 'Settings updated' });
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get time slots — any authenticated user
router.get('/slots', auth, async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM time_slots ORDER BY start_time');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create time slot
router.post('/slots', auth, async (req, res) => {
  if (req.user.role !== 'Admin' && req.user.role !== 'SuperAdmin') {
    return res.status(403).json({ error: 'Access denied.' });
  }
  const { name, color, start_time, end_time, is_overnight } = req.body;
  if (!name || !start_time || !end_time) {
    return res.status(400).json({ error: 'name, start_time, end_time are required' });
  }
  try {
    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();
    await db.execute({
      sql: 'INSERT INTO time_slots (id, name, color, start_time, end_time, is_overnight) VALUES (?, ?, ?, ?, ?, ?)',
      args: [id, name, color || '#3b82f6', start_time, end_time, is_overnight ? 1 : 0]
    });
    res.status(201).json({ id });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update time slot
router.put('/slots/:id', auth, async (req, res) => {
  if (req.user.role !== 'Admin' && req.user.role !== 'SuperAdmin') {
    return res.status(403).json({ error: 'Access denied.' });
  }
  const { name, color, start_time, end_time, is_overnight } = req.body;
  try {
    await db.execute({
      sql: 'UPDATE time_slots SET name=?, color=?, start_time=?, end_time=?, is_overnight=? WHERE id=?',
      args: [name, color, start_time, end_time, is_overnight ? 1 : 0, req.params.id]
    });
    res.json({ message: 'Updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete time slot
router.delete('/slots/:id', auth, async (req, res) => {
  if (req.user.role !== 'Admin' && req.user.role !== 'SuperAdmin') {
    return res.status(403).json({ error: 'Access denied.' });
  }
  try {
    const check = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM bookings WHERE slot_id = ? AND deleted_at IS NULL',
      args: [req.params.id]
    });
    if (check.rows[0].count > 0) {
      return res.status(409).json({ error: 'Cannot delete: slot has existing bookings' });
    }
    await db.execute({ sql: 'DELETE FROM time_slots WHERE id = ?', args: [req.params.id] });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
