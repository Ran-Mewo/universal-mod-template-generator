// This file serves as the entry point for Vercel serverless functions
const app = require('../backend/server');

// Export the Express app as a serverless function
module.exports = app;
