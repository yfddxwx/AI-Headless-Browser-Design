import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { BrowserManager } from '../../src/core/browser-manager.js';
import { SessionContext } from '../../src/core/session-context.js';

describe('Integration Test: Popup Auto Capture (弹窗自动捕获与树状从属链路)', () => {
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

  it('当页面触发 window.open 时，TabManager 能自动捕获新弹窗并绑定 openerTabId', async () => {
    const parentHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>主工作区</title></head>
        <body>
          <h1>主控制台</h1>
          <button id="open-popup-btn" onclick="window.open('about:blank', '_blank')">打开子弹窗</button>
        </body>
      </html>
    `;

    const perception = await session.setContent(parentHtml);
    const btnRef = perception.interactiveElements.find(e => e.text.includes('打开子弹窗'))?.ref;
    expect(btnRef).toBeDefined();

    // Click the button to trigger popup window.open
    await session.click(btnRef!);

    // Allow time for Playwright context to receive 'page' event
    await new Promise(r => setTimeout(r, 600));

    // List tabs: should now have at least 2 tabs
    const allTabs = await session.listTabs();
    expect(allTabs.length).toBeGreaterThanOrEqual(2);

    const popupTab = allTabs.find(t => t.openerTabId === 'tab-1');
    expect(popupTab).toBeDefined();

    // Switch to the popup tab
    const switchRes = await session.switchTab(popupTab!.tabId);
    expect(switchRes.currentTabId).toBe(popupTab!.tabId);

    // Clean up popup
    await session.closeTab(popupTab!.tabId);
    expect((await session.listTabs()).length).toBe(1);
  });
});
