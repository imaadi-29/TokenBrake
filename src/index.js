const Redis = require('ioredis');

class TokenBrake {
    constructor(config) {
        this.maxRequests = config.maxRequests || 5;
        this.timeWindowMs = config.timeWindowMs || 10000;
        this.webhookUrl = config.webhookUrl;
        
        // Internal memory fallback
        this.storage = new Map();
        this.trippedKeys = new Set();

        // Connect to Redis if options are provided
        this.redis = config.redisUrl ? new Redis(config.redisUrl) : null;
        
        if (this.redis) {
            console.log(`⚡ [TokenBrake] Distributed Redis mode engaged.`);
        } else {
            console.log(`💻 [TokenBrake] Local in-memory mode engaged.`);
        }
    }

    // Expose structural telemetry state for visualization
    async getTelemetryData() {
        const data = {};
        
        if (this.redis) {
            try {
                // Fetch all tracked identity keys from Redis
                const keys = await this.redis.keys('tokenbrake:scope:*');
                for (const key of keys) {
                    const identifier = key.replace('tokenbrake:scope:', '');
                    const currentCount = await this.redis.zcard(key);
                    data[identifier] = {
                        count: currentCount,
                        status: currentCount >= this.maxRequests ? 'TRIPPED' : 'HEALTHY'
                    };
                }
            } catch (err) {
                console.error("Telemetry fetch fallback:", err.message);
            }
        } else {
            // Read from local memory Map
            for (const [identifier, timestamps] of this.storage.entries()) {
                const currentTime = Date.now();
                const activeTimestamps = timestamps.filter(t => currentTime - t < this.timeWindowMs);
                data[identifier] = {
                    count: activeTimestamps.length,
                    status: activeTimestamps.length >= this.maxRequests ? 'TRIPPED' : 'HEALTHY'
                };
            }
        }
        return data;
    }

    // Core validation router
    async check(identifier) {
        const scopeKey = identifier || 'global_fallback';
        
        if (this.redis) {
            return await this.checkRedis(scopeKey);
        } else {
            return this.checkMemory(scopeKey);
        }
    }

    // 1. High-Performance Distributed Redis Algorithm (Sliding Window Log)
    async checkRedis(scopeKey) {
        const currentTime = Date.now();
        const clearBefore = currentTime - this.timeWindowMs;
        const redisKey = `tokenbrake:scope:${scopeKey}`;

        try {
            // Atomic transaction pipeline to prevent race conditions
            const pipeline = this.redis.pipeline();
            pipeline.zremrangebyscore(redisKey, 0, clearBefore); // Remove stale timestamps
            pipeline.zcard(redisKey);                           // Count active timestamps
            
            const results = await pipeline.exec();
            const currentCount = results[1][1]; // Get the result of ZCARD

            console.log(`[TokenBrake Redis] Scope: [${scopeKey}] | Active requests in window: ${currentCount}`);

            if (currentCount >= this.maxRequests) {
                if (!this.trippedKeys.has(scopeKey)) {
                    this.trippedKeys.add(scopeKey);
                    this.sendSlackAlert(scopeKey, currentCount);
                }
                return false;
            }

            // Record the current unique request hit
            await this.redis.zadd(redisKey, currentTime, `${currentTime}-${Math.random()}`);
            // Auto-expire the key after the window closes to prevent database bloat
            await this.redis.pexpire(redisKey, this.timeWindowMs);
            return true;
        } catch (error) {
            console.error("🚨 TokenBrake Redis Error, falling back to local memory safety:", error.message);
            return this.checkMemory(scopeKey);
        }
    }

    // 2. Legacy Local Memory Architecture
    checkMemory(scopeKey) {
        if (!this.storage.has(scopeKey)) {
            this.storage.set(scopeKey, []);
        }

        const currentTime = Date.now();
        let userTimestamps = this.storage.get(scopeKey);

        userTimestamps = userTimestamps.filter(timestamp => currentTime - timestamp < this.timeWindowMs);
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

    // Native Express Middleware Wrapper
    middleware(options = {}) {
        return async (req, res, next) => {
            const identifier = options.extractIdentifier 
                ? options.extractIdentifier(req) 
                : (req.headers['x-user-id'] || req.ip);

            const isAllowed = await this.check(identifier);

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
            console.log(`🚨 [Alert Triggered] Circuit broken for [${scopeKey}]! (Slack Webhook skipped)`);
            return;
        }

        const payload = {
            text: `🚨 *TokenBrake Circuit Breaker Tripped!* 🚨\n` +
                  `*Target Scope:* \`${scopeKey}\`\n` +
                  `*Velocity Breach:* ${currentCount} requests inside ${this.timeWindowMs / 1000}s\n` +
                  `*Action:* Distributed Containment Engaged.`
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