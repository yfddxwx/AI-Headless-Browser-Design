<p align="center">
  <h1 align="center">🌐 AgentBrowser (NoHead-AI)</h1>
  <p align="center">
    <strong>An AI-Native Headless Browser tailored for LLMs & Autonomous Agents.</strong>
    <br />
    <em>Semantic DOM Compression • Deterministic <code>@Ref</code> Actions • SSRF & Prompt Guardrails • Native MCP Protocol</em>
  </p>
</p>

<p align="center">
  <a href="https://github.com/yifangdong/agent-browser/actions"><img src="https://img.shields.io/badge/CI-Passing-brightgreen?style=flat-square&logo=github-actions" alt="CI" /></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" alt="License: MIT" /></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node-%3E%3D20.0.0-green.svg?style=flat-square&logo=node.js" alt="Node" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Strict-blue?style=flat-square&logo=typescript" alt="TypeScript" /></a>
  <a href="https://modelcontextprotocol.io/"><img src="https://img.shields.io/badge/MCP-Compatible-purple?style=flat-square" alt="MCP Compatible" /></a>
  <a href="https://github.com/yifangdong/agent-browser/pulls"><img src="https://img.shields.io/badge/PRs-welcome-orange.svg?style=flat-square" alt="PRs Welcome" /></a>
</p>

---

## 💡 Why AgentBrowser? (传统无头浏览器为什么不适合 AI 大模型？)

Traditional headless browsers (Playwright, Puppeteer, Selenium) are engineered for **human QA engineers** and **web scrapers**. When connected to LLMs, they introduce severe bottlenecks:

1. **Token Bloat**: Raw HTML spans 30,000 to 100,000+ tokens filled with CSS, scripts, and invisible divs.
2. **Fragile Selectors**: LLMs hallucinate complex CSS/XPath selectors that break easily.
3. **Blackbox Feedback**: Browsers return timeouts or boolean results without showing *what actually changed*.
4. **Security Blindspots**: Hidden prompt injections (`display:none` adversarial text) and SSRF risks to local network services.

**AgentBrowser fixes this by design**:

| Dimension | Traditional Headless Browser | AgentBrowser (NoHead-AI) |
| :--- | :--- | :--- |
| **Perception** | Raw HTML (30k - 100k+ Tokens) | **Semantic Compressed Markdown** (~85%-95% Token reduction) |
| **Locators** | Brittle CSS / XPath | **Deterministic <code>@1</code>, <code>@2</code> Ref Registry** |
| **State Mutation** | None (Void or Boolean) | **StateDiff**: Automatic diff of URL, Title, and interactive elements |
| **Security** | Standard Sandbox only | **SSRF Private CIDR Blocker + Indirect Prompt Injection (IPI) Guard** |
| **Protocol** | Custom Glue Code | **Native Model Context Protocol (MCP)** Server out-of-the-box |

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
npm install @yifangdong/agent-browser
# Install browser binaries
npx playwright install chromium
```

### 2. Programmatic Usage (Node.js / TypeScript)

```typescript
import { BrowserManager } from '@yifangdong/agent-browser';

async function run() {
  const browser = new BrowserManager({ headless: true, stealth: true });
  const session = await browser.createSession();

  // 1. Navigate with automatic SSRF check & semantic compression
  const perception = await session.navigate('https://news.ycombinator.com');
  console.log(`Page Title: ${perception.title}`);
  console.log(`Tokens: ~${perception.tokensEstimated} (Saved ${perception.compressionRatio}%)`);

  // 2. Perform actions via deterministic @Ref handles
  const result = await session.click('@1');
  console.log('State mutation:', result.diffSummary);

  await session.close();
  await browser.close();
}

run();
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
      "args": ["-y", "@yifangdong/agent-browser"]
    }
  }
}
```

### Exposed MCP Tools

- `browser_navigate`: Safe navigation (SSRF blocked) returning compact markdown & `@Ref` list.
- `browser_act`: Execute actions (`click`, `fill`, `scroll`) using element references (`@1`, `@2`).
- `browser_get_snapshot`: Retrieve current live perception snapshot and element registry.

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
🟢 全部检查 100% 通过！
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
│   └── agent-browser-mcp.js       # Global CLI binary for MCP execution
├── docs/specs/                    # Architect Feature RFC specifications
├── src/
│   ├── core/                      # BrowserManager, SessionContext, Stealth scripts
│   ├── perception/                # DOMCompressor, ElementRegistry, PageSnapshot
│   ├── action/                    # ActionExecutor, StateDiff engine
│   ├── security/                  # SSRFGuard, PromptGuard (IPI sanitizer)
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

This project is licensed under the **MIT License** - see the [LICENSE](file:///d:/Gemini%20pro/no%20head/LICENSE) file for details.

Copyright (c) 2026 **yifangdong**.
