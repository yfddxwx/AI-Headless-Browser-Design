## 描述 (Description)
简要概述此 PR 的变更目标及解决的 Issue。

Fixes #(issue_number)

## 变更类型 (Type of Change)
- [ ] 🐛 Bug 修复 (Non-breaking bug fix)
- [ ] ✨ 新特性 (New feature)
- [ ] 🛡️ 安全加固 (Security enhancement)
- [ ] ⚡ 性能优化 (Performance improvement)
- [ ] 📝 文档更新 (Documentation change)
- [ ] 🧪 测试用例补充 (Adding missing tests)

## 责任工程分类 (Engineering Role Classification)
- [ ] 🏛️ 系统架构师 (Architect) - 契约与规范变更
- [ ] ⚙️ 核心引擎工程师 (Core Engine) - CDP / 会话 / 反爬
- [ ] 🧠 AI 协议工程师 (Protocol Dev) - DOM 压缩 / 元素注册 / MCP
- [ ] 🛡️ 安全与沙箱工程师 (Security Engineer) - SSRF / 提示词注入
- [ ] 🧪 质检门禁工程师 (QA Gatekeeper) - 测试与流水线

## 团队门禁验证清单 (Team Gatekeeper Checklist)
- [ ] 运行 `npx tsc --noEmit` 静态类型检查通过
- [ ] 运行 `npm run test:unit` 单元测试通过
- [ ] 运行 `npm run test:func` 真实浏览器功能测试通过
- [ ] 运行 `npm run test:integ` 综合集成测试通过
- [ ] 运行 `npm run test:sec` 安全攻防测试通过
- [ ] 本地执行 `npm run gatekeeper` 全部绿灯通过 (All PASS)
