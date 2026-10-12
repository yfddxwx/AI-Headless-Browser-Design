import { describe, it, expect } from 'vitest';
import { parseCliArgs } from '../../src/cli/index.js';
import { MockLLMClient } from '../../src/agent/llm-client.js';
import { AgentRunner } from '../../src/agent/agent-runner.js';

describe('Unit Test: AgentRunner & CLI (自主智能体与 CLI 单元测试)', () => {
  it('应当正确解析 CLI 命令行参数', () => {
    const args = [
      'run',
      '查询最新的热门技术',
      '--url',
      'https://example.com',
      '--max-steps',
      '5',
      '--model',
      'deepseek-chat',
      '--quiet',
    ];

    const parsed = parseCliArgs(args);
    expect(parsed.command).toBe('run');
    expect(parsed.instruction).toBe('查询最新的热门技术');
    expect(parsed.options.startUrl).toBe('https://example.com');
    expect(parsed.options.maxSteps).toBe(5);
    expect(parsed.options.model).toBe('deepseek-chat');
    expect(parsed.options.verbose).toBe(false);
  });

  it('MockLLMClient 应当按计划顺序输出响应', async () => {
    const mock = new MockLLMClient([
      {
        thought: '需要先点击按钮',
        toolCalls: [{ name: 'click', arguments: { ref: '@1' } }],
      },
      {
        thought: '任务已经完成',
        toolCalls: [{ name: 'finish', arguments: { answer: '完成结果' } }],
      },
    ]);

    const res1 = await mock.chat([], []);
    expect(res1.thought).toBe('需要先点击按钮');
    expect(res1.toolCalls?.[0].name).toBe('click');

    const res2 = await mock.chat([], []);
    expect(res2.thought).toBe('任务已经完成');
    expect(res2.toolCalls?.[0].name).toBe('finish');
    expect(res2.toolCalls?.[0].arguments.answer).toBe('完成结果');
  });

  it('智能体循环应当严格受到 maxSteps 预算限制', async () => {
    // A mock client that always scrolls and never finishes
    const loopClient = new MockLLMClient();
    // Enqueue 10 scroll actions
    for (let i = 0; i < 10; i++) {
      loopClient.enqueue({
        thought: `继续浏览第 ${i + 1} 页`,
        toolCalls: [{ name: 'scroll', arguments: { direction: 'down' } }],
      });
    }

    const result = await AgentRunner.run({
      instruction: '不断执行动作直到达到预算上限',
      maxSteps: 3,
      verbose: false,
      customLLM: loopClient,
    });

    expect(result.success).toBe(false);
    expect(result.totalSteps).toBe(3);
    expect(result.finalAnswer.toLowerCase()).toContain('maximum step limit');
  });

  it('应当正确读取与写入持久化配置并脱敏 API Key', async () => {
    const { writePersistentConfig, readPersistentConfig, maskApiKey } = await import('../../src/cli/config.js');
    
    expect(maskApiKey('sk-1234567890abcdef')).toBe('sk-1...cdef');
    expect(maskApiKey('')).toBe('(not set)');
    expect(maskApiKey('123')).toBe('********');

    writePersistentConfig({ model: 'unit-test-model' });
    const cfg = readPersistentConfig();
    expect(cfg.model).toBe('unit-test-model');
  });
});

