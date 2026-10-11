import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as http from 'http';
import { AgentRunner } from '../../src/agent/agent-runner.js';
import { MockLLMClient } from '../../src/agent/llm-client.js';

describe('Functional Test: Agent CLI Flow (自主智能体闭环功能测试)', () => {
  let server: http.Server;
  let serverUrl: string;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <!DOCTYPE html>
        <html>
          <head><title>自主任务测试页面</title></head>
          <body>
            <h1>智能体自动化任务中心</h1>
            <div id="status">等待输入</div>
            <input id="user-input" type="text" placeholder="输入姓名" />
            <button id="submit-btn" onclick="
              const val = document.getElementById('user-input').value;
              document.getElementById('status').innerText = '欢迎用户 ' + val + ' 登入成功';
            ">确认登入</button>
          </body>
        </html>
      `);
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as any;
        serverUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('智能体能够根据自然语言指令自主完成 填入 -> 点击 -> 观察 -> 输出最终结论', async () => {
    const mockLLM = new MockLLMClient([
      // Step 1: Decision to fill user name into input
      {
        thought: '我看到了输入框，需要先填入用户姓名 Alice',
        toolCalls: [
          {
            name: 'fill',
            arguments: { ref: '@1', text: 'Alice' },
          },
        ],
      },
      // Step 2: Decision to click submit button
      {
        thought: '姓名已填入，接下来点击确认登入按钮',
        toolCalls: [
          {
            name: 'click',
            arguments: { ref: '@2' },
          },
        ],
      },
      // Step 3: Decision to read status and finish
      {
        thought: '页面状态已更新为欢迎用户 Alice 登入成功，达成任务目标',
        toolCalls: [
          {
            name: 'finish',
            arguments: { answer: '用户 Alice 已成功登入系统' },
          },
        ],
      },
    ]);

    const result = await AgentRunner.run({
      instruction: '请在页面上输入姓名 Alice 并点击确认登入，汇报登入结果',
      startUrl: serverUrl,
      blockPrivateIPs: false, // allow local test server
      maxSteps: 5,
      verbose: false,
      customLLM: mockLLM,
    });

    expect(result.success).toBe(true);
    expect(result.totalSteps).toBe(3);
    expect(result.finalAnswer).toBe('用户 Alice 已成功登入系统');
    expect(result.steps[0].action.type).toBe('fill');
    expect(result.steps[1].action.type).toBe('click');
    expect(result.steps[2].action.type).toBe('finish');
  });
});
