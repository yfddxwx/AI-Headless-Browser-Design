<p align="center">
  <h1 align="center">🌐 AgentBrowser (NoHead-AI)</h1>
  <p align="center">
    <strong>An AI-Native Headless Browser tailored for LLMs & Autonomous Agents.</strong>
    <br />
    <em>Semantic DOM Compression • Deterministic <code>@Ref</code> Actions • SSRF & Prompt Guardrails • Native MCP Protocol</em>
  </p>
</p>

<p align="center">
  <a href="README.md"><strong>English</strong></a> • <a href="README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <a href="https://github.com/yfddxwx/AI-Headless-Browser-Design/actions"><img src="https://img.shields.io/badge/CI-Passing-brightgreen?style=flat-square&logo=github-actions" alt="CI" /></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" alt="License: MIT" /></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node-%3E%3D20.0.0-green.svg?style=flat-square&logo=node.js" alt="Node" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Strict-blue?style=flat-square&logo=typescript" alt="TypeScript" /></a>
  <a href="https://modelcontextprotocol.io/"><img src="https://img.shields.io/badge/MCP-Compatible-purple?style=flat-square" alt="MCP Compatible" /></a>
  <a href="https://github.com/yfddxwx/AI-Headless-Browser-Design/pulls"><img src="https://img.shields.io/badge/PRs-welcome-orange.svg?style=flat-square" alt="PRs Welcome" /></a>
</p>

---

## 💡 Why AgentBrowser? (Why Traditional Headless Browsers Fail for LLMs)

Traditional headless browsers (Playwright, Puppeteer, Selenium) were engineered for **human QA engineers** and **classic web scrapers**. When connected directly to LLMs and autonomous agents, they present severe architectural bottlenecks:

1. **Token Bloat**: Raw HTML spans 30,000 to 100,000+ tokens filled with CSS, scripts, inline SVGs, and invisible nodes.
2. **Fragile Selectors & Hallucinations**: LLMs hallucinate complex CSS/XPath selectors that break upon minor DOM shifts.
3. **Blackbox Feedback**: Browsers return void or boolean results without showing *what actually mutated on screen*.
4. **Security Blindspots**: Adversarial prompt injections (`display:none` hidden text) and SSRF exploits targeting internal cloud metadata services.

**AgentBrowser is built from first principles for AI agents**:

| Dimension | Traditional Headless Browser | AgentBrowser (NoHead-AI) |
| :--- | :--- | :--- |
| **Perception** | Raw HTML (30k - 100k+ Tokens) | **Semantic Compressed Markdown** (~85%-95% Token reduction) |
| **Locators** | Brittle CSS / XPath | **Deterministic <code>@1</code>, <code>@2</code> Ref Registry** |
| **State Mutation** | Blackbox (Void or Boolean) | **StateDiff**: Automatic diff of URL, Title, and interactive elements |
| **Visual Grounding** | Plain screenshots prone to click drift | **Set-of-Mark (SOM)**: High-contrast overlay tags aligned to physical pixels |
| **Security** | Standard Sandbox only | **SSRF Private CIDR Blocker + Indirect Prompt Injection (IPI) Guard** |
| **Protocol** | Custom Glue Code | **Native Model Context Protocol (MCP)** + One-Sentence Natural Language CLI |

---

## 🌟 Feature Matrix & Architecture Specifications

| Specification | Module Name | Core Capabilities | RFC Document |
| :--- | :--- | :--- | :---: |
| **Feature 01** | **Core Engine & Perception** | Lightweight runtime, semantic DOM compression (85%-95% savings), deterministic `@Ref` registry, SSRF private IP defense | [View Spec](./docs/specs/01-core-engine-and-perception.md) |
| **Feature 02** | **Multimodal Visual Perception** | Viewport visibility pruning, bounding box calculation, Set-of-Mark (SOM) non-destructive rendering, coordinate clicks | [View Spec](./docs/specs/02-multimodal-visual-perception.md) |
| **Feature 03** | **Tab Manager & History Tree** | Deterministic `tabId`, `window.open` popup auto-capture with opener hierarchy (`openerTabId`), cross-tab context switching | [View Spec](./docs/specs/03-tab-manager-and-history-tree.md) |
| **Feature 04** | **Session Vault & Persistence** | Cookie / LocalStorage / SessionStorage export & import, credential encryption, Cloudflare/reCAPTCHA bot detection hook | [View Spec](./docs/specs/04-storage-vault-and-auth-persistence.md) |
| **Feature 05** | **Performance Shield & Overlap** | NetworkShield ad/analytics aborting (70% latency cut), physical occlusion detection (`elementFromPoint`), 20% overlap scrolling | [View Spec](./docs/specs/05-performance-acceleration-and-modern-web-enhancement.md) |
| **Feature 06** | **Structured Data Extractor** | Schema.org JSON-LD matching, table & repeating card clustering, IPI injection sanitization, focused context slicing | [View Spec](./docs/specs/06-structured-extractor-and-jsonld-parser.md) |
| **Feature 07** | **HITL Challenge Circuit Breaker** | Tri-state breaker (`closed`/`open`/`half_open`), Cloudflare/2FA/CAPTCHA pausing, pluggable solver hooks & manual override | [View Spec](./docs/specs/07-hitl-challenge-circuit-breaker-and-solvers.md) |
| **Feature 08** | **Remote Cloud CDP & BrowserPool** | Remote WebSocket CDP (Browserbase/Steel/Docker), elastic session pooling (leases, queue, lifetime, auto-clean hygiene) | [View Spec](./docs/specs/08-remote-cdp-and-cluster-browser-pool.md) |
| **Feature 09** | **Autonomous CLI & ReAct Runner** | Autonomous `Thought -> Action -> Observation` loop, step budget guard (`maxSteps`), universal OpenAI/DeepSeek/Qwen/Ollama client | [View Spec](./docs/specs/09-autonomous-natural-language-cli-and-react-runner.md) |

---

## 👥 Virtual Engineering Team Architecture

This project is developed using an **Autonomous Engineering Team Model**, where every module is governed by a distinct engineering role and verified by a multi-dimensional gatekeeper loop:

```
                ┌──────────────────────────────┐
                │   🏛️ System Architect        │
                │   Contracts / RFCs / Types   │
                └──────────────┬───────────────┘
                               │
          ┌─────────────────────┴─────────────────────┐
          ▼                                           ▼
┌──────────────────────────────┐   ┌──────────────────────────────┐
│  ⚙️ Core Engine Dev           │   │  🧠 AI Protocol Dev          │
│  Playwright / Session / CDP  │   │  DOM Compressor / @Refs / MCP│
└──────────────┬───────────────┘   └──────────────┬───────────────┘
               │                                  │
               └─────────────────────┬────────────┘
                                     ▼
                       ┌──────────────────────────────┐
                       │  🛡️ Security Engineer        │
                       │  SSRF / Prompt Injection Sec │
                       └──────────────┬───────────────┘
                                      │
                                      ▼
                       ┌──────────────────────────────┐
                       │  🧪 QA Gatekeeper            │
                       │  Unit/Func/Integ/Sec Audit   │
                       └──────────────┬───────────────┘
                                      │ PASS
                                      ▼
                              [ Feature Accepted ]
```

---

## ⚡ Quick Start

### 1. Installation

```bash
npm install @yfddxwx/ai-headless-browser

# Install browser binaries
npx playwright install chromium
```

---

### 2. Autonomous Natural Language CLI (`agent-browser run`)

Execute end-to-end web tasks autonomously from your terminal using a single natural language instruction:

```bash
# Link binary globally in development
npm link

# 1. Execute an instruction autonomously (powered by ReAct loop)
agent-browser run "Find the top trending project on GitHub" --url "https://github.com/trending"

# 2. Use with DeepSeek / Qwen / Ollama / OpenAI
$env:OPENAI_API_KEY="sk-your-key"
$env:OPENAI_BASE_URL="https://api.deepseek.com"
$env:AGENT_MODEL="deepseek-chat"
agent-browser run "Summarize top 3 technical news on Hacker News"

# 3. Visible debugging (headful) mode
agent-browser run "Search for mechanical keyboards and compare prices" --no-headless
```

#### CLI Options Reference

| Option | Shorthand | Default | Description |
| :--- | :--- | :--- | :--- |
| `run <instruction>` | - | Required | Natural language task instruction for the agent |
| `--url <url>` | - | Optional | Initial URL to navigate to before execution |
| `--max-steps <num>` | - | `15` | Maximum steps budget to prevent runaway loops |
| `--model <name>` | - | `gpt-4o-mini` | Model name (or env `AGENT_MODEL`) |
| `--api-key <key>` | - | Env Var | OpenAI-compatible API key (or env `OPENAI_API_KEY`) |
| `--base-url <url>` | - | `api.openai.com` | OpenAI-compatible API base URL |
| `--no-headless` | `--headful` | `false` | Launch browser in visible window mode |
| `--quiet` | `-q` | `false` | Only print the final output |
| `--help` | `-h` | - | Display CLI help documentation |

---

### 3. Programmatic Usage (Node.js / TypeScript)

```typescript
import { BrowserManager } from '@yfddxwx/ai-headless-browser';

async function run() {
  const browser = new BrowserManager({ headless: true, stealth: true });
  const session = await browser.createSession();

  // 1. Navigate with automatic SSRF check & semantic compression
  const perception = await session.navigate('https://news.ycombinator.com');
  console.log(`Page Title: ${perception.title}`);
  console.log(`Tokens: ~${perception.tokensEstimated}`);

  // 2. Perform actions via deterministic @Ref handles
  const result = await session.click('@1');
  console.log('State mutation:', result.diffSummary);

  await session.close();
  await browser.close();
}

run();
```

---

### 4. Schema-Driven Structured Extraction (Stagehand-grade)

```typescript
// Extract strongly typed records without regex or LLM hallucinations
const productSchema = {
  type: 'array',
  items: {
    title: 'string',
    price: 'number',
    inStock: 'boolean',
  },
};

const result = await session.extractData(productSchema);
console.log(`Extracted ${result.itemCount} items from source: ${result.source}`);
console.log(result.data);
// Output: [ { title: "Wireless Noise Cancelling Headphones", price: 299, inStock: true }, ... ]

// Extract Schema.org JSON-LD and OpenGraph metadata
const metadata = await session.extractMetadata();
console.log(metadata.title, metadata.author, metadata.jsonLd);
```

---

### 5. Human-in-the-Loop (HITL) Challenge Circuit Breaker

```typescript
// Protect agent from runaway token loops when encountering Turnstile / 2FA / CAPTCHA
const session = await browser.createSession({
  hitl: {
    enabled: true,
    autoBreakOnCaptcha: true,
    defaultTimeoutMs: 120000,
    onChallengeDetected: (event) => {
      console.warn(`[HITL Alert] Challenge tripped: ${event.type} (${event.challengeId})`);
    },
    // Optional automated solver hook (e.g. 2Captcha, CapSolver, or custom solver)
    solverHook: async (event) => {
      console.log('Resolving challenge automatically via hook...');
      return { challengeId: event.challengeId, solved: true };
    },
  },
});

// If tripped, manual resolution can be supplied by a human operator:
session.resolveChallenge('hitl-12345', {
  solved: true,
  notes: 'Human operator bypassed 2FA challenge',
});
```

---

### 6. Remote Cloud CDP & Cluster Pool (`BrowserPool`)

```typescript
import { BrowserPool } from '@yfddxwx/ai-headless-browser';

// Deploy high-concurrency agent swarms connecting to remote cloud browsers (Browserbase/Steel/Docker)
const pool = new BrowserPool({
  mode: 'remote_cdp',
  remoteCdp: {
    endpointUrl: 'wss://connect.browserbase.com?apiKey=your-key',
  },
  maxConcurrentSessions: 10,
  cleanSessionOnRelease: true, // Auto-cleans cookies and storage between leases
});

// Lease an isolated session for a subagent
const lease = await pool.acquire();
const perception = await lease.session.navigate('https://example.com');
console.log(pool.getStats()); // { activeSessions: 1, idleSessions: 0, status: 'healthy' }

// Release back to pool (credentials sanitized, wakes queued subagents)
await lease.release();
await pool.drain();
```

---

## 🔌 Model Context Protocol (MCP) Integration

AgentBrowser provides an out-of-the-box standard MCP Server for **Claude Desktop**, **Cursor**, **Gemini**, and custom agent frameworks.

### Running MCP Server

```bash
npx agent-browser-mcp
```

### Claude Desktop Configuration (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "agent-browser": {
      "command": "npx",
      "args": ["-y", "@yfddxwx/ai-headless-browser"]
    }
  }
}
```

### Exposed MCP Tools (17 Tools)

- `browser_navigate`: Safe navigation (SSRF blocked) returning compact markdown & `@Ref` list.
- `browser_act`: Execute actions (`click`, `fill`, `scroll`) using element references (`@1`, `@2`).
- `browser_get_snapshot`: Retrieve current live perception snapshot and element registry.
- `browser_get_visual_snapshot`: Set-of-Mark visual coordinate overlay and screenshot for multimodal vision models.
- `browser_click_coordinate`: Physical viewport pixel coordinate click.
- `browser_list_tabs` / `browser_create_tab` / `browser_switch_tab` / `browser_close_tab`: Deterministic multi-tab management.
- `browser_export_vault` / `browser_import_vault`: SessionVault authentication and cookie state persistence.
- `browser_detect_captcha`: Active detection of Cloudflare Turnstile, reCAPTCHA, and bot challenges.
- `browser_scroll_overlap`: Continuous scrolling with 20% viewport overlap buffer.
- `browser_get_network_stats` / `browser_configure_network_shield`: NetworkShield tracker/ad blocking controls.
- `browser_extract_structured_data`: Schema-driven structured data extraction with prompt injection containment.
- `browser_extract_metadata`: Schema.org JSON-LD, OpenGraph, and Twitter card metadata extraction.
- `browser_get_active_challenges`: List any active HITL challenges blocking the agent.
- `browser_resolve_challenge`: Resolve an active challenge with operator verification or bypass token.
- `browser_configure_hitl`: Configure HITL circuit breaker behavior and timeout parameters.
- `browser_get_pool_stats`: View active, idle, queue size, and health status of the connection pool.
- `browser_recycle_session`: Force recycle degraded sessions to prevent memory leaks.

---

## 🚦 The Gatekeeper (Quality Loop)

To ensure zero regressions, every feature must pass all 5 gates before merge:

```bash
npm run gatekeeper
```

```
======================================================================
🚀 AI 原生无头浏览器团队闭环质量门禁 (Team Quality Gatekeeper)
======================================================================
▶ [🏛️ 架构师] TypeScript 静态类型检查 ................ ✅ PASS
▶ [🧠 AI 协议] DOM 压缩与 @Ref 注册表单元测试 (Unit) ... ✅ PASS
▶ [⚙️ 核心引擎] 真实浏览器会话功能测试 (Functional) ...... ✅ PASS
▶ [🧪 质检门禁] 端到端综合链路集成测试 (Integration) ... ✅ PASS
▶ [🛡️ 安全沙箱] SSRF 拦截与防提示词注入测试 (Security) .. ✅ PASS
======================================================================
🟢 全部检查 100% 通过！(39 test suites, 72 test cases passed)
```

---

## 📂 Repository Structure

```
.
├── .github/
│   ├── workflows/ci.yml           # Multi-platform CI pipeline (Ubuntu & Windows)
│   ├── ISSUE_TEMPLATE/            # Structured Bug & Feature request templates
│   ├── PULL_REQUEST_TEMPLATE.md   # Gatekeeper PR verification checklist
│   └── dependabot.yml             # Automated dependency security patches
├── bin/
│   ├── agent-browser.js           # Autonomous natural language CLI entrypoint
│   ├── agent-browser.cmd          # Windows native cmd wrapper (prevents association intercept)
│   ├── agent-browser-mcp.js       # Global CLI binary for MCP execution
│   └── agent-browser-mcp.cmd      # Windows native cmd wrapper for MCP server
├── docs/specs/                    # Architect Feature RFC specifications (Feature 01 - 09)
├── src/
│   ├── core/                      # BrowserManager, SessionContext, BrowserPool, Stealth
│   ├── perception/                # DOMCompressor, ElementRegistry, SOMOverlay, StructuredExtractor
│   ├── action/                    # ActionExecutor, StateDiff engine
│   ├── security/                  # SSRFGuard, PromptGuard, CDPSecurityGuard, ExtractionSanitizer
│   ├── hitl/                      # HITLCircuitBreaker Human-in-the-Loop controller
│   ├── agent/                     # AgentRunner (ReAct loop), LLMClient (OpenAI/DeepSeek/Ollama)
│   ├── cli/                       # CLI argument parsing and terminal formatting
│   ├── mcp/                       # Model Context Protocol Server & Tools
│   └── index.ts                   # Unified library entrypoint
├── tests/
│   ├── unit/                      # Algorithmic & parser unit tests
│   ├── functional/                # Live Chromium action tests
│   ├── integration/               # End-to-end user-agent flow tests
│   └── security/                  # Red-team SSRF & Injection exploit tests
├── scripts/
│   └── gatekeeper.ts              # Team convergence loop test runner
├── CHANGELOG.md                   # Keep a Changelog standard history
├── CONTRIBUTING.md                # Development & role workflow guide
├── CODE_OF_CONDUCT.md             # Contributor Covenant 2.1
├── LICENSE                        # MIT License (yifangdong)
└── SECURITY.md                    # Vulnerability reporting protocol
```

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

Copyright (c) 2026 **yifangdong** (`fangdongyi674@gmail.com`).
