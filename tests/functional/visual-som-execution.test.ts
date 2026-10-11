import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { BrowserManager } from '../../src/core/browser-manager.js';
import { SessionContext } from '../../src/core/session-context.js';

describe('Functional Test: Visual SOM Execution (多模态视觉打标与视口坐标测试)', () => {
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

  it('能生成带 Set-of-Mark 标记的截图与视口坐标，且截图后自动清除注入的覆盖层', async () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <body style="margin: 0; padding: 20px;">
          <h1 id="title">视觉标注测试台</h1>
          <button id="btn1" style="padding: 10px 20px;">立即购买</button>
          <input id="input1" type="text" placeholder="输入优惠码" style="padding: 8px;" />
        </body>
      </html>
    `;

    await session.setContent(html);

    // Capture visual SOM snapshot
    const visual = await session.getVisualSnapshot({ includeRawScreenshot: true });

    expect(visual.annotatedScreenshotBase64).toBeDefined();
    expect(visual.annotatedScreenshotBase64.length).toBeGreaterThan(100);
    expect(visual.rawScreenshotBase64).toBeDefined();
    expect(visual.totalAnnotatedCount).toBe(2);

    const btn = visual.visibleElements.find(e => e.tag === 'button');
    expect(btn).toBeDefined();
    expect(btn?.boundingBox.width).toBeGreaterThan(0);
    expect(btn?.boundingBox.height).toBeGreaterThan(0);
    expect(btn?.isInViewport).toBe(true);

    // Verify non-destructive cleanup: ensure overlay element is removed from live DOM
    const rawPage = session.getRawPage();
    const overlayExists = await rawPage.evaluate(() => {
      return document.getElementById('__agent_som_overlay__') !== null;
    });
    expect(overlayExists).toBe(false);
  });
});
