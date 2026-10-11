import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { BrowserManager } from '../../src/core/browser-manager.js';
import { SessionContext } from '../../src/core/session-context.js';

describe('Security Test: NetworkShield Security & SSRF Coexistence (流量盾与安全沙箱协同)', () => {
  let browserManager: BrowserManager;
  let session: SessionContext;

  beforeAll(async () => {
    browserManager = new BrowserManager({ 
      headless: true,
      networkShield: { enabled: true, blockAnalytics: true, blockMedia: true }
    });
    session = await browserManager.createSession();
  });

  afterAll(async () => {
    await session.close();
    await browserManager.close();
  });

  it('NetworkShield 处于极限媒体阻断状态时，SSRF 防护层依然保持最高优先级阻断', async () => {
    // Attempting SSRF navigation
    await expect(session.navigate('http://127.0.0.1:4000/metrics')).rejects.toThrow(
      /SSRF Security Violation/
    );

    await expect(session.navigate('http://169.254.169.254/latest')).rejects.toThrow(
      /SSRF Security Violation/
    );
  });
});
