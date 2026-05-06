const { createClient } = require('@libsql/client');

const url = process.env.DATABASE_URL;
const authToken = process.env.AUTH_TOKEN;

if (!url) {
  // During startup, this will be caught by server/index.js if variables aren't loaded yet
  console.warn('⚠️ DATABASE_URL is not defined in environment variables');
}

const db = createClient({
  url: url || '',
  authToken: authToken || '',
});

module.exports = db;
