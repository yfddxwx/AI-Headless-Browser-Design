<p align="center">
  <h1 align="center">🌐 AgentBrowser (NoHead-AI)</h1>
  <p align="center">
    <strong>专为大语言模型与自主智能体打造的 AI 原生无头浏览器</strong>
    <br />
    <em>语义 DOM 智能压缩 • 确定性 <code>@Ref</code> 动作注册表 • SSRF 与提示词注入沙箱防线 • 原生 MCP 协议支持</em>
  </p>
</p>

<p align="center">
  <a href="README.md">English</a> • <a href="README.zh-CN.md"><strong>简体中文</strong></a>
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

## 💡 为什么选择 AgentBrowser？

传统无头浏览器（Playwright、Puppeteer、Selenium）最初是为**人类测试工程师**和**传统网页爬虫**设计的。当直接接入 LLM 时，会引发严重的瓶颈：

1. **Token 爆炸与资源浪费**：原始 HTML 充斥着 CSS 样式、JavaScript 脚本、内联 SVG 与不可视节点，单页动辄消耗 30,000 ~ 100,000+ Tokens。
2. **脆弱的选择器与模型幻觉**：大模型往往编造出复杂、极易因网页微小更新而失效的深层 CSS/XPath 选择器。
3. **黑盒状态反馈**：传统浏览器执行动作后仅返回布尔值或超时报错，大模型无法感知“点击后页面到底发生了什么变化”。
4. **安全盲区与注入漏洞**：网页中可能隐藏恶意文本（如 `display:none` 的对抗性系统提示词注入），或引诱 Agent 请求私有内网服务（SSRF 攻击）。

**AgentBrowser 从底层专为 AI 智能体而设计**：

| 评估维度 | 传统无头浏览器 (Playwright/Puppeteer) | AgentBrowser (NoHead-AI) |
| :--- | :--- | :--- |
| **感知体系** | 原始庞大 HTML（30k ~ 100k+ Tokens） | **语义压缩 Markdown**（减少 **85% ~ 95%** Token） |
| **交互定位** | 脆弱易崩的 CSS / XPath 选择器 | **确定性全局 <code>@1</code>、<code>@2</code> Ref 引用注册表** |
| **状态感知** | 黑盒（仅返回 Void 或布尔值） | **StateDiff 差异引擎**：自动对比操作前后的 URL、标题与增删元素 |
| **视觉接地** | 仅截取裸图，容易引发像素点击漂移 | **Set-of-Mark (SOM) 坐标覆盖层**：无损高对比度角标直接对齐物理像素 |
| **安全沙箱** | 仅标准浏览器沙盒 | **SSRF 私网 IP 防御 + 间接提示词注入 (IPI) 清洗 + 原型污染阻断** |
| **协议生态** | 需用户自写复杂的胶水代码 | **开箱即用原生 Model Context Protocol (MCP)** + 一句话自然语言 CLI |

---

## 🌟 核心功能矩阵 (Feature Matrix)

| 规范 | 模块名称 | 核心能力描述 | 规范文档 |
| :--- | :--- | :--- | :---: |
| **Feature 01** | **核心引擎与感知压缩** | AI 原生轻量运行时、DOM 语义清洗、确定性 `@1` `@2` 句柄、SSRF 私网拦截 | [查看规范](./docs/specs/01-core-engine-and-perception.md) |
| **Feature 02** | **多模态视觉感知 (SOM)** | 视口可见性裁切、物理像素边界计算、Set-of-Mark 视觉标签渲染、物理坐标点击 | [查看规范](./docs/specs/02-multimodal-visual-perception.md) |
| **Feature 03** | **多标签页与历史追踪树** | 确定性 `tabId` 标识、`window.open` 弹窗自动捕获与树状从属 (`openerTabId`)、跨 Tab 上下文感知切换 | [查看规范](./docs/specs/03-tab-manager-and-history-tree.md) |
| **Feature 04** | **会话保险箱与认证持久化** | Cookies/Storage 全量导出与导入、状态加密隔离、Cloudflare/reCAPTCHA 风控即时感知 | [查看规范](./docs/specs/04-storage-vault-and-auth-persistence.md) |
| **Feature 05** | **性能网络盾与视口滚动** | NetworkShield 路由阻断广告/分析脚本（提速 70%）、物理遮挡检测、20% 语义重叠平滑滚动 | [查看规范](./docs/specs/05-performance-acceleration-and-modern-web-enhancement.md) |
| **Feature 06** | **结构化抽取与元数据解析** | Schema.org JSON-LD 优先匹配、HTML 表格与同构卡片自适应抽取、反注入清洗、聚焦上下文切片 | [查看规范](./docs/specs/06-structured-extractor-and-jsonld-parser.md) |
| **Feature 07** | **人机协同 (HITL) 挑战熔断** | 三态熔断器 (`closed`/`open`/`half_open`)、短信 2FA/验证码识别、可插拔打码平台与人工介入钩子 | [查看规范](./docs/specs/07-hitl-challenge-circuit-breaker-and-solvers.md) |
| **Feature 08** | **远程云端 CDP 与集群连接池** | 支持连接云端无头集群（Browserbase/Steel/Docker）、弹性连接池调度、释放深度卫生擦除、CDP SSRF 防线 | [查看规范](./docs/specs/08-remote-cdp-and-cluster-browser-pool.md) |
| **Feature 09** | **自主自然语言 CLI 与 ReAct** | `Thought -> Action -> Observation` 自主闭环、步数预算熔断 (`maxSteps`)、OpenAI/DeepSeek/Qwen 统一适配 | [查看规范](./docs/specs/09-autonomous-natural-language-cli-and-react-runner.md) |

---

## 👥 虚拟自主工程团队架构

本项目采用**虚拟自主工程团队模式（Autonomous Virtual Engineering Team）**研发，每一处功能变更均由对应职责角色签署，并通过 5 维闭环门禁验证后方可合入：

```
                ┌──────────────────────────────┐
                │   🏛️ 系统架构师 (Architect)   │
                │   TypeScript 静态类型与数据契约 │
                └──────────────┬───────────────┘
                               │
          ┌─────────────────────┴─────────────────────┐
          ▼                                           ▼
┌──────────────────────────────┐   ┌──────────────────────────────┐
│  ⚙️ 核心引擎工程师 (Engine)   │   │  🧠 AI 协议工程师 (Protocol) │
│  Playwright/CDP/池化/生命周期  │   │  DOM 压缩/@Ref 算法/MCP/ReAct │
└──────────────┬───────────────┘   └──────────────┬───────────────┘
               │                                  │
               └─────────────────────┬────────────┘
                                     ▼
                       ┌──────────────────────────────┐
                       │  🛡️ 安全工程师 (Security)     │
                       │  SSRF 防御 / 提示词反注入沙箱  │
                       └──────────────┬───────────────┘
                                      │
                                      ▼
                       ┌──────────────────────────────┐
                       │  🧪 质检门禁工程师 (QA Gate)  │
                       │  单测/功能/端到端集成 100% 审计│
                       └──────────────┬───────────────┘
                                      │ PASS
                                      ▼
                             [ Feature 正式验收合入 ]
```

---

## ⚡ 快速上手

### 1. 安装与初始化

```bash
# 安装 npm 依赖包
npm install @yfddxwx/ai-headless-browser

# 下载安装 Chromium 浏览器内核
npx playwright install chromium
```

---

### 2. 一句话自然语言 CLI (`agent-browser run`)

无需编写任何胶水代码，直接在终端中通过一句自然语言指令启动全自主 Web 智能体：

```bash
# 全局注册命令（本地开发环境）
npm link

# 1. 执行自主任务（智能体自主规划、点击、翻页并总结）
agent-browser run "找出 GitHub Trending 榜单上最热门的项目并总结" --url "https://github.com/trending"

# 2. 配合 DeepSeek / 通义千问 / Ollama 等主流大模型
$env:OPENAI_API_KEY="sk-你的密钥"
$env:OPENAI_BASE_URL="https://api.deepseek.com"
$env:AGENT_MODEL="deepseek-chat"
agent-browser run "调研 Hacker News 今日排名前三的技术新闻"

# 3. 开启可视浏览器窗口（亲眼观察智能体操作）
agent-browser run "在电商网站搜索机械键盘并对比价格" --no-headless
```

#### CLI 常用参数速查表

| 参数名 | 简写 | 默认值 | 作用描述 |
| :--- | :--- | :--- | :--- |
| `run <instruction>` | - | 必填 | 需要自主智能体完成的自然语言任务指令 |
| `--url <url>` | - | 可选 | 任务起始网页 URL |
| `--max-steps <num>` | - | `15` | 最大动作步数预算（触发后自动熔断，防范死循环） |
| `--model <name>` | - | `gpt-4o-mini` | 使用的模型标识（或通过环境变量 `AGENT_MODEL` 设置） |
| `--api-key <key>` | - | 环境变量 | 大模型 API Key（或环境变量 `OPENAI_API_KEY`） |
| `--base-url <url>` | - | `api.openai.com` | OpenAI 兼容接口 Base URL |
| `--no-headless` | `--headful` | `false` | 弹出可视化 Chromium 浏览器界面方便实时观察与调试 |
| `--quiet` | `-q` | `false` | 静默模式，仅输出最终完成结果 |
| `--help` | `-h` | - | 显示 CLI 帮助指南 |

---

### 3. 代码级嵌入调用 (Node.js / TypeScript)

```typescript
import { BrowserManager } from '@yfddxwx/ai-headless-browser';

async function main() {
  const browser = new BrowserManager({ headless: true, stealth: true });
  const session = await browser.createSession();

  // 1. 访问网页：自动执行 SSRF 校验与 DOM 压缩
  const perception = await session.navigate('https://news.ycombinator.com');
  console.log(`页面标题: ${perception.title}`);
  console.log(`Token 消耗预估: ~${perception.tokensEstimated}`);

  // 2. 使用确定性 @Ref 进行动作点击
  const result = await session.click('@1');
  console.log('页面状态变动摘要:', result.diffSummary);

  await session.close();
  await browser.close();
}

main();
```

---

### 4. Schema 驱动结构化抽取 (Stagehand 级)

```typescript
// 按照 TypeScript/JSON Schema 抽取严谨结构化数据，杜绝正则和模型幻觉
const productSchema = {
  type: 'array',
  items: {
    title: 'string',
    price: 'number',
    inStock: 'boolean',
  },
};

const result = await session.extractData(productSchema);
console.log(`从来源 ${result.source} 提取到 ${result.itemCount} 条数据`);
console.log(result.data);
// 输出示例: [ { title: "无线降噪耳机", price: 899, inStock: true }, ... ]

// 一键提取 Schema.org JSON-LD 与 OpenGraph 元数据
const metadata = await session.extractMetadata();
console.log(metadata.title, metadata.author, metadata.jsonLd);
```

---

### 5. 人机协同挑战熔断器 (HITL Circuit Breaker)

```typescript
// 在遭遇 Cloudflare、reCAPTCHA 或短信 2FA 时自动暂停任务，防范 Token 烧毁
const session = await browser.createSession({
  hitl: {
    enabled: true,
    autoBreakOnCaptcha: true,
    defaultTimeoutMs: 120000,
    onChallengeDetected: (event) => {
      console.warn(`[HITL 告警] 触发风控拦截: ${event.type} (ID: ${event.challengeId})`);
    },
    // 可选：自动化对接打码平台 (2Captcha / CapSolver)
    solverHook: async (event) => {
      console.log('调用外部打码钩子处理验证码...');
      return { challengeId: event.challengeId, solved: true };
    },
  },
});

// 人工操作完成后，亦可随时提交放行指令：
session.resolveChallenge('hitl-12345', {
  solved: true,
  notes: '操作员已手动完成短信二次验证',
});
```

---

### 6. 远程云端 CDP 与高并发浏览器池 (`BrowserPool`)

```typescript
import { BrowserPool } from '@yfddxwx/ai-headless-browser';

// 支持高并发多 Agent 集群无缝连接云端 Chromium (Browserbase / Steel / 自建 Docker)
const pool = new BrowserPool({
  mode: 'remote_cdp',
  remoteCdp: {
    endpointUrl: 'wss://connect.browserbase.com?apiKey=your-key',
  },
  maxConcurrentSessions: 10,
  cleanSessionOnRelease: true, // 归还租约时自动深度清理 Cookie 与存储，防跨会话污染
});

// 为子智能体租借隔离会话
const lease = await pool.acquire();
const perception = await lease.session.navigate('https://example.com');
console.log(pool.getStats()); // { activeSessions: 1, idleSessions: 0, status: 'healthy' }

// 归还至连接池（自动重置凭据并唤醒排队任务）
await lease.release();
await pool.drain();
```

---

## 🔌 Model Context Protocol (MCP) 集成

AgentBrowser 原生提供符合标准规范的 MCP Server，支持与 **Claude Desktop**、**Cursor**、**Gemini** 及各大 AI Agent 框架无缝协同。

### 启动 MCP 服务

```bash
npx agent-browser-mcp
```

### Claude Desktop 配置示例 (`claude_desktop_config.json`)

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

### 暴露的标准 MCP 工具清单 (17 项)

- `browser_navigate`: 安全访问网页（带 SSRF 拦截），输出压缩 Markdown 与 `@Ref` 列表。
- `browser_act`: 基于 `@1`、`@2` 句柄执行操作（`click`、`fill`、`scroll`）。
- `browser_get_snapshot`: 获取当前页面最新感知快照与元素状态。
- `browser_get_visual_snapshot`: Set-of-Mark 视觉标签无损渲染与高分辨率截图。
- `browser_click_coordinate`: 基于视口物理像素坐标的高精度点击。
- `browser_list_tabs` / `browser_create_tab` / `browser_switch_tab` / `browser_close_tab`: 多标签页与弹窗树管理。
- `browser_export_vault` / `browser_import_vault`: SessionVault 登录态与 Cookie 持久化导入导出。
- `browser_detect_captcha`: 主动检测 Cloudflare Turnstile、reCAPTCHA 及各类验证码。
- `browser_scroll_overlap`: 带 20% 语义重叠缓冲的连续平滑滚动。
- `browser_get_network_stats` / `browser_configure_network_shield`: NetworkShield 广告/追踪/媒体拦截控制。
- `browser_extract_structured_data`: Schema 驱动结构化数据提取与反提示词注入。
- `browser_extract_metadata`: 提取 Schema.org JSON-LD、OpenGraph 与 Twitter Cards 元数据。
- `browser_get_active_challenges`: 查询当前阻断智能体的 HITL 风控挑战。
- `browser_resolve_challenge`: 提交验证码解题结果恢复任务。
- `browser_configure_hitl`: 配置熔断器行为模式与超时阈值。
- `browser_get_pool_stats`: 查看连接池健康状态、并发数与排队水位。
- `browser_recycle_session`: 强制回收退化会话，杜绝内存泄漏。

---

## 🚦 闭环质量门禁 (The Gatekeeper)

为保证主干代码的工业级稳定性与绝对零回归，任何改动合并前都必须通过多维门禁的全量校验：

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
🟢 全部检查 100% 通过！(39 个测试套件，72 项用例全部合格)
```

---

## 📂 项目工程结构

```
.
├── .github/
│   ├── workflows/ci.yml           # 跨平台 CI 自动化流水线 (Ubuntu & Windows)
│   ├── ISSUE_TEMPLATE/            # 规范化 Bug 与 Feature 反馈模板
│   ├── PULL_REQUEST_TEMPLATE.md   # 门禁合入清单
│   └── dependabot.yml             # 依赖自动安全升级
├── bin/
│   ├── agent-browser.js           # 独立自然语言 CLI 核心执行程序
│   ├── agent-browser.cmd          # Windows 原生批处理兼容垫片 (防关联劫持)
│   ├── agent-browser-mcp.js       # 全局 MCP 服务执行程序
│   └── agent-browser-mcp.cmd      # Windows 原生 MCP 批处理垫片
├── docs/specs/                    # 架构设计 RFC 规范文档矩阵 (Feature 01 ~ 09)
├── src/
│   ├── core/                      # BrowserManager, SessionContext, BrowserPool, Stealth
│   ├── perception/                # DOMCompressor, ElementRegistry, SOMOverlay, StructuredExtractor
│   ├── action/                    # ActionExecutor, StateDiff 状态比对引擎
│   ├── security/                  # SSRFGuard, PromptGuard, CDPSecurityGuard, ExtractionSanitizer
│   ├── hitl/                      # HITLCircuitBreaker 人机协同熔断控制器
│   ├── agent/                     # AgentRunner (ReAct 循环), LLMClient (OpenAI/DeepSeek/Ollama)
│   ├── cli/                       # 命令行参数解析与交互输出
│   ├── mcp/                       # Model Context Protocol 原生服务端与工具定义
│   └── index.ts                   # 统一导出入口
├── tests/
│   ├── unit/                      # 算法与解析器单元测试
│   ├── functional/                # 真实 Chromium 交互功能测试
│   ├── integration/               # 端到端自主 Agent 与 MCP 集成测试
│   └── security/                  # SSRF、提示词反注入与红蓝攻防安全审计
├── scripts/
│   └── gatekeeper.ts              # 虚拟团队闭环质量门禁运行脚本
├── CHANGELOG.md                   # 遵循 Keep a Changelog 规范的版本变迁记录
├── CONTRIBUTING.md                # 角色分工与贡献指南
├── CODE_OF_CONDUCT.md             # 贡献者行为准则 (Contributor Covenant 2.1)
├── LICENSE                        # MIT 开源协议 (yifangdong)
└── SECURITY.md                    # 漏洞报告与披露规范
```

---

## 📄 开源许可证 (License)

本项目采用 **MIT License** 开源许可 - 详情请参阅 [LICENSE](LICENSE) 文件。

Copyright (c) 2026 **yifangdong** (`fangdongyi674@gmail.com`).
