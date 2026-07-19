class TokenBrake {
    constructor(config) {
        this.maxRequests = config.maxRequests || 5;
        this.timeWindowMs = config.timeWindowMs || 10000;
        this.webhookUrl = config.webhookUrl;
        
        this.storage = new Map();
        this.trippedKeys = new Set();
    }

    check(identifier) {
        const scopeKey = identifier || 'global_fallback';

        if (!this.storage.has(scopeKey)) {
            this.storage.set(scopeKey, []);
        }

        const currentTime = Date.now();
        let userTimestamps = this.storage.get(scopeKey);

        userTimestamps = userTimestamps.filter(timestamp => {
            return currentTime - timestamp < this.timeWindowMs;
        });
        this.storage.set(scopeKey, userTimestamps);

        console.log(`[TokenBrake Core] Scope: [${scopeKey}] | Active requests in window: ${userTimestamps.length}`);

        if (userTimestamps.length >= this.maxRequests) {
            if (!this.trippedKeys.has(scopeKey)) {
                this.trippedKeys.add(scopeKey);
                this.sendSlackAlert(scopeKey, userTimestamps.length);
            }
            return false; 
        }

        userTimestamps.push(currentTime);
        this.storage.set(scopeKey, userTimestamps);
        return true; 
    }

    async sendSlackAlert(scopeKey, currentCount) {
        // Simple, clean check: if a URL exists, we send it. No strings attached.
        if (!this.webhookUrl) {
            console.log(`⚠️ No Webhook URL configured. Skipping alert.`);
            return;
        }

        const payload = {
            text: `🚨 *TokenBrake Circuit Breaker Tripped!* 🚨\n` +
                  `*Target Scope:* \`${scopeKey}\`\n` +
                  `*Velocity Breach:* ${currentCount} requests inside ${this.timeWindowMs / 1000}s\n` +
                  `*Action:* API Access Frozen for this scope.`
        };

        try {
            await fetch(this.webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            console.log(`🚀 Emergency Slack alert dispatched successfully for [${scopeKey}].`);
        } catch (error) {
            console.error("❌ Failed to send Slack alert:", error.message);
        }
    }
}

module.exports = TokenBrake;