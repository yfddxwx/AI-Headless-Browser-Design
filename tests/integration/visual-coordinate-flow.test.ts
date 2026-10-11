import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { BrowserManager } from '../../src/core/browser-manager.js';
import { SessionContext } from '../../src/core/session-context.js';

describe('Integration Test: Visual Coordinate Flow (视觉坐标接地与物理点击集成测试)', () => {
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

  it('能通过视觉快照获取的 BoundingBox 物理中心坐标成功触发点击交互', async () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <body style="margin: 0; padding: 50px;">
          <h2 id="status">等待多模态点击</h2>
          <button 
            id="target-button" 
            style="width: 150px; height: 50px; font-size: 16px;"
            onclick="document.getElementById('status').innerText = '多模态物理坐标点击成功！'">
            点击我
          </button>
        </body>
      </html>
    `;

    await session.setContent(html);

    // 1. Get visual snapshot
    const visual = await session.getVisualSnapshot();
    const target = visual.visibleElements.find(e => e.text.includes('点击我'));
    expect(target).toBeDefined();

    // 2. Compute center pixel coordinates
    const centerX = target!.boundingBox.x + target!.boundingBox.width / 2;
    const centerY = target!.boundingBox.y + target!.boundingBox.height / 2;

    expect(centerX).toBeGreaterThan(0);
    expect(centerY).toBeGreaterThan(0);

    // 3. Execute clickCoordinate
    const clickResult = await session.clickCoordinate(centerX, centerY);
    expect(clickResult.success).toBe(true);

    // 4. Verify DOM update
    const rawPage = session.getRawPage();
    const updatedStatus = await rawPage.locator('#status').innerText();
    expect(updatedStatus).toBe('多模态物理坐标点击成功！');
  });
});
