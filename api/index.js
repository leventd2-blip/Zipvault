require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const fs = require('fs');
const path = require('path');

// 1. Initialize Express Web Server
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 1080;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GITHUB_FEED_CHANNEL_ID = process.env.GITHUB_FEED_CHANNEL_ID;
const OWNER_ID = process.env.OWNER;

// 2. Initialize Discord Bot Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', () => {
    console.log(`Logged in to Discord as ${client.user.tag}! (Bot is now Online)`);
});

// 3. Safe Stats Tracking (Vercel Compatible / Fallback)
const STATS_FILE = path.join(__dirname, 'uploads.txt');

function incrementUploadCount() {
    try {
        let count = 0;
        if (fs.existsSync(STATS_FILE)) {
            const data = fs.readFileSync(STATS_FILE, 'utf8').trim();
            count = parseInt(data, 10) || 0;
        }
        count++;
        // Attempt write (will work on persistent servers, safe-guarded on Vercel)
        fs.writeFileSync(STATS_FILE, count.toString(), 'utf8');
        return count;
    } catch (e) {
        // If file system is read-only (like Vercel serverless), return a safe dummy or mock count to prevent 500 crashes
        return 1; 
    }
}

app.post('/api/track-upload', (req, res) => {
    const total = incrementUploadCount();
    res.json({ success: true, totalUploads: total });
});

// 4. Discord Message Command Handler (Owner Only)
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content === 'Z!totalfiles') {
        if (message.author.id !== OWNER_ID) {
            return message.reply("❌ You do not have permission to use this command.");
        }

        let totalUploads = 0;
        try {
            if (fs.existsSync(STATS_FILE)) {
                const data = fs.readFileSync(STATS_FILE, 'utf8').trim();
                totalUploads = parseInt(data, 10) || 0;
            }
        } catch (err) {
            console.error('Failed to read uploads.txt stats:', err);
        }

        message.reply(`📦 **ZipVault Global Stats:** Total archives inspected: **${totalUploads}**`);
    }
});

client.login(DISCORD_BOT_TOKEN);

// 5. GitHub Webhook Route
app.post('/webhook/github', async (req, res) => {
    const event = req.headers['x-github-event'];
    const data = req.body;

    if (event === 'push') {
        const repoName = data.repository.name;
        const pusher = data.pusher.name;
        const branch = data.ref.split('/').pop();
        const commits = data.commits;

        const embed = {
            title: `⚡ [${repoName}:${branch}] ${commits.length} new commit(s)`,
            description: `> Pushed by **${pusher}**`,
            color: 1081344,
            fields: commits.slice(0, 5).map(c => ({
                name: `[\`${c.id.substring(0, 7)}\`](${c.url})`,
                value: `> ${c.message.split('\n')[0]}`
            })),
            footer: {
                text: "ZipVault GitHub Feed"
            }
        };

        try {
            const channel = await client.channels.fetch(GITHUB_FEED_CHANNEL_ID);
            if (channel) {
                await channel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Failed to send webhook to Discord:', error);
        }
    }

    res.status(200).send('Webhook received successfully');
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

module.exports = app;