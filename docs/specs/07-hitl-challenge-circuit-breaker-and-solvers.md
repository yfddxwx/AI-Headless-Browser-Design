# Feature 07: 人机协同挑战熔断器与求解器钩子规范 (HITL Circuit Breaker & Solvers)

## 1. 架构目标 (Objective)
在自主智能体长时间运行过程中，遭遇风控反爬屏障（如 Cloudflare Turnstile、Google reCAPTCHA、极验滑块、短信/邮件双因子认证 2FA）是不可避免的。
传统无头浏览器面临以下痛点：
1. **死循环与预算耗尽**：Agent 在验证码页面反复点击无效元素，迅速耗尽 Token 预算并最终崩溃超时。
2. **缺乏人机协同机制 (Human-in-the-Loop, HITL)**：无法安全暂停当前任务通知人工介入，也无法将验证码接驳至自动化打码解密服务（如 2Captcha、CapSolver）。
3. **安全伪造风险**：缺乏挑战有效性鉴权，容易被恶意页面构造虚假完成信号诱导继续执行。

**Feature 07** 打造 **企业级 HITL 挑战熔断器与安全求解器体系**：
- **三态挑战熔断器 (Circuit Breaker State Machine)**：
  - `closed`（正常流转）：智能体正常自主操作。
  - `open`（熔断暂停）：侦测到验证码或 2FA，立即阻断后续动作，锁定当前会话，等待解题。
  - `half_open`（探测恢复）：解题完成后重新探测页面是否放行，成功后恢复自主执行，失败则重新熔断。
- **全方位风控感知 (Captcha & 2FA Detector)**：覆盖 Cloudflare Turnstile、reCAPTCHA、hCaptcha、Geetest 滑块及短信/邮件 OTP 2FA 输入框。
- **可插拔求解器钩子 (Pluggable Solver Hooks)**：支持绑定第三方自动打码平台或触发外部 Webhook 通知管理员。
- **密码级防伪与防 DoS 约束**：生成高熵加密挑战 ID，校验解决令牌（Resolution Token），具备严格超时机制防止恶意挂起。

---

## 2. 团队角色与分工契约 (Team Contracts)

### [🏛️ 架构师] 接口与数据契约
```typescript
export type ChallengeType =
  | 'cloudflare_turnstile'
  | 'recaptcha'
  | 'hcaptcha'
  | 'geetest'
  | 'slide_captcha'
  | 'sms_2fa'
  | 'generic_bot_block';

export type ChallengeStatus =
  | 'detected'
  | 'pending_human'
  | 'pending_automated'
  | 'resolved'
  | 'failed'
  | 'timeout';

export type CircuitBreakerState = 'closed' | 'open' | 'half_open';

export interface ChallengeEvent {
  challengeId: string;
  type: ChallengeType;
  url: string;
  detectedAt: number;
  expiresAt: number;
  screenshotBase64?: string;
  message: string;
  status: ChallengeStatus;
  metadata?: Record<string, any>;
}

export interface ChallengeResolution {
  challengeId: string;
  solved: boolean;
  resolutionToken?: string;
  notes?: string;
  resolvedBy?: 'human' | 'automated_hook' | 'system';
}

export type ChallengeSolverHook = (
  event: ChallengeEvent
) => Promise<ChallengeResolution | boolean | void>;

export interface HITLConfig {
  enabled?: boolean;
  autoBreakOnCaptcha?: boolean;
  defaultTimeoutMs?: number; // 默认 120,000ms (2 分钟)
  solverHook?: ChallengeSolverHook;
  onChallengeDetected?: (event: ChallengeEvent) => void;
  onChallengeResolved?: (resolution: ChallengeResolution) => void;
}
```

### [⚙️ 核心引擎工程师] 职责
- 实现 `HITLCircuitBreaker`：管理熔断状态机，拦截被挂起的动作请求。
- 升级 `CaptchaDetector`：增强对 2FA/OTP、Geetest 和滑块的感知精度。
- 将熔断机制无缝编织进 `SessionContext.navigate()` 与 `ActionExecutor`。

### [🧠 AI 协议工程师] 职责
- 在触发风控时，返回结构化的挂起状态感知，告知 Agent 当前被验证码阻断及挑战元数据。
- 在 `AgentBrowserMCPServer` 中暴露三个工具：
  - `browser_get_active_challenges`：查询当前未解除的风控挑战。
  - `browser_resolve_challenge`：人工或外挂程序提交解题结果。
  - `browser_configure_hitl`：动态调整熔断器参数与超时阈值。

### [🛡️ 安全工程师] 职责
- 挑战防伪与重放防护：确保 `challengeId` 不可预测，且每个挑战只能被解题消费一次。
- 严格超时熔断保护：防止恶意网站故意触发无限挂起造成资源耗尽攻击。

### [🧪 质检门禁工程师] 验收标准
- **单元测试 (Unit)**：
  - 熔断器状态迁移（closed -> open -> half_open -> closed）逻辑验证 100%。
- **功能测试 (Functional)**：
  - 模拟 Cloudflare 与短信验证码拦截，熔断器自动转为 open 状态并生成快照事件。
- **集成测试 (Integration)**：
  - 通过求解器钩子或 MCP 提交解题 token，会话顺利恢复并成功执行后续动作。
- **安全检查 (Security)**：
  - 伪造 `challengeId` 或超时过期的解题请求被坚决拒绝。
- **门禁验证**：`npm run gatekeeper` 100% PASS。
