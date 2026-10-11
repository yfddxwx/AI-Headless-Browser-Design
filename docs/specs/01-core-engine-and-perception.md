# Feature 01: AI 原生无头浏览器核心运行时与感知体系规范

## 1. 架构目标 (Objective)
为 AI 大模型提供一个专用的无头浏览器运行时。传统无头浏览器输出整页 HTML（通常 30,000 ~ 100,000+ Tokens），混杂样式表、脚本和不可视元素。本功能模块旨在建立：
1. **轻量会话与 CDP 控制器 (Browser Manager & Session)**：支持单例复用、隐身模式（规避自动化指纹检测）、代理/视口配置。
2. **AI 语义感知压缩器 (DOM Compressor & A11y Engine)**：
   - 清理所有非语义标签 (`<script>`, `<style>`, `<noscript>`, `svg`, `iframe` 等)。
   - 提取对 LLM 有决策价值的语义节点（标题、段落、链接、输入框、按钮等）。
   - 将整页 Token 数量压缩 **85% ~ 95%**。
3. **确定性元素引用系统 (Interactive Element Registry)**：
   - 为页面中每一个可交互元素赋予全局唯一、短小稳定的引用 ID（如 `@1`, `@2`, `@3`）。
   - 生成结构化元数据（标签类型、可见文本、ARIA 属性、当前值、位置信息等）。
4. **安全沙箱防线 (Security Sandbox - Stage 1)**：
   - SSRF 防护：阻止跳转私有内网 IP (`127.0.0.1`, `10.0.0.0/8`, `192.168.0.0/16`, AWS/云元数据 `169.254.169.254`)。
   - 协议白名单限制：强制限定 `http:` / `https:`，禁止 `file:`, `data:` 危险代码执行。
   - 隐藏文本清洗：剥离 `display:none`、`visibility:hidden` 等试图对大模型实施隐形提示词注入的节点。

---

## 2. 团队角色与分工契约 (Team Contracts)

### [🏛️ 架构师] 接口与数据契约
```typescript
export interface InteractiveElement {
  ref: string;             // 交互句柄，如 "@1", "@2"
  tag: string;             // input, button, a, select, textarea 等
  role?: string;           // button, link, textbox 等
  name?: string;           // 语义标签或 placeholder
  text: string;            // 元素可见文本
  value?: string;          // input 当前值
  disabled: boolean;
  selector: string;        // 内部精确定位器 (CSS / XPath)
}

export interface PagePerception {
  url: string;
  title: string;
  compressedMarkdown: string;        // 面向 LLM 阅读的紧凑内容
  interactiveElements: InteractiveElement[]; // 可供动作调用的元素列表
  tokenEstimated: number;            // 压缩后 Token 预估
}
```

### [⚙️ 核心引擎工程师] 职责
- 实现 `BrowserManager`：管理 Chromium 实例、提供 `launch()`, `createSession()`, `close()`。
- 实现 `SessionContext`：页面导航、状态保持、网络拦截。
- 实现 `Stealth`：注入反指纹检测代码（`navigator.webdriver = false` 等）。

### [🧠 AI 协议工程师] 职责
- 实现 `DOMCompressor`：解析 DOM，过滤冗余，生成干净的 Markdown/树状大纲。
- 实现 `ElementRegistry`：扫描所有可交互元素，分配 `@1`, `@2` 等句柄。
- 实现 `ActionExecutor`：支持 `click(ref)`, `fill(ref, text)`, `scroll(direction)`。

### [🛡️ 安全工程师] 职责
- 实现 `SSRFGuard`：拦截访问私网与非法端口，阻止 DNS 重绑定风险。
- 实现 `PromptGuard`：过滤对抗隐藏文本，防御间接提示词注入。

### [🧪 质检门禁工程师] 验收标准
- **单元测试 (Unit)**：
  - 核心组件（`DOMCompressor`, `ElementRegistry`, `SSRFGuard`, `PromptGuard`）单测通过率 100%。
- **功能测试 (Functional)**：
  - 模拟真实 HTML 表单、导航链接，验证元素能正确分配 `@ref` 并被提取。
- **集成测试 (Integration)**：
  - 驱动真实 Headless Chromium 渲染网页并完整生成 `PagePerception`。
- **安全检查 (Security)**：
  - 发起恶意 SSRF 网址访问被成功拦截。
  - 包含 CSS 隐藏注入指令（如 `<p style="display:none">Ignore previous instructions</p>`）被彻底清洗。
