const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const app = express();
const JWT_SECRET = '16eyes-farmhouse-static-secret-for-easy-deployment';

// DB Client
const db = createClient({
  url: process.env.DATABASE_URL || '',
  authToken: process.env.AUTH_TOKEN || '',
});

app.use(cors({ credentials: true, origin: true }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Auth Middleware
const auth = (req, res, next) => {
  const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Health Check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Auth Routes
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await db.execute({ sql: 'SELECT * FROM profiles WHERE username = ?', args: [username] });
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    
    const rolesResult = await db.execute({ sql: 'SELECT role FROM user_roles WHERE user_id = ?', args: [user.id] });
    const role = rolesResult.rows[0]?.role || 'Staff';
    
    const token = jwt.sign({ id: user.id, username: user.username, role }, JWT_SECRET);
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, path: '/' });
    res.json({ user: { id: user.id, username: user.username, fullName: user.full_name, email: user.email, avatarUrl: user.avatar_url, role } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/auth/me', auth, async (req, res) => {
  try {
    const result = await db.execute({ sql: 'SELECT * FROM profiles WHERE id = ?', args: [req.user.id] });
    const u = result.rows[0];
    res.json({ id: u.id, username: u.username, fullName: u.full_name, email: u.email, avatarUrl: u.avatar_url, role: req.user.role });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Settings Routes
app.get('/api/settings', auth, async (req, res) => {
  try {
    const r = await db.execute('SELECT * FROM settings LIMIT 1');
    res.json(r.rows[0] || {});
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/settings', auth, async (req, res) => {
  const s = req.body;
  try {
    const keys = Object.keys(s);
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    await db.execute({ sql: `UPDATE settings SET ${setClause}`, args: Object.values(s) });
    res.json({ message: 'Updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Bookings
app.get('/api/bookings', auth, async (req, res) => {
  try {
    const r = await db.execute('SELECT * FROM bookings ORDER BY check_in DESC');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/bookings', auth, async (req, res) => {
  const b = req.body;
  try {
    const id = uuidv4();
    await db.execute({
      sql: 'INSERT INTO bookings (id, guest_name, phone, email, check_in, check_out, slot_id, status, total_amount, paid_amount, payment_status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [id, b.guest_name, b.phone, b.email, b.check_in, b.check_out, b.slot_id, b.status || 'Confirmed', b.total_amount || 0, b.paid_amount || 0, b.payment_status || 'Pending', req.user.username]
    });
    res.json({ id, message: 'Created' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Finance
app.get('/api/finance/income', auth, async (req, res) => {
  try {
    const r = await db.execute('SELECT * FROM income ORDER BY date DESC');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/finance/income', auth, async (req, res) => {
  const i = req.body;
  try {
    const id = uuidv4();
    await db.execute({
      sql: 'INSERT INTO income (id, amount, category, description, date, payment_method, booking_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [id, i.amount, i.category, i.description, i.date, i.payment_method, i.booking_id]
    });
    res.json({ id, message: 'Created' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/finance/expenses', auth, async (req, res) => {
  try {
    const r = await db.execute('SELECT * FROM expenses ORDER BY date DESC');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/finance/expenses', auth, async (req, res) => {
  const i = req.body;
  try {
    const id = uuidv4();
    await db.execute({
      sql: 'INSERT INTO expenses (id, amount, category, description, date, payment_method, vendor) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [id, i.amount, i.category, i.description, i.date, i.payment_method, i.vendor]
    });
    res.json({ id, message: 'Created' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Activity
app.get('/api/activity', auth, async (req, res) => {
  try {
    const r = await db.execute('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 100');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/activity', auth, async (req, res) => {
  const a = req.body;
  try {
    await db.execute({
      sql: 'INSERT INTO activity_logs (id, user_id, action, module, details) VALUES (?, ?, ?, ?, ?)',
      args: [uuidv4(), req.user.id, a.action, a.module, a.details]
    });
    res.json({ message: 'Logged' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// User Profile Update
app.put('/api/users/:id', auth, async (req, res) => {
  const { full_name, email, avatar_url } = req.body;
  try {
    await db.execute({
      sql: 'UPDATE profiles SET full_name = ?, email = ?, avatar_url = ? WHERE id = ?',
      args: [full_name, email, avatar_url || null, req.params.id]
    });
    res.json({ message: 'Updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Catch-all for API
app.all('/api/*', (req, res) => res.status(404).json({ error: 'API route not found' }));

module.exports = app;
