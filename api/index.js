// Vercel Serverless Function entry point
// This file is the bridge between Vercel's serverless infrastructure and the Express app
const app = require('../server/index');

module.exports = app;
