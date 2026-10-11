import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { BrowserManager } from '../../src/core/browser-manager.js';
import { SessionContext } from '../../src/core/session-context.js';

describe('Security Test: Tab SSRF Defense (多标签页与弹窗私网拦截安全测试)', () => {
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

  it('使用 createTab 打开私有回环 IP (127.0.0.1) 应当被严格拦截', async () => {
    await expect(session.createTab('http://127.0.0.1:8080/admin')).rejects.toThrow(
      /SSRF Security Violation/
    );
  });

  it('使用 createTab 打开云元数据地址 (169.254.169.254) 应当被严格拦截', async () => {
    await expect(session.createTab('http://169.254.169.254/latest/meta-data')).rejects.toThrow(
      /SSRF Security Violation/
    );
  });
});
