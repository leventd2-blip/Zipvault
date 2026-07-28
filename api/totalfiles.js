const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
    const statsFile = path.join(process.cwd(), 'uploads.txt');
    let totalUploads = 0;

    try {
        if (fs.existsSync(statsFile)) {
            const data = fs.readFileSync(statsFile, 'utf8').trim();
            totalUploads = parseInt(data, 10) || 0;
        }
    } catch (err) {
        console.error('Failed to read uploads.txt:', err);
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({ totalUploads });
};