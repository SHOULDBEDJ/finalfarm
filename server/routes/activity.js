const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth } = require('../middleware/auth');

// Log activity
router.post('/', auth, async (req, res) => {
  const { action, module, detail, details } = req.body;
  const detailText = details || detail || null; // Accept both field names for compatibility
  
  try {
    await db.execute({
      sql: 'INSERT INTO activity_log (user_id, username, action, module, details) VALUES (?, ?, ?, ?, ?)',
      args: [req.user.id, req.user.username, action, module || 'System', detailText]
    });
    res.status(201).json({ message: 'Logged' });
  } catch (err) {
    console.error('Activity log error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get recent activity
router.get('/', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const result = await db.execute({
      sql: `SELECT a.id, a.action, a.module, a.details, a.created_at, 
                   a.username, a.user_id,
                   p.full_name
            FROM activity_log a
            LEFT JOIN profiles p ON a.user_id = p.id
            ORDER BY a.created_at DESC 
            LIMIT ?`,
      args: [limit]
    });
    
    const formatted = result.rows.map(r => ({
      ...r,
      performer: {
        full_name: r.full_name || r.username || 'System',
        email: null
      }
    }));
    
    res.json(formatted);
  } catch (err) {
    console.error('Get activity error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
