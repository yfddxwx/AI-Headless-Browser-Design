# Feature 04: 会话状态保险箱与认证持久化规范 (Storage/Cookie Vault & Captcha Guard)

## 1. 架构目标 (Objective)
在许多企业级场景与自主 Agent 任务中，智能体需要在多个会话、周期性执行或重启后保持登录认证（如 SSO、GitHub、Twitter、ERP 系统的 Session）。
若每次启动浏览器都需要 Agent 重新进行账号密码登录，将面临：
1. **多重验证阻断**：两步验证（2FA）、短信验证码导致自动化中断。
2. **风控拦截**：频繁异地/频繁重新登录极易触发 Cloudflare、DataDome、reCAPTCHA 等人机验证风控。
3. **状态遗失**：页面局部存储（LocalStorage、SessionStorage）无法跨运行恢复。

**Feature 04** 旨在打造 **SessionVault（会话状态保险箱）与验证码侦测系统**：
- **全要素认证状态存取**：一键导出与导入 Cookies、LocalStorage、SessionStorage 及关联域。
- **状态快照加密与隔离**：支持导出结构化 Vault 凭证文件，杜绝非授权明文泄露。
- **验证码风控即时感知 (Captcha & Bot Detection Hook)**：实时识别 Cloudflare Turnstile、reCAPTCHA、hCaptcha 拦截页面，向 Agent 汇报挑战状态。
- **安全沙箱导入校验 (Vault Security Defense)**：严格校验导入的 Cookie 域合法性，防御通过篡改 Vault 注入恶意跨站凭证或 XSS Payload。

---

## 2. 团队角色与分工契约 (Team Contracts)

### [🏛️ 架构师] 接口契约
```typescript
export interface BrowserCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

export interface OriginStorage {
  origin: string;
  localStorage: Record<string, string>;
  sessionStorage?: Record<string, string>;
}

export interface SessionVaultData {
  version: string;
  createdAt: number;
  cookies: BrowserCookie[];
  origins: OriginStorage[];
  userAgent?: string;
}

export interface CaptchaDetectionResult {
  detected: boolean;
  type?: 'cloudflare_turnstile' | 'recaptcha' | 'hcaptcha' | 'generic_challenge';
  message?: string;
}
```

### [⚙️ 核心引擎工程师] 职责
- 实现 `SessionVault`：通过 Playwright `context.cookies()` 与 `context.addCookies()` 实现高保真 Cookie 提取与载入。
- 实现 `OriginStorage` 注入器：跨域注入 LocalStorage / SessionStorage。
- 实现 `CaptchaDetector`：扫描当前 DOM 中的验证码特征（`cf-turnstile`, `g-recaptcha`, `h-captcha`, 挑战页关键词）。

### [🧠 AI 协议工程师] 职责
- 在 `SessionContext` 中暴露 `saveVault()`, `loadVault()`, `detectCaptcha()` 统一方法。
- 在 `AgentBrowserMCPServer` 中暴露 `browser_export_vault`, `browser_import_vault`, `browser_detect_captcha` 工具。

### [🛡️ 安全工程师] 职责
- 实现 `VaultSecuritySanitizer`：禁止导入非 HTTP(S) 域的 Cookie，过滤危险伪造域与 LocalStorage XSS 脚本注入。
- 确保导出给 LLM 的调试信息自动脱敏关键 Token（如仅展示 Cookie 名称与域，隐匿具体密码或私钥）。

### [🧪 质检门禁工程师] 验收标准
- **单元测试**：Cookie 与 LocalStorage 导入导出序列化无损还原。
- **功能测试**：验证注入 Cookie 与 LocalStorage 后，在真实页面中免登录生效。
- **集成测试**：验证跨会话（关闭 Context 后重新启动）通过 Vault 成功恢复会话。
- **安全检查**：恶意篡改域名与非法协议 Cookie 导入被防御层拦截。
- **门禁验证**：`npm run gatekeeper` 5 维全绿。
