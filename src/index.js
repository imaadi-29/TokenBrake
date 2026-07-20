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

    // NEW: Native Express Middleware Wrapper
    middleware(options = {}) {
        return (req, res, next) => {
            // Automatically identify users by IP, or extract a custom API Token/User ID header
            const identifier = options.extractIdentifier 
                ? options.extractIdentifier(req) 
                : (req.headers['x-user-id'] || req.ip);

            const isAllowed = this.check(identifier);

            if (!isAllowed) {
                return res.status(429).json({
                    success: false,
                    error: "Too Many Requests",
                    message: "API access temporarily frozen for this identifier due to unusual request velocity."
                });
            }

            next();
        };
    }

    async sendSlackAlert(scopeKey, currentCount) {
        if (!this.webhookUrl || this.webhookUrl.includes("YOUR_SLACK_WEBHOOK_URL_HERE")) {
            console.log(`🚨 [Alert Triggered] Circuit broken for [${scopeKey}]! (Slack Webhook skipped or unconfigured)`);
            return;
        }

        const payload = {
            text: `🚨 *TokenBrake Circuit Breaker Tripped!* 🚨\n` +
                  `*Target Scope:* \`${scopeKey}\`\n` +
                  `*Velocity Breach:* ${currentCount} requests inside ${this.timeWindowMs / 1000}s\n` +
                  `*Action:* HTTP 429 Protection Engaged.`
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