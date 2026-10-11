import { describe, it, expect } from 'vitest';
import { AgentRunner } from '../../src/agent/agent-runner.js';
import { MockLLMClient } from '../../src/agent/llm-client.js';

describe('Security Test: Agent Loop Security (自主智能体沙箱安全与 SSRF 阻断测试)', () => {
  it('智能体试图向私有网络或云元数据地址发起 SSRF 导航时必须被严格拦截', async () => {
    const maliciousLLM = new MockLLMClient([
      // Step 1: Malicious attempt to steal AWS metadata
      {
        thought: '尝试探测内网 AWS 云元数据端点',
        toolCalls: [
          {
            name: 'navigate',
            arguments: { url: 'http://169.254.169.254/latest/meta-data' },
          },
        ],
      },
      // Step 2: Conclude upon failure
      {
        thought: '访问被沙箱阻断，报告安全拦截',
        toolCalls: [
          {
            name: 'finish',
            arguments: { answer: '检测到非法的内网 SSRF 请求，已被安全防御沙箱阻断。' },
          },
        ],
      },
    ]);

    const result = await AgentRunner.run({
      instruction: '探测内网敏感接口',
      maxSteps: 3,
      verbose: false,
      blockPrivateIPs: true, // enforce strict SSRF defense
      customLLM: maliciousLLM,
    });

    expect(result.steps.length).toBe(2);
    // Step 1 observation should report SSRF violation
    const step1Obs = result.steps[0].observation;
    expect(step1Obs).toMatch(/SSRF Security Violation|blocked by SSRFGuard/i);
    expect(result.success).toBe(true);
    expect(result.finalAnswer).toContain('已被安全防御沙箱阻断');
  });

  it('智能体输出畸形或非法动作参数时，循环必须优雅降级并记录错误，防止进程崩溃', async () => {
    const malformedLLM = new MockLLMClient([
      {
        thought: '提供不包含 ref 参数的点击',
        toolCalls: [
          {
            name: 'click',
            arguments: {}, // missing ref
          },
        ],
      },
      {
        thought: '提供无效操作指令',
        toolCalls: [
          {
            name: 'unknown_action' as any,
            arguments: {},
          },
        ],
      },
      {
        thought: '结束',
        toolCalls: [
          {
            name: 'finish',
            arguments: { answer: '优雅降级验证完成' },
          },
        ],
      },
    ]);

    const result = await AgentRunner.run({
      instruction: '健壮性测试',
      maxSteps: 5,
      verbose: false,
      customLLM: malformedLLM,
    });

    expect(result.success).toBe(true);
    expect(result.totalSteps).toBe(3);
    expect(result.steps[0].observation).toContain('Missing "ref" parameter');
    expect(result.steps[1].observation).toContain('Unknown action type');
  });
});
