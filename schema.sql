-- 16 Eyes Farm House - Database Schema (SQLite/Turso)

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Staff', -- SuperAdmin, Admin, Staff
  full_name TEXT,
  mobile TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME
);

-- Time Slots Table
CREATE TABLE IF NOT EXISTS time_slots (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  is_overnight BOOLEAN DEFAULT 0,
  color TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME
);

-- Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  order_id TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  booking_date DATE NOT NULL,
  slot_id TEXT REFERENCES time_slots(id),
  guests INTEGER DEFAULT 1,
  agreed_total REAL DEFAULT 0,
  advance_paid REAL DEFAULT 0,
  discount REAL DEFAULT 0,
  status TEXT DEFAULT 'Pending', -- Pending, Confirmed, Cancelled, Completed
  notes TEXT,
  id_proof_type TEXT,
  id_proof_number TEXT,
  created_by TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME
);

-- Transaction Types (for Income/Expenses)
CREATE TABLE IF NOT EXISTS transaction_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'Income' or 'Expense'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME
);

-- Income Table
CREATE TABLE IF NOT EXISTS income (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  amount REAL NOT NULL,
  category TEXT,
  type_id TEXT REFERENCES transaction_types(id),
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME
);

-- Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  amount REAL NOT NULL,
  category TEXT,
  type_id TEXT REFERENCES transaction_types(id),
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME
);

-- Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  detail TEXT,
  user_id TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Settings Table
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  farmhouse_name TEXT DEFAULT '16 EYES Farm House',
  address TEXT,
  phone TEXT,
  logo_url TEXT,
  default_booking_notes TEXT,
  language TEXT DEFAULT 'en',
  theme TEXT DEFAULT 'dark',
  currency_symbol TEXT DEFAULT '₹',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert Initial SuperAdmin (Password: admin123) - DO NOT FORGET TO CHANGE
INSERT OR IGNORE INTO users (id, username, password, role, full_name) 
VALUES ('019dfceb-7f01-70b7-a797-d59fa092d608', 'admin', '$2a$10$X79.fQG3X7L7oR1S8YqK6e9H6.Y.mX5gW.k.X.Y.mX5gW.k.X.Y.m', 'SuperAdmin', 'Administrator');

-- Insert Default Settings
INSERT OR IGNORE INTO settings (id, farmhouse_name) VALUES (1, '16 EYES Farm House');

-- Insert Default Slots
INSERT OR IGNORE INTO time_slots (id, name, start_time, end_time, color) VALUES ('slot-1', 'Morning (9AM - 5PM)', '09:00', '17:00', '#FFD700');
INSERT OR IGNORE INTO time_slots (id, name, start_time, end_time, color) VALUES ('slot-2', 'Night (7PM - 7AM)', '19:00', '07:00', '#1A237E');
INSERT OR IGNORE INTO time_slots (id, name, start_time, end_time, color) VALUES ('slot-3', 'Full Day (24 Hours)', '09:00', '09:00', '#4CAF50');
