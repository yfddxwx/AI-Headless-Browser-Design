# Feature 02: 多模态视觉感知与 Set-of-Mark (SOM) 坐标标注系统规范

## 1. 架构目标 (Objective)
随着 GPT-4o、Claude 3.5 Sonnet 及 Gemini 等前沿模型具备强大的多模态视觉理解能力，纯 DOM 文本感知已无法完全覆盖复杂现代网页（如 Canvas 绘图、复杂拖拽组件、自定义富文本编辑器、SVG 图表等）。
直接向多模态模型发送原始截图常导致像素点击漂移（Click Drift）。**Feature 02** 旨在实现业界领先的 **Set-of-Mark (SoM) 视觉接地（Visual Grounding）系统**：
1. **视口可见性精确裁切 (Viewport Visibility Filter)**：
   - 过滤所有不可见、被遮挡、折叠在视口外（Folded）或尺寸为 0 的元素。
2. **确定性视口坐标计算 (Precise Client Bounding Box)**：
   - 提取每个交互元素的真实绝对坐标 `{ x, y, width, height }`。
3. **Set-of-Mark (SOM) 视觉标签无损渲染与截图**：
   - 在页面视口中为所有可交互元素动态绘制高对比度标记框与编号气泡（如 `@1`, `@2`）。
   - 截取带标记的高清视觉图像，并在截图完毕后瞬间无损恢复现场 DOM。
4. **安全与资源防线 (Security & Resource Limits)**：
   - 严格阻断视觉注入：隐藏元素、对抗性透明层绝对不打标。
   - 限制图像最大分辨率与尺寸，防止大图引发 VLM Token 爆炸与内存 DoS。

---

## 2. 团队角色与分工契约 (Team Contracts)

### [🏛️ 架构师] 接口契约
```typescript
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VisualElement extends InteractiveElement {
  boundingBox: BoundingBox;
  isInViewport: boolean;
}

export interface VisualSnapshot {
  url: string;
  title: string;
  viewport: { width: number; height: number };
  annotatedScreenshotBase64: string; // Base64 PNG 带 Set-of-Mark 标记图
  rawScreenshotBase64?: string;      // 原始无标记图（可选）
  visibleElements: VisualElement[];  // 视口内打标的元素列表
  totalAnnotatedCount: number;
}
```

### [⚙️ 核心引擎工程师] 职责
- 在 Chromium 页面内注入高效坐标抓取脚本，获取 `getBoundingClientRect()` 并过滤非视口区域。
- 实现 `clickCoordinate(x, y)`：支持基于物理像素的精确点击。

### [🧠 AI 协议工程师] 职责
- 实现 `SOMOverlayEngine`：DOM 级非破坏性高亮层注入、色彩调色板分配、标记角标渲染与即时清理。
- 实现 `getVisualSnapshot()` 方法并集成进 `SessionContext`。
- 在 `AgentBrowserMCPServer` 中暴露 `browser_get_visual_snapshot` 工具。

### [🛡️ 安全工程师] 职责
- 确保对抗性隐藏元素（如 `display:none`、`left: -9999px`、`opacity: 0`）被完全隔离，不可进入视觉打标序列。
- 限制图像输出 Base64 最大安全体积。

### [🧪 质检门禁工程师] 验收标准
- **单元测试**：视口碰撞检测、坐标边界检查通过。
- **功能测试**：真实页面打标测试，确保标记清理后不残留污染 DOM。
- **集成测试**：多模态视觉快照提取、物理坐标点击闭环。
- **安全检查**：隐形注入节点零标注验证通过。
- **全局门禁**：`npm run gatekeeper` 100% 绿色通过。
