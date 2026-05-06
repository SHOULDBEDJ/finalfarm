const db = require('./index');

const initDb = async () => {
  console.log('⏳ Checking database tables...');
  try {
    // Users Table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'Staff',
        full_name TEXT,
        mobile TEXT,
        status TEXT DEFAULT 'Active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME
      )
    `);

    // Time Slots Table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS time_slots (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        start_time TEXT,
        end_time TEXT,
        is_overnight BOOLEAN DEFAULT 0,
        color TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME
      )
    `);

    // Bookings Table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY,
        order_id TEXT UNIQUE NOT NULL,
        customer_name TEXT NOT NULL,
        mobile TEXT NOT NULL,
        booking_date DATE NOT NULL,
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME
      )
    `);

    // Transaction Types
    await db.execute(`
      CREATE TABLE IF NOT EXISTS transaction_types (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME
      )
    `);

    // Income Table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS income (
        id TEXT PRIMARY KEY,
        date DATE NOT NULL,
        amount REAL NOT NULL,
        category TEXT,
        type_id TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME
      )
    `);

    // Expenses Table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        date DATE NOT NULL,
        amount REAL NOT NULL,
        category TEXT,
        type_id TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME
      )
    `);

    // Activity Logs
    await db.execute(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        module TEXT NOT NULL,
        detail TEXT,
        user_id TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Settings
    await db.execute(`
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
      )
    `);

    // Default Settings
    await db.execute(`INSERT OR IGNORE INTO settings (id, farmhouse_name) VALUES (1, '16 EYES Farm House')`);

    // Default SuperAdmin (admin / admin)
    const bcrypt = require('bcryptjs');
    const hashedAdminPassword = await bcrypt.hash('admin', 10);
    await db.execute({
      sql: 'INSERT OR IGNORE INTO users (id, username, password, role, full_name) VALUES (?, ?, ?, ?, ?)',
      args: ['019dfceb-7f01-70b7-a797-d59fa092d608', 'admin', hashedAdminPassword, 'SuperAdmin', 'Administrator']
    });

    console.log('✅ Database initialized successfully.');
  } catch (err) {
    console.error('❌ Database initialization failed:', err);
  }
};


module.exports = initDb;
