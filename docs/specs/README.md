# 📐 AgentBrowser (NoHead-AI) 架构设计规范矩阵 (Architecture Specifications)

本项目采用**虚拟自主工程团队模式（Autonomous Virtual Engineering Team）**进行研发。每个功能模块（Feature）均由严格的架构 RFC 规范文档指导，包含架构师数据契约、核心引擎职责、AI 协议设计、安全沙箱防线及质检门禁 5 维闭环标准。

---

## 📑 核心功能规范索引 (Specs Index)

| 规范编号 | 模块名称 | 核心职责与关键能力 | 关键组件与接口 | 状态 |
| :--- | :--- | :--- | :--- | :---: |
| [**Feature 01**](./01-core-engine-and-perception.md) | **核心引擎与感知体系** | AI 原生轻量运行时、DOM 压缩（减少 85%~95% Token）、确定性 `@1` `@2` Ref 元素分配、SSRF 内网拦截、隐藏注入清洗 | `BrowserManager`, `DOMCompressor`, `ElementRegistry`, `SSRFGuard` | 🟢 已交付 |
| [**Feature 02**](./02-multimodal-visual-perception.md) | **多模态视觉感知与 SOM** | 视口可见性裁切、物理像素边界计算、Set-of-Mark (SOM) 无损视觉角标打标渲染、物理坐标点击 | `SOMOverlayEngine`, `VisualSnapshot`, `clickCoordinate` | 🟢 已交付 |
| [**Feature 03**](./03-tab-manager-and-history-tree.md) | **多标签页管理与历史树** | 确定性 `tabId` 标识、`window.open` / 弹窗自动捕获与树状关联 (`openerTabId`)、跨 Tab 上下文切换与生命周期管理 | `TabManager`, `TabInfo`, `switchTab`, `closeTab` | 🟢 已交付 |
| [**Feature 04**](./04-storage-vault-and-auth-persistence.md) | **会话保险箱与认证持久化** | Cookies、LocalStorage、SessionStorage 全量导出与导入、会话加密隔离、验证码风控即时感知、跨站非法 Cookie 防护 | `SessionVault`, `CaptchaDetector`, `VaultSecuritySanitizer` | 🟢 已交付 |
| [**Feature 05**](./05-performance-acceleration-and-modern-web-enhancement.md) | **性能加速与现代 Web 增强** | NetworkShield 网络盾（拦截分析追踪与媒体，提速 70%）、物理遮挡检测 (`elementFromPoint`)、20% 重叠率连续视口滚动 | `NetworkShield`, `scrollOverlap`, `isOccluded` | 🟢 已交付 |
| [**Feature 06**](./06-structured-extractor-and-jsonld-parser.md) | **结构化抽取与元数据解析** | Schema.org JSON-LD / SEO 元数据优先匹配、表格与同构卡片自动对齐抽取、反间接提示词注入 (IPI) 清洗、聚焦切片省流 90%+ | `StructuredExtractor`, `MetadataExtractor`, `ExtractionSanitizer` | 🟢 已交付 |
| [**Feature 07**](./07-hitl-challenge-circuit-breaker-and-solvers.md) | **人机协同挑战熔断器** | 三态熔断器 (`closed`/`open`/`half_open`)、Cloudflare / 2FA / 滑块感知、可插拔打码平台与人工介入钩子、密码级防伪防 DoS | `HITLCircuitBreaker`, `ChallengeSolverHook`, 2FA Detector | 🟢 已交付 |
| [**Feature 08**](./08-remote-cdp-and-cluster-browser-pool.md) | **远程 CDP 与集群连接池** | 支持通过 WebSocket 连接云端无头集群（Browserbase、Steel、Docker）、弹性连接池调度（排队、闲置剔除、释放深度卫生擦除）、CDP SSRF 防线 | `BrowserPool`, `connectOverCDP`, `CDPSecurityGuard` | 🟢 已交付 |
| [**Feature 09**](./09-autonomous-natural-language-cli-and-react-runner.md) | **自主自然语言 CLI 与 ReAct** | `Thought -> Action -> Observation` 自主循环、步数预算熔断 (`maxSteps`)、OpenAI 兼容客户端（DeepSeek/Qwen/Ollama/OpenAI）、一句话自然语言 CLI | `AgentRunner`, `OpenAICompatibleLLMClient`, `bin/agent-browser` | 🟢 已交付 |

---

## 🚦 质量门禁标准 (The Gatekeeper)

所有规范对应的功能代码必须 100% 通过以下多维门禁检查方可合入主干：
1. **静态契约门禁**：TypeScript Strict 模式全量通过，无 `any` 泛滥与类型泄露。
2. **算法单元门禁 (Unit)**：解析器、状态机、正则模式等核心逻辑单测覆盖率 100%。
3. **真实浏览器功能门禁 (Functional)**：Chromium 真实无头环境操作行为测试通过。
4. **端到端链路集成门禁 (Integration)**：MCP 工具链与 ReAct 自主循环端到端全链路闭环验证。
5. **红蓝攻防安全门禁 (Security)**：针对 SSRF、间接提示词注入 (IPI)、原型链污染、超时挂起与跨租户凭证泄漏专项防御验证。
