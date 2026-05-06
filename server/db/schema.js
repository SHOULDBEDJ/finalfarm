const db = require('./index');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const schema = `
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  avatar_url TEXT,
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active',
  last_login_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  PRIMARY KEY (user_id, role),
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS time_slots (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  is_overnight INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  order_id TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  booking_date TEXT NOT NULL,
  slot_id TEXT,
  guests INTEGER DEFAULT 1,
  agreed_total REAL DEFAULT 0,
  advance_paid REAL DEFAULT 0,
  discount REAL DEFAULT 0,
  status TEXT DEFAULT 'Pending',
  notes TEXT,
  id_proof_type TEXT,
  id_proof_number TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  FOREIGN KEY (slot_id) REFERENCES time_slots(id),
  FOREIGN KEY (created_by) REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  farmhouse_name TEXT DEFAULT '16 Eyes Farm House',
  logo_url TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  website TEXT,
  business_name TEXT,
  business_phone TEXT,
  business_email TEXT,
  business_address TEXT,
  gst_number TEXT,
  tax_percent REAL DEFAULT 0,
  default_booking_notes TEXT,
  notify_bookings INTEGER DEFAULT 1,
  notify_payments INTEGER DEFAULT 1,
  notify_daily_summary INTEGER DEFAULT 1,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS income_types (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS incomes (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  type_id TEXT,
  amount REAL NOT NULL,
  payment_mode TEXT NOT NULL DEFAULT 'Cash',
  reference TEXT,
  description TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  FOREIGN KEY (type_id) REFERENCES income_types(id),
  FOREIGN KEY (created_by) REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS expense_types (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  type_id TEXT,
  amount REAL NOT NULL,
  payment_mode TEXT NOT NULL DEFAULT 'Cash',
  vendor TEXT,
  reference TEXT,
  description TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  FOREIGN KEY (type_id) REFERENCES expense_types(id),
  FOREIGN KEY (created_by) REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  username TEXT,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  details TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES profiles(id)
);
`;

const migrations = [
  `ALTER TABLE profiles ADD COLUMN status TEXT NOT NULL DEFAULT 'Active'`,
  `ALTER TABLE expenses ADD COLUMN vendor TEXT`,
  `ALTER TABLE settings ADD COLUMN website TEXT`,
  `ALTER TABLE settings ADD COLUMN logo_url TEXT`,
  `ALTER TABLE bookings ADD COLUMN created_by TEXT`,
  `ALTER TABLE profiles ADD COLUMN avatar_url TEXT`,
];

async function initSchema() {
  try {
    const statements = schema.split(';').map(s => s.trim()).filter(s => s.length > 0);
    for (const stmt of statements) {
      await db.execute(stmt);
    }
    console.log('✅ Database schema verified');

    for (const migration of migrations) {
      try {
        await db.execute(migration);
        console.log(`✅ Migration applied: ${migration.substring(0, 40)}...`);
      } catch (e) {
        // Silently skip if column already exists
      }
    }

    await seedData();
  } catch (error) {
    console.error('❌ Failed to initialize schema:', error);
    throw error;
  }
}

async function seedData() {
  try {
    const settings = await db.execute('SELECT id FROM settings WHERE id = 1');
    if (settings.rows.length === 0) {
      await db.execute(`INSERT INTO settings (id, farmhouse_name) VALUES (1, '16 Eyes Farm House')`);
    }

    const slots = await db.execute('SELECT id FROM time_slots LIMIT 1');
    if (slots.rows.length === 0) {
      const defaultSlots = [
        ['slot1', 'Morning',   '#3b82f6', '06:00', '12:00', 0],
        ['slot2', 'Afternoon', '#10b981', '12:00', '18:00', 0],
        ['slot3', 'Evening',   '#f59e0b', '18:00', '22:00', 0],
        ['slot4', 'Night',     '#6366f1', '22:00', '06:00', 1],
        ['slot5', 'Full Day',  '#ef4444', '06:00', '06:00', 1],
      ];
      for (const slot of defaultSlots) {
        await db.execute({
          sql: 'INSERT OR IGNORE INTO time_slots (id, name, color, start_time, end_time, is_overnight) VALUES (?, ?, ?, ?, ?, ?)',
          args: slot
        });
      }
    }

    const profiles = await db.execute('SELECT id FROM profiles LIMIT 1');
    if (profiles.rows.length === 0) {
      const adminId = 'admin-superadmin-1';
      const hashedPassword = await bcrypt.hash('farmhouse@123', 10);
      await db.execute({
        sql: 'INSERT INTO profiles (id, username, full_name, password_hash, status) VALUES (?, ?, ?, ?, ?)',
        args: [adminId, 'admin', 'Super Admin', hashedPassword, 'Active']
      });
      await db.execute({
        sql: 'INSERT INTO user_roles (user_id, role) VALUES (?, ?)',
        args: [adminId, 'SuperAdmin']
      });
      console.log('✅ Seed: Default SuperAdmin created (admin / farmhouse@123)');
    }

    const incomeTypes = await db.execute('SELECT id FROM income_types LIMIT 1');
    if (incomeTypes.rows.length === 0) {
      const types = ['Catering', 'Photography', 'Decoration', 'Other'];
      for (const name of types) {
        await db.execute({ sql: 'INSERT OR IGNORE INTO income_types (id, name) VALUES (?, ?)', args: [uuidv4(), name] });
      }
    }

    const expenseTypes = await db.execute('SELECT id FROM expense_types LIMIT 1');
    if (expenseTypes.rows.length === 0) {
      const types = ['Maintenance', 'Utilities', 'Staff', 'Groceries', 'Fuel', 'Other'];
      for (const name of types) {
        await db.execute({ sql: 'INSERT OR IGNORE INTO expense_types (id, name) VALUES (?, ?)', args: [uuidv4(), name] });
      }
    }
  } catch (error) {
    console.error('❌ Failed to seed data:', error);
  }
}

module.exports = { initSchema };
