const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || '16eyes-farmhouse-static-secret-for-easy-deployment';

exports.login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    let result = await db.execute({
      sql: 'SELECT * FROM users WHERE username = ? AND deleted_at IS NULL',
      args: [username]
    });

    // If no users exist at all, auto-create the admin user (Safety for fresh DB)
    if (result.rows.length === 0 && username === 'admin') {
      const allUsers = await db.execute('SELECT COUNT(*) as count FROM users');
      if (allUsers.rows[0].count === 0) {
        console.log('🆕 Fresh database detected. Creating default admin user...');
        const hashedAdminPassword = await bcrypt.hash('admin', 10);
        await db.execute({
          sql: 'INSERT INTO users (id, username, password, role, full_name) VALUES (?, ?, ?, ?, ?)',
          args: ['019dfceb-7f01-70b7-a797-d59fa092d608', 'admin', hashedAdminPassword, 'SuperAdmin', 'Administrator']
        });
        // Re-fetch the user
        result = await db.execute({
          sql: 'SELECT * FROM users WHERE username = ? AND deleted_at IS NULL',
          args: [username]
        });
      }
    }

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('token', token, {
      httpOnly: true,
      secure: true, // Required for cross-domain sameSite: none
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'
    });

    res.json({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        mobile: user.mobile,
        role: user.role
      },
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
};

exports.logout = (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('token', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/'
  });
  res.json({ message: 'Logged out successfully' });
};

exports.getMe = async (req, res) => {
  try {
    const result = await db.execute({
      sql: 'SELECT id, username, full_name, mobile, role FROM users WHERE id = ? AND deleted_at IS NULL',
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
      mobile: user.mobile,
      role: user.role
    });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
