# Feature 08: 远程云端 CDP 连接与高并发浏览器集群连接池规范 (Remote CDP & Browser Pool)

## 1. 架构目标 (Objective)
在生产级企业应用和多智能体协同（Multi-Agent System）场景下，本地单实例 Chromium 会面临：
1. **本地资源开销巨大**：每个浏览器实例消耗 200MB~500MB 内存，并发数十个 Agent 时本地机器将迅速 OOM 崩溃。
2. **集群化与云浏览器接入难**：无法无缝对接现代云端浏览器基础设施（如 Browserbase、Steel.dev、自建 Docker/K8s Chromium 集群）。
3. **多任务状态交叉污染**：多个 Agent 共享浏览器时，缺乏严格的租户隔离与释放回收策略，导致凭证、Cookie 与敏感缓存相互泄露。

**Feature 08** 构建 **生产级远程 CDP 协议接入与高并发弹性会话池**：
- **原生云端 CDP 支持 (Connect Over CDP)**：无缝支持通过 WebSocket 连接远程云端无头 Chromium 集群。
- **高弹性浏览器连接池 (BrowserPool)**：
  - 具备最小预热会话 (`minSessions`) 与最大并发限制 (`maxConcurrentSessions`)。
  - FIFO 排队等待机制 (`acquireTimeoutMs`)、闲置会话超时回收 (`idleTimeoutMs`) 与最长存活周期约束 (`maxSessionLifetimeMs`)。
- **租户安全释放与卫生清理 (Session Sanitation on Release)**：当 Agent 归还租约（`release()`）时，自动重置 Storage/Cookies 并擦除导航历史，杜绝跨会话凭证泄露。
- **CDP 安全防线 (CDPSecurityGuard)**：拦截针对云服务元数据端点（`169.254.169.254`）的恶意 CDP 连接，过滤非安全协议，自动脱敏 Header 中的身份鉴权 Token。

---

## 2. 团队角色与分工契约 (Team Contracts)

### [🏛️ 架构师] 接口与数据契约
```typescript
export interface RemoteCDPConfig {
  endpointUrl: string;
  headers?: Record<string, string>;
  timeout?: number;
  slowMo?: number;
}

export interface BrowserPoolConfig {
  mode?: 'local' | 'remote_cdp';
  remoteCdp?: RemoteCDPConfig;
  minSessions?: number;
  maxConcurrentSessions?: number;
  acquireTimeoutMs?: number;
  idleTimeoutMs?: number;
  maxSessionLifetimeMs?: number;
  browserConfig?: BrowserConfig;
  cleanSessionOnRelease?: boolean;
}

export interface PoolStats {
  mode: 'local' | 'remote_cdp';
  totalSessionsCreated: number;
  activeSessions: number;
  idleSessions: number;
  queuedRequests: number;
  recycledSessions: number;
  status: 'healthy' | 'degraded' | 'exhausted';
}

export interface PooledSession {
  id: string;
  session: SessionContext;
  createdAt: number;
  lastUsedAt: number;
  release: () => Promise<void>;
}
```

### [⚙️ 核心引擎工程师] 职责
- 改造 `BrowserManager`：支持 `connectOverCDP` 远程模式。
- 实现 `BrowserPool`：调度会话获取、排队等待、闲置剔除与定期自愈。
- 实现 `cleanSessionOnRelease`：执行 Storage、Cookies 与历史栈深度擦除。

### [🧠 AI 协议工程师] 职责
- 将连接池管理集成进全局运行时，确保多 Agent 租约获取与释放的生命周期无死锁。
- 在 `AgentBrowserMCPServer` 中暴露管理工具：
  - `browser_get_pool_stats`：监控连接池健康状态与队列水位。
  - `browser_recycle_session`：对退化或异常会话执行强制回收。

### [🛡️ 安全工程师] 职责
- 实现 `CDPSecurityGuard`：
  - 严格校验 `endpointUrl`，封堵针对内部集群端口与云元数据（`169.254.169.254`）的 SSRF 探测。
  - 确保连接头中的 `apiKey` / `Authorization` 敏感凭据在日志与错误堆栈中安全脱敏。

### [🧪 质检门禁工程师] 验收标准
- **单元测试 (Unit)**：
  - 连接池排队调度与并发限制算法正确率 100%。
- **功能测试 (Functional)**：
  - 验证会话在 `acquire()` 与 `release()` 循环中正确流转，闲置会话被平滑回收。
- **集成测试 (Integration)**：
  - 模拟高并发多 Agent 任务抢占会话池，队列无饥饿、释放后跨租户数据 100% 隔离。
- **安全检查 (Security)**：
  - 恶意传入内网 IP 或云元数据作为 CDP 端点时被 `CDPSecurityGuard` 坚决拦截。
- **门禁验证**：`npm run gatekeeper` 100% PASS。
