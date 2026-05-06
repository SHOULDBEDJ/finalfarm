const db = require('../db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

exports.getSettings = async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM settings WHERE id = 1');
    if (result.rows.length === 0) {
      await db.execute(`INSERT INTO settings (id, farmhouse_name) VALUES (1, '16 Eyes Farm House')`);
      const created = await db.execute('SELECT * FROM settings WHERE id = 1');
      return res.json(created.rows[0]);
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateSettings = async (req, res) => {
  if (req.user.role !== 'Admin' && req.user.role !== 'SuperAdmin') {
    return res.status(403).json({ error: 'Access denied. Admin role required.' });
  }

  const body = { ...req.body };
  delete body.id;
  delete body.updated_at;
  delete body.created_at;
  
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
};

exports.getTimeSlots = async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM time_slots WHERE deleted_at IS NULL ORDER BY start_time');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.createTimeSlot = async (req, res) => {
  if (req.user.role !== 'Admin' && req.user.role !== 'SuperAdmin') {
    return res.status(403).json({ error: 'Access denied.' });
  }
  const { name, color, start_time, end_time, is_overnight } = req.body;
  if (!name || !start_time || !end_time) {
    return res.status(400).json({ error: 'name, start_time, end_time are required' });
  }
  try {
    const id = uuidv4();
    await db.execute({
      sql: 'INSERT INTO time_slots (id, name, color, start_time, end_time, is_overnight) VALUES (?, ?, ?, ?, ?, ?)',
      args: [id, name, color || '#3b82f6', start_time, end_time, is_overnight ? 1 : 0]
    });
    res.status(201).json({ id });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateTimeSlot = async (req, res) => {
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
};

exports.deleteTimeSlot = async (req, res) => {
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
    await db.execute({
      sql: 'UPDATE time_slots SET deleted_at = ? WHERE id = ?',
      args: [new Date().toISOString(), req.params.id]
    });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.backupData = async (req, res) => {
  if (req.user.role !== 'SuperAdmin') {
    return res.status(403).json({ error: 'Access denied. SuperAdmin only.' });
  }

  try {
    const tables = ['users', 'time_slots', 'bookings', 'settings', 'transaction_types', 'income', 'expenses', 'activity_logs'];
    const backup = {};

    for (const table of tables) {
      try {
        const result = await db.execute(`SELECT * FROM ${table}`);
        backup[table] = result.rows;
      } catch (e) {
        console.warn(`Backup table ${table} failed:`, e.message);
      }
    }

    res.json({
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      data: backup
    });
  } catch (err) {
    console.error('Backup error:', err);
    res.status(500).json({ error: 'Failed to generate backup' });
  }
};

exports.restoreData = async (req, res) => {
  if (req.user.role !== 'SuperAdmin') {
    return res.status(403).json({ error: 'Access denied. SuperAdmin only.' });
  }

  const { data } = req.body;
  if (!data) return res.status(400).json({ error: 'No data provided' });

  try {
    const tables = Object.keys(data);
    for (const table of tables) {
      const rows = data[table];
      if (!Array.isArray(rows)) continue;

      for (const row of rows) {
        const fields = Object.keys(row);
        const placeholders = fields.map(() => '?').join(', ');
        const columns = fields.join(', ');
        const values = Object.values(row);

        try {
          await db.execute({
            sql: `INSERT OR REPLACE INTO ${table} (${columns}) VALUES (${placeholders})`,
            args: values
          });
        } catch (e) {
          console.warn(`Restore row failed in ${table}:`, e.message);
        }
      }
    }
    res.json({ message: 'Data restored successfully' });
  } catch (err) {
    console.error('Restore error:', err);
    res.status(500).json({ error: err.message || 'Failed to restore data' });
  }
};

exports.wipeData = async (req, res) => {
  if (req.user.role !== 'SuperAdmin') {
    return res.status(403).json({ error: 'Access denied. SuperAdmin only.' });
  }

  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required for verification' });
  }

  try {
    const userResult = await db.execute({
      sql: 'SELECT password FROM users WHERE username = ?',
      args: [username]
    });

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid verification credentials' });
    }

    const valid = await bcrypt.compare(password, userResult.rows[0].password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid verification credentials' });
    }

    const tablesToWipe = ['activity_logs', 'expenses', 'income', 'bookings', 'users'];
    for (const table of tablesToWipe) {
      if (table === 'users') {
        await db.execute({ sql: 'DELETE FROM users WHERE id != ?', args: [req.user.id] });
      } else {
        await db.execute(`DELETE FROM ${table}`);
      }
    }
    await db.execute(`UPDATE settings SET farmhouse_name = '16 Eyes Farm House', logo_url = NULL WHERE id = 1`);
    res.json({ message: 'Database wiped successfully. SuperAdmin retained.' });
  } catch (err) {
    console.error('Wipe error:', err);
    res.status(500).json({ error: 'Failed to wipe database' });
  }
};
