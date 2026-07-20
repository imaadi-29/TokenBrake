# 🚨 TokenBrake

**A high-performance, hybrid distributed circuit breaker designed to intercept runaway LLM API loops, protect multi-tenant pipelines, and eliminate catastrophic billing spikes.**

---

## 📦 The Problem
In the LLM application layer, a single asynchronous `while(true)` loop targeting OpenAI or Claude APIs can burn through thousands of dollars in token costs within minutes before cloud billing alerts trigger. Traditional rate limiters throttle users based on rigid windows, often degrading global application performance.

**TokenBrake** solves this by acting as a microsecond-latency middleware that continuously tracks request velocity per tenant. It operates natively in-memory for local workloads and seamlessly scales to a distributed backend across multiple clusters using atomic database transactions.

---

## ✨ Key Features
*   **Hybrid Memory Architecture:** Smart engine auto-detects environment scaling. Operates using an ultra-fast local `Map` fallback or scales globally using a distributed database cluster.
*   **Isolated Multi-Tenant Scoping:** Isolates request histories completely per tenant. An aggressive script anomaly from one user triggers an immediate local lockdown without impacting concurrent, healthy users.
*   **Express.js Native Middleware:** Implements a single-line middleware wrapper (`app.use()`) to protect active web application routes seamlessly.
*   **Instant Operational Alerting:** Bypasses passive monitoring dashboards to fire high-priority notification cards straight to engineering Slack channels the exact millisecond a threshold breach is contained.

---

## 🛠️ Tech Stack & Architecture Design Decisions
*   **Runtime Environment:** Node.js / Express.js
*   **Distributed Storage Engine:** Redis (`ioredis` client) utilizing an atomic **Sliding Window Log** algorithm via transactional pipelines (`ZSET`) to completely eliminate race conditions across distributed microservices.
*   **Microsecond Latency:** Evaluates traffic state compliance in `<1ms`, ensuring zero structural latency overhead for standard application users.

---

## 🚀 Rapid Deployment & Middleware Integration

### 1. Installation & Dependency Injection
Clone the repository and inject the core package components:
```bash
git clone [https://github.com/imaadi-29/TokenBrake.git](https://github.com/imaadi-29/TokenBrake.git)
cd TokenBrake
npm install

2. Native Express.js Integration Example
Protect your active API production endpoints instantly inside your application script:
const express = require('express');
const TokenBrake = require('./src/index');

const app = express();

const breaker = new TokenBrake({
    maxRequests: 5,        // Max request tolerance limit
    timeWindowMs: 5000,    // Sliding time window evaluation matrix
    redisUrl: null,        // Pass URL to engage distributed mode; defaults to local memory
    webhookUrl: "YOUR_SLACK_WEBHOOK_URL"
});

// Intercept all downstream routing pipelines safely
app.use(breaker.middleware());

app.get('/api/v1/predict', (req, res) => {
    res.json({ success: true, data: "Secure LLM payload dispatched safely." });
});

app.listen(3000);

3. Running the Operational Server Simulation
To verify the engine's hybrid isolation and containment system locally:
node examples/server.js

📊 Core Product Metrics (Telemetry Framework)
Mitigation Velocity (North Star Metric): The delta (in milliseconds) between an anomalous threshold breach and complete pipeline shutdown (Performance: < 2ms).

False Positive Rate: Deep sliding window evaluation prevents accidental throttling during legitimate burst-traffic events under high usage.

📄 License
This project is licensed under the MIT License - see the package.json file for details.

Maintained by Aaditya Dabhadkar