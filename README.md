# 🚨 TokenBrake

**An asymmetric, multi-tenant operational circuit breaker designed to intercept runaway LLM API loops and prevent catastrophic billing spikes.**

---

## 📦 The Problem
Traditional rate limiters throttle users based on fixed windows to preserve server bandwidth. However, in the LLM era, a single asynchronous `while(true)` loop targeting OpenAI or Claude APIs can burn through thousands of dollars in token costs within minutes before standard billing alerts trigger. 

Existing observability tools require heavy architectural changes or introduce significant network latency. 

**TokenBrake** solves this by operating as a zero-dependency, microsecond-latency local middleware that continuously monitors request velocity per tenant and automatically cuts the pipeline the instant an anomaly is detected.

---

## ✨ Key Features
*   **Isolated Multi-Tenant Scoping:** Utilizes a dynamic memory lookup matrix (`Map`) to isolate request histories. A runaway loop from an abusive user triggers a local lockdown without affecting legitimate concurrent users.
*   **Zero-Dependency Footprint:** Built natively with zero external runtime dependencies to keep deployment sizes minimal and avoid third-party security vulnerabilities.
*   **Instant Operational Alerting:** Bypasses passive dashboards to push interactive emergency cards directly to engineering Slack channels the exact millisecond a threshold is breached.

---

## 🛠️ Tech Stack & Architecture Design Decisions
*   **Runtime:** Node.js
*   **Data Structures:** JavaScript `Map` for $O(1)$ constant-time lookup velocity, combined with a `Set` lockout mechanism to ensure duplicate alerting spam is completely suppressed during an ongoing incident.
*   **Latency Over Persistence:** Data is maintained strictly in-memory. By intentionally avoiding database overhead for the MVP, the middleware evaluates traffic compliance in `<1ms`, ensuring zero noticeable latency overhead for the end-user application.

---

## 📊 Core Product Metrics (Telemetry Framework)
1.  **Mitigation Velocity (North Star Metric):** The delta (in milliseconds) between a threshold breach and complete pipeline lockdown (MVP Performance: `< 2ms`).
2.  **False Positive Rate:** Measuring legitimate burst traffic versus structural loop degradation to ensure valid users are never throttled during normal high-velocity usage.

---

## 🚀 Step-by-Step Verification Demo

### 1. Installation & Setup
Clone the repository and install dependencies:
```bash
git clone https://github.com/YOUR_USERNAME/TokenBrake.git
cd TokenBrake
npm install
```

### 2. Configure Your Slack Alert Guardrail
Open `examples/simulation.js` and input your live incoming Slack Webhook URL.

### 3. Run the Traffic Isolation Simulation
```bash
node examples/simulation.js
```

**Expected Terminal Output Behavior:**
*   `User B (Runaway Script)` spams requests every 200ms → Trips the threshold at Request #5 → Pipeline halts execution instantly → Slack alert is dispatched.
*   `User A (Healthy App)` continues to process data smoothly in the background, proving complete resource isolation.

---

## 📄 License
This project is licensed under the MIT License - see the package.json file for details.

---
*Maintained by Aaditya Dabhadkar*