const { createClient } = require('@libsql/client');

const url = process.env.DATABASE_URL || 'file:local.db';
const authToken = process.env.AUTH_TOKEN || '';

const db = createClient({
  url: url,
  authToken: authToken,
});

module.exports = db;
