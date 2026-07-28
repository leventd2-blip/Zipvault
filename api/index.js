const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// View engine setup
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'ejs');

// Static assets
app.use(express.static(path.join(__dirname, '../public')));

// Stats file tracking path (Saves only total count number)
const STATS_FILE = path.join(__dirname, '../uploads.txt');

function incrementUploadCount() {
    try {
        let count = 0;
        if (fs.existsSync(STATS_FILE)) {
            const data = fs.readFileSync(STATS_FILE, 'utf8').trim();
            count = parseInt(data, 10) || 0;
        }
        count++;
        fs.writeFileSync(STATS_FILE, count.toString(), 'utf8');
        return count;
    } catch (e) {
        console.error('Error updating upload stats:', e);
        return 0;
    }
}

// Routes
app.get('/', (req, res) => {
  res.render('index');
});

app.get('/explorer', (req, res) => {
  res.render('explorer');
});

// Endpoint to increment and fetch total anonymous upload stats
app.post('/api/track-upload', (req, res) => {
  const total = incrementUploadCount();
  res.json({ success: true, totalUploads: total });
});

app.get('/api/health', (req, res) => {
  const memoryUsage = process.memoryUsage();
  res.json({
    status: 'online',
    app: 'ZipVault',
    environment: process.env.NODE_ENV || 'development',
    uptimeSeconds: Math.floor(process.uptime()),
    memory: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`
    },
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`ZipVault running on http://localhost:${PORT}`);
});

module.exports = app;