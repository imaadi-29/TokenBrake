const TokenBrake = require('../src/index');

// Initialize TokenBrake
const brake = new TokenBrake({
    maxRequests: 4,
    timeWindowMs: 5000,
    webhookUrl: "YOUR_SLACK_WEBHOOK_URL_HERE" // 👈 Paste your working Slack Webhook URL here!
});
console.log("🔍 Loaded Webhook URL is:", brake.webhookUrl);

console.log("🎬 Starting Isolated Debug Simulation...\n");

// --- USER A: The Safe Consumer ---
const userAInterval = setInterval(() => {
    const isAllowed = brake.check("user_A_healthy_app");
    if (isAllowed) {
        console.log("✅ User A request processed normally.\n");
    } else {
        console.log("❌ CRITICAL BUG: User A was blocked unfairly!\n");
    }
}, 2000);

// --- USER B: The Runaway Loop ---
let requestCounterB = 1;
const userBInterval = setInterval(() => {
    const isAllowed = brake.check("user_B_broken_loop");
    if (isAllowed) {
        console.log(`🔥 User B request #${requestCounterB} processed.`);
        requestCounterB++;
    } else {
        console.log(`🛑 User B Request #${requestCounterB} CONTAINED & BLOCKED by TokenBrake.`);
        clearInterval(userBInterval); 
    }
}, 200);

// Clean exit after 8 seconds
setTimeout(() => {
    clearInterval(userAInterval);
    console.log("🏁 Isolated simulation test complete.");
}, 8000);