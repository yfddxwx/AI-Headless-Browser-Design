import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { BrowserManager } from '../../src/core/browser-manager.js';
import { SessionContext } from '../../src/core/session-context.js';

describe('Integration Test: Browser Session End-to-End (端到端综合集成测试)', () => {
  let browserManager: BrowserManager;
  let session: SessionContext;

  beforeAll(async () => {
    browserManager = new BrowserManager({ headless: true });
    session = await browserManager.createSession();
  });

  afterAll(async () => {
    await session.close();
    await browserManager.close();
  });

  it('完成感知压缩、交互反射、动作闭环与状态差分全流程', async () => {
    const appHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>AI 工作台仪表板</title></head>
        <body>
          <main>
            <h1>智能体任务面板</h1>
            <p>当前任务状态：等待输入</p>
            <input id="task-name" placeholder="请输入任务代号" />
            <button id="start-btn" onclick="document.querySelector('p').innerText = '当前任务状态：已启动执行'">开始任务</button>
          </main>
        </body>
      </html>
    `;

    // 1. Ingest content & generate AI snapshot
    const snapshot = await session.setContent(appHtml);
    expect(snapshot.title).toBe('AI 工作台仪表板');
    expect(snapshot.compressedMarkdown).toContain('智能体任务面板');
    expect(snapshot.tokensEstimated).toBeGreaterThan(0);
    expect(snapshot.interactiveElements.length).toBe(2);

    // 2. Perform Fill action
    const inputRef = snapshot.interactiveElements[0].ref;
    const fillRes = await session.fill(inputRef, 'TASK_ALPHA_001');
    expect(fillRes.success).toBe(true);

    // 3. Perform Click action and check StateDiff
    const btnRef = snapshot.interactiveElements[1].ref;
    const clickRes = await session.click(btnRef);
    expect(clickRes.success).toBe(true);

    // 4. Verify post-action page perception reflects update
    const updatedSnapshot = await session.getPerception();
    expect(updatedSnapshot.compressedMarkdown).toContain('当前任务状态：已启动执行');
  });

  it('集成测试在真实会话中拦截非法 SSRF 跳转', async () => {
    await expect(session.navigate('http://127.0.0.1:9090/status')).rejects.toThrow(
      /SSRF Security Violation/
    );
  });
});
