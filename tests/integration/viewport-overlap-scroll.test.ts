import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { BrowserManager } from '../../src/core/browser-manager.js';
import { SessionContext } from '../../src/core/session-context.js';

describe('Integration Test: Viewport Overlap Scroll (视口重叠率智能滚动集成测试)', () => {
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

  it('在超长页面上能够以保留 20% 视觉重叠的步长平滑滚动并提供变动反馈', async () => {
    const tallHtml = `
      <!DOCTYPE html>
      <html>
        <body style="margin: 0; padding: 20px; height: 3000px;">
          <h1 id="top-title">长文章顶部</h1>
          <div style="margin-top: 1500px;">
            <h2 id="middle-title">长文章中部核心内容</h2>
            <button id="mid-btn">中部互动按钮</button>
          </div>
        </body>
      </html>
    `;

    await session.setContent(tallHtml);

    // Initial state: page scrolled at 0
    const rawPage = session.getRawPage();
    const initialY = await rawPage.evaluate(() => window.scrollY);
    expect(initialY).toBe(0);

    // Execute scrollOverlap down with 0.2 (20% overlap)
    const result = await session.scrollOverlap('down', 0.2);
    expect(result.success).toBe(true);

    const scrolledY = await rawPage.evaluate(() => window.scrollY);
    expect(scrolledY).toBeGreaterThan(300);

    // Network stats check
    const stats = session.getNetworkStats();
    expect(stats).toBeDefined();
    expect(typeof stats.totalRequests).toBe('number');
  });
});
