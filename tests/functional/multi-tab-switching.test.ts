import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { BrowserManager } from '../../src/core/browser-manager.js';
import { SessionContext } from '../../src/core/session-context.js';

describe('Functional Test: Multi-Tab Switching (多标签页创建、切换与关闭)', () => {
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

  it('能创建多个 Tab、在各 Tab 间自如切换并保持独立会话状态', async () => {
    // 1. Set content on primary tab (tab-1)
    await session.setContent('<html><head><title>Tab 1 首页</title></head><body><h1>这是第一个标签页</h1></body></html>');
    const tabsInitial = await session.listTabs();
    expect(tabsInitial).toHaveLength(1);
    expect(tabsInitial[0].tabId).toBe('tab-1');
    expect(tabsInitial[0].isActive).toBe(true);

    // 2. Create tab-2
    const { tabId: tab2Id } = await session.createTab();
    expect(tab2Id).toBe('tab-2');

    // Switch to tab-2 and set content
    await session.switchTab(tab2Id);
    await session.setContent('<html><head><title>Tab 2 详情页</title></head><body><h1>这是第二个标签页</h1></body></html>');

    // Verify tabs list shows 2 tabs
    const tabsAfter = await session.listTabs();
    expect(tabsAfter).toHaveLength(2);
    expect(tabsAfter.find(t => t.tabId === tab2Id)?.isActive).toBe(true);

    // 3. Switch back to tab-1 and verify snapshot title
    const switchBack = await session.switchTab('tab-1');
    expect(switchBack.perception.title).toBe('Tab 1 首页');
    expect(switchBack.perception.compressedMarkdown).toContain('这是第一个标签页');

    // 4. Close tab-2
    const closeRes = await session.closeTab(tab2Id);
    expect(closeRes.closedTabId).toBe(tab2Id);
    expect(closeRes.remainingTabs).toHaveLength(1);
    expect(closeRes.activeTabId).toBe('tab-1');
  });
});
