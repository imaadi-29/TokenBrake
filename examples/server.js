const express = require('express');
const TokenBrake = require('../src/index');

const app = express();
const PORT = 3000;

// Initialize TokenBrake: Allow max 3 requests every 5 seconds per user
const brake = new TokenBrake({
    maxRequests: 3,
    timeWindowMs: 5000,
    webhookUrl: "YOUR_SLACK_WEBHOOK_URL_HERE" // Optional: paste your webhook here if you want live pings
});

// Protect all downstream routes with TokenBrake middleware
app.use(brake.middleware());

// A mocked production endpoint
app.get('/api/data', (req, res) => {
    res.json({
        success: true,
        message: "Secure data fetched successfully."
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Web Server running at http://localhost:${PORT}`);
    console.log(`🔒 TokenBrake middleware active (Threshold: 3 reqs / 5s)\n`);
});