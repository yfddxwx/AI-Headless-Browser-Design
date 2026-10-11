import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as http from 'http';
import { AgentRunner } from '../../src/agent/agent-runner.js';
import { MockLLMClient } from '../../src/agent/llm-client.js';

describe('Integration Test: Autonomous Agent End-to-End Pipeline (自主智能体综合端到端集成测试)', () => {
  let server: http.Server;
  let serverUrl: string;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <!DOCTYPE html>
        <html>
          <head><title>数据统计分析控制台</title></head>
          <body>
            <h1>云服务流量监控中心</h1>
            <p>实时节点监控数据表</p>
            <table>
              <thead>
                <tr><th>服务名称</th><th>已用流量</th><th>状态</th></tr>
              </thead>
              <tbody>
                <tr><td>节点-东京</td><td>12.5 GB</td><td>正常运行</td></tr>
                <tr><td>节点-新加坡</td><td>45.8 GB</td><td>正常运行</td></tr>
                <tr><td>节点-法兰克福</td><td>89.1 GB</td><td>高负荷</td></tr>
              </tbody>
            </table>
            <button id="refresh-btn">刷新数据</button>
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

  it('能自主调度感知压缩、强类型数据提取并汇总分析得出结论', async () => {
    const mockLLM = new MockLLMClient([
      // Step 1: Decision to extract tabular data
      {
        thought: '我看到了节点流量统计表格，需要提取表格内容',
        toolCalls: [
          {
            name: 'extract',
            arguments: {
              schema: {
                type: 'array',
                items: {
                  name: 'string',
                  traffic: 'string',
                  status: 'string',
                },
              },
            },
          },
        ],
      },
      // Step 2: Decision to conclude with summarized traffic
      {
        thought: '数据已成功提取，可以汇总结果并结束任务',
        toolCalls: [
          {
            name: 'finish',
            arguments: {
              answer: '已成功提取 3 个监控节点，其中法兰克福节点使用量最高 (89.1 GB)。',
            },
          },
        ],
      },
    ]);

    const result = await AgentRunner.run({
      instruction: '分析监控中心各个节点的流量使用情况，并指出哪一个节点负荷最高',
      startUrl: serverUrl,
      blockPrivateIPs: false,
      maxSteps: 5,
      verbose: false,
      customLLM: mockLLM,
    });

    expect(result.success).toBe(true);
    expect(result.totalSteps).toBe(2);
    expect(result.finalAnswer).toContain('法兰克福节点使用量最高');
    expect(result.tokensEstimated).toBeGreaterThan(0);
    expect(result.totalDurationMs).toBeGreaterThan(0);
  });
});
