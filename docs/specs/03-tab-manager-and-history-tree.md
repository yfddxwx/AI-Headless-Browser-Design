# Feature 03: 多标签页管理与导航历史追踪树规范 (Tab Manager & History Tree)

## 1. 架构目标 (Objective)
在复杂的真实 Web 任务中，智能体（LLM Agent）经常遇到：
1. 链接携带 `target="_blank"` 或通过 `window.open()` 打开新页面（例如 OAuth 授权弹窗、支付网关、详情页比对）。
2. 需要跨页面对比多份资料（如在 Tab 1 查看商品列表，在 Tab 2 打开具体参数，再切换回 Tab 1 继续浏览）。
3. 传统单一 Page 模型在弹窗出现时会导致 Agent 丢失焦点、无法感知弹窗产生，或因失去上下文而陷入死循环。

**Feature 03** 旨在构建完整的 **Tab 管理中枢与历史追踪树**：
- **确定性 Tab 标识**：为每个标签页赋予稳定唯一的 `tabId`（如 `tab-1`, `tab-2`）。
- **弹窗事件自动拦截与树状归属**：监听 `context.on('page')`，自动将新弹出页面注册进 Tab 注册表，记录父子从属关系（`openerTabId`）。
- **跨 Tab 上下文感知切换**：支持 `switchTab(tabId)`，切换时自动同步焦点、重新提取感知快照并更新动作执行器绑定的活跃页面。
- **历史栈状态控制**：支持前进、后退及完整的标签页生命周期关闭（`closeTab(tabId)`）。
- **多标签页安全沙箱**：新弹窗导航强制经过 `SSRFGuard` 校验，拦截企图利用 `window.open` 绕过沙箱探测内网的恶意行为。

---

## 2. 团队角色与分工契约 (Team Contracts)

### [🏛️ 架构师] 接口契约
```typescript
export interface TabInfo {
  tabId: string;
  url: string;
  title: string;
  isActive: boolean;
  openerTabId?: string;
  createdAt: number;
}

export interface TabSwitchResult {
  previousTabId: string;
  currentTabId: string;
  perception: PagePerception;
}

export interface TabCloseResult {
  closedTabId: string;
  activeTabId: string;
  remainingTabs: TabInfo[];
}
```

### [⚙️ 核心引擎工程师] 职责
- 实现 `TabManager`：管理 `Map<string, Page>`，处理页面创建、关闭、销毁。
- 绑定 `BrowserContext` 事件，实现弹窗自动捕获与 Stealth 脚本实时挂载。

### [🧠 AI 协议工程师] 职责
- 将多标签页元数据集成进 `SessionContext`，让 LLM 随时感知所有打开的 Tab。
- 在 `AgentBrowserMCPServer` 中暴露 `browser_list_tabs`, `browser_create_tab`, `browser_switch_tab`, `browser_close_tab` 工具。

### [🛡️ 安全工程师] 职责
- 对弹窗触发的任何新 URL 实施强制 SSRF 校验；若目标为危险私网地址，自动阻断并关闭恶意弹窗。

### [🧪 质检门禁工程师] 验收标准
- **单元测试**：Tab 增删改查生命周期与活跃状态流转正确。
- **功能测试**：在真实 Chromium 中模拟 `window.open`，验证新 Tab 自动被捕获并能切换。
- **集成测试**：多 Tab 间数据互不干扰，切换后能精准对各自 Tab 执行 `@Ref` 点击与输入。
- **安全检查**：通过弹窗访问 `http://127.0.0.1` 被实时熔断拦截。
- **门禁验证**：`npm run gatekeeper` 5 维全绿。
