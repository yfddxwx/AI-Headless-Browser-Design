import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { BrowserManager } from '../../src/core/browser-manager.js';
import { SessionContext } from '../../src/core/session-context.js';

describe('Functional Test: Action Execution (真实浏览器会话动作执行功能测试)', () => {
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

  it('能精准对指定 @Ref 元素执行 fill 与 click 并捕获状态变更', async () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <body>
          <h1 id="headline">待操作页面</h1>
          <input id="test-input" type="text" placeholder="输入名称" />
          <button id="test-btn" onclick="document.getElementById('headline').innerText = '已成功点击按钮！'">确认提交</button>
        </body>
      </html>
    `;

    const perception = await session.setContent(html);

    const inputEl = perception.interactiveElements.find(e => e.tag === 'input');
    const buttonEl = perception.interactiveElements.find(e => e.tag === 'button');

    expect(inputEl).toBeDefined();
    expect(buttonEl).toBeDefined();

    // 1. Fill input via ref
    const fillResult = await session.fill(inputEl!.ref, 'AI Agent 指令测试');
    expect(fillResult.success).toBe(true);

    // 2. Click button via ref
    const clickResult = await session.click(buttonEl!.ref);
    expect(clickResult.success).toBe(true);

    // 3. Verify headline was modified by JavaScript click handler
    const rawPage = session.getRawPage();
    const updatedTitle = await rawPage.locator('#headline').innerText();
    expect(updatedTitle).toBe('已成功点击按钮！');
  });
});
