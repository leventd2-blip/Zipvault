const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// View engine setup (pointing one directory up to root /views)
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'ejs');

// Static assets (pointing one directory up to root /public)
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.get('/', (req, res) => {
  res.render('index');
});

app.get('/explorer', (req, res) => {
  res.render('explorer');
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Port listener for local testing (e.g. Codespaces)
app.listen(PORT, () => {
  console.log(`ZipVault running on http://localhost:${PORT}`);
});

// Export default app for Vercel serverless execution
module.exports = app;