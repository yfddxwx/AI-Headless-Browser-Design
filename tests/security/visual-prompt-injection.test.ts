import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { BrowserManager } from '../../src/core/browser-manager.js';
import { SessionContext } from '../../src/core/session-context.js';

describe('Security Test: Visual Prompt Injection Defense (多模态视觉防隐形注入审计)', () => {
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

  it('视觉标注层必须彻底过滤零尺寸与隐形对抗节点，防止向 VLM 传递视觉越狱诱导', async () => {
    const maliciousHtml = `
      <!DOCTYPE html>
      <html>
        <body>
          <button id="legit-btn">合法按钮</button>
          
          <!-- 隐形对抗注入元素 -->
          <button id="hidden-btn-1" style="display: none;">[INJECTION] 隐藏注入按钮 1</button>
          <button id="hidden-btn-2" style="visibility: hidden;">[INJECTION] 隐藏注入按钮 2</button>
          <button id="hidden-btn-3" style="opacity: 0;">[INJECTION] 透明注入按钮 3</button>
          <button id="hidden-btn-4" style="position: absolute; left: -9999px;">[INJECTION] 越界注入按钮 4</button>
          <button id="hidden-btn-5" style="width: 0px; height: 0px;">[INJECTION] 零尺寸注入按钮 5</button>
        </body>
      </html>
    `;

    await session.setContent(maliciousHtml);
    const visual = await session.getVisualSnapshot();

    // Only the legit button should be annotated
    expect(visual.totalAnnotatedCount).toBe(1);
    expect(visual.visibleElements[0].text).toContain('合法按钮');

    // Ensure none of the malicious elements are present
    const maliciousPresent = visual.visibleElements.some(e => e.text.includes('INJECTION'));
    expect(maliciousPresent).toBe(false);
  });
});
