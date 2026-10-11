import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { BrowserManager } from '../../src/core/browser-manager.js';
import { SessionContext } from '../../src/core/session-context.js';

describe('Functional Test: Occlusion Detection (现代 Web 模态框与弹层遮挡检测)', () => {
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

  it('能精准检测出被上层悬浮 Modal 遮挡的底层元素并打上 isOccluded 标识', async () => {
    const htmlWithModal = `
      <!DOCTYPE html>
      <html>
        <body style="margin: 0; padding: 20px;">
          <!-- 底层被遮挡的按钮 -->
          <button id="covered-btn" style="position: absolute; top: 100px; left: 100px; width: 120px; height: 40px;">
            底层按钮
          </button>

          <!-- 遮挡全屏的模态框弹层 -->
          <div id="modal-overlay" style="position: fixed; top: 0; left: 0; width: 300px; height: 300px; background: rgba(0,0,0,0.8); z-index: 9999;">
            <button id="modal-close" style="margin: 20px;">关闭模态框</button>
          </div>
        </body>
      </html>
    `;

    await session.setContent(htmlWithModal);
    const visual = await session.getVisualSnapshot();

    const covered = visual.visibleElements.find(e => e.text.includes('底层按钮'));
    const modalBtn = visual.visibleElements.find(e => e.text.includes('关闭模态框'));

    expect(covered).toBeDefined();
    expect(modalBtn).toBeDefined();

    // The covered button should have isOccluded === true
    expect(covered?.isOccluded).toBe(true);

    // The top-level modal close button should NOT be occluded
    expect(modalBtn?.isOccluded).toBe(false);
  });
});
