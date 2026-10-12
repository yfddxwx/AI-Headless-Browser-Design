# Feature 09: 自主自然语言 CLI 与 ReAct 智能体引擎规范 (Autonomous Agent Runner & CLI)

## 1. 架构目标 (Objective)
在完成核心浏览器、感知压缩、多模态坐标、Tab 管理、Vault 保险箱、网络盾、结构化抽取、HITL 熔断与 CDP 集群池后，系统已具备工业级基础设施。
然而，开发者和终端用户仍面临最后的易用性鸿沟：
1. **代码胶水层繁琐**：此前调用浏览器需要编写 TypeScript 脚本或配置复杂的 MCP 客户端。
2. **缺乏自主闭环 ReAct 引擎**：缺少一个能够自主感知页面、做出决策（Thought）、调用工具动作（Action）、并根据页面反馈（Observation）继续思考的自主闭环引擎。
3. **缺少开箱即用的一句话自然语言 CLI**：用户希望在终端直接输入一句话（如 `agent-browser run "总结 GitHub Trending 最热门的 AI 项目"`），系统即可全自主完成任务并交付结果。

**Feature 09** 构建 **自主智能体决策循环引擎与自然语言命令行工具**：
- **AgentRunner 自主 ReAct 循环**：
  - 严格遵循 `Thought -> Action -> Observation` 循环。
  - 内置步数预算熔断保护 (`maxSteps`) 与执行超时约束，防范智能体在异常页面陷入死循环。
  - 精确记录每一步的操作耗时、URL 迁移与 Token 节约估算。
- **通用 OpenAI 兼容 LLM 客户端 (OpenAICompatibleLLMClient)**：
  - 标准 Tool Calling 协议，兼容 OpenAI (GPT-4o)、DeepSeek (deepseek-chat)、通义千问 (Qwen)、Ollama 本地大模型及 OpenRouter。
  - 提供 `MockLLMClient`，实现离线、零网络抖动的 100% 确定性自动化测试。
- **跨平台原生 CLI 执行套件**：
  - 注册全局可执行文件 `agent-browser` 与 `agent-browser-mcp`。
  - 专为 Windows 定制原生批处理垫片 (`.cmd`)，杜绝被 Electron / VS Code 文件关联劫持。
  - 支持丰富参数：`--url`, `--max-steps`, `--model`, `--api-key`, `--base-url`, `--no-headless`, `--quiet`。

---

## 2. 团队角色与分工契约 (Team Contracts)

### [🏛️ 架构师] 接口与数据契约
```typescript
export type AgentActionType = 'navigate' | 'click' | 'fill' | 'scroll' | 'extract' | 'finish';

export interface AgentAction {
  type: AgentActionType;
  url?: string;
  ref?: string;
  text?: string;
  direction?: 'down' | 'up' | 'top' | 'bottom';
  schema?: any;
  answer?: string;
}

export interface AgentStepRecord {
  stepNumber: number;
  thought: string;
  action: AgentAction;
  observation: string;
  durationMs: number;
  urlAfter: string;
}

export interface AgentRunResult {
  success: boolean;
  instruction: string;
  finalAnswer: string;
  steps: AgentStepRecord[];
  totalSteps: number;
  totalDurationMs: number;
  finalUrl: string;
  tokensEstimated: number;
  error?: string;
}

export interface AgentRunOptions {
  instruction: string;
  startUrl?: string;
  maxSteps?: number;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  headless?: boolean;
  stealth?: boolean;
  verbose?: boolean;
  timeout?: number;
  allowedDomains?: string[];
  blockPrivateIPs?: boolean;
  customLLM?: LLMClientInterface;
  onStep?: (step: AgentStepRecord) => void;
}

export interface LLMResponse {
  thought?: string;
  toolCalls?: LLMToolCall[];
  content?: string;
}

export interface LLMClientInterface {
  chat(messages: ChatMessage[], tools: any[]): Promise<LLMResponse>;
}
```

### [⚙️ 核心引擎工程师] 职责
- 实现 `AgentRunner`：编排浏览器感知（`SessionContext.navigate()` / `PagePerception`）与动作执行（`ActionExecutor`），驱动 ReAct 循环流转。
- 保证会话生命周期在完成或异常时 100% 优雅释放与资源回收。

### [🧠 AI 协议工程师] 职责
- 构建 System Prompt 与标准 Tool Definitions（`navigate`, `click`, `fill`, `scroll`, `extract`, `finish`）。
- 实现 `OpenAICompatibleLLMClient` 与 `MockLLMClient`。
- 实现 `src/cli/index.ts`：解析命令行参数，格式化终端色彩与进度输出。

### [🛡️ 安全工程师] 职责
- 在自主循环中实施严格沙箱约束：强制继承 `SSRFGuard`、`PromptGuard` 与最大步数熔断，防止受注入网页诱导进行恶意内网扫描或死循环消耗。
- 确保 API Key 在日志和输出中绝不回显。

### [🧪 质检门禁工程师] 验收标准
- **单元测试 (Unit)**：
  - CLI 参数解析器与 Agent 决策映射逻辑覆盖率 100%。
- **功能测试 (Functional)**：
  - 配合 `MockLLMClient` 驱动真实无头浏览器完成模拟搜索、点击与提交任务。
- **集成测试 (Integration)**：
  - 验证端到端 CLI 执行与多步 ReAct 决策输出。
- **安全检查 (Security)**：
  - 面对死循环陷阱页面与无限重定向，`maxSteps` 熔断机制生效并安全退出。
- **门禁验证**：`npm run gatekeeper` 100% PASS。
