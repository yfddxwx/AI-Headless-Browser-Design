# Feature 05: 性能加速引擎与现代 Web 语义增强规范 (Network Shield, Occlusion Filter & Viewport Overlap)

## 1. 架构目标 (Objective)
在对比分析行业主流前沿技术（如 Browser-Use 的 Paint Order Occlusion 过滤、Stagehand 的自然语言自愈动作、Crawl4AI 的请求剪裁、Anthropic Computer Use 的多尺度视口规范）后，识别出当前两大核心改进空间：
1. **网络资源冗余与响应延迟**：真实网页充斥着海量第三方分析脚本（Google Analytics、Facebook Pixel、DoubleClick、Sentry）与高带宽图片/视频。这不仅消耗 60%~80% 的无用网络带宽，还会大幅延长页面 `domcontentloaded` 与等待时间，导致大模型工具调用缓慢。
2. **现代 CSS 遮挡与视口断层**：
   - **遮挡问题 (Occlusion)**：悬浮弹窗（Cookie Banner、促销 Modal、Sticky Header）经常遮挡底下的按钮。纯尺寸计算无法得知元素是否被覆盖，导致大模型点击漂移。
   - **视口翻页断层 (Scroll Gaps)**：定长滚动（如固定 500px）极易在长网页跨屏处将某一行文字截断，大模型无法完整阅读。

**Feature 05 打造新一代加速与遮挡感知体系**：
- **NetworkShield (网络流量盾与加速引擎)**：通过 Playwright 路由拦截核心，自动切断广告跟踪、分析探测与可选的多媒体加载，使页面渲染延迟下降 50%~70%。
- **Occlusion Detection (物理遮挡检测器)**：利用 `document.elementFromPoint()` 实时校验元素物理中心是否被上层 Modal 或 Floating Banner 覆盖，标记 `isOccluded: true`。
- **Viewport Overlap Scroll (带 20% 重叠率的视口连续滚动)**：依据当前页面视口高度，动态计算留有 20% 视觉/语义重叠的平滑滚动步长，保障长文本连续感知。

---

## 2. 团队角色与分工契约 (Team Contracts)

### [🏛️ 架构师] 接口契约
```typescript
export interface NetworkShieldConfig {
  enabled?: boolean;
  blockAnalytics?: boolean;   // 拦截 Google Analytics, Facebook Pixel 等
  blockMedia?: boolean;       // 拦截图片、视频、音频以换取极致响应速度
  blockFonts?: boolean;       // 拦截自定义网络字体
  customBlockedPatterns?: string[];
}

export interface NetworkStats {
  totalRequests: number;
  blockedRequests: number;
  blockedResources: string[];
}
```

### [⚙️ 核心引擎工程师] 职责
- 实现 `NetworkShield`：集成入 `SessionContext`，拦截无用网络流量。
- 增强 `ActionExecutor`：实现 `scrollOverlap(direction, overlapRatio)`。

### [🧠 AI 协议工程师] 职责
- 在 `SOMOverlayEngine` 与 `ElementRegistry` 中增加遮挡检测 (`elementFromPoint`)。
- 在 `AgentBrowserMCPServer` 中暴露 `browser_scroll_overlap` 与 `browser_get_network_stats` 工具。

### [🛡️ 安全工程师] 职责
- 确保 NetworkShield 与 SSRFGuard 协同工作，避免拦截规则被利用产生漏判。

### [🧪 质检门禁工程师] 验收标准
- **单元测试**：NetworkShield URL 模式匹配准确率 100%。
- **功能测试**：在遮挡弹窗场景下，底层元素被准确识别为 `isOccluded: true`。
- **集成测试**：带重叠率滚动无缝移动视口并输出前后变动。
- **安全检查**：NetworkShield 开启时，非法私网 IP 请求仍被坚决阻断。
- **门禁验证**：`npm run gatekeeper` 全绿。
