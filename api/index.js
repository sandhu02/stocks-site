// api/index.js
const app = require('../index');
const serverless = require('serverless-http');

module.exports = serverless(app);