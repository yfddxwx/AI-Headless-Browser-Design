import { describe, it, expect } from 'vitest';
import { chromium } from 'playwright';
import { BrowserManager } from '../../src/core/browser-manager.js';

describe('Functional Test: Remote CDP Connection (远端 CDP 无头直连功能测试)', () => {
  it('能够通过 WebSocket CDP 端点连接远端浏览器并执行完整的感知与动作链路', async () => {
    // 1. Launch a dedicated Chromium instance exposing a real CDP remote debugging port
    const port = 9333;
    const cdpServer = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage', `--remote-debugging-port=${port}`],
    });
    const cdpEndpoint = `http://127.0.0.1:${port}`;

    // 2. Initialize BrowserManager pointing to the remote CDP endpoint
    const remoteManager = new BrowserManager({
      cdpUrl: cdpEndpoint,
      blockPrivateIPs: false, // allow local test server
    });

    // 3. Create session over CDP
    const session = await remoteManager.createSession();
    expect(remoteManager.isConnectedOverCDP()).toBe(true);

    // 4. Verify DOM perception & actions through remote CDP
    const perception = await session.setContent(`
      <!DOCTYPE html>
      <html>
        <head><title>云端 CDP 实例</title></head>
        <body>
          <h1 id="header">欢迎进入云端无头容器</h1>
          <button id="cloud-btn" onclick="document.getElementById('header').innerText = '云端动作执行成功！'">触发云端指令</button>
        </body>
      </html>
    `);

    expect(perception.title).toBe('云端 CDP 实例');
    expect(perception.compressedMarkdown).toContain('欢迎进入云端无头容器');

    const btn = perception.interactiveElements.find(e => e.tag === 'button');
    expect(btn).toBeDefined();

    const actionResult = await session.click(btn!.ref);
    expect(actionResult.success).toBe(true);

    const updatedText = await session.getRawPage().locator('#header').innerText();
    expect(updatedText).toBe('云端动作执行成功！');

    // 5. Clean up remote connection
    await session.close();
    await remoteManager.close();
    await cdpServer.close();
  });
});
