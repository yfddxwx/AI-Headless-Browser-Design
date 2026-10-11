import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { BrowserManager } from '../../src/core/browser-manager.js';
import { SessionContext } from '../../src/core/session-context.js';
import { SessionVaultData } from '../../src/types/index.js';

describe('Security Test: Vault Security Defense (状态保险箱恶意注入对抗测试)', () => {
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

  it('导入指向私有回环 IP (127.0.0.1) 的恶意 Cookie 应当被硬拦截', async () => {
    const maliciousVault: SessionVaultData = {
      version: '1.0.0',
      createdAt: Date.now(),
      cookies: [
        {
          name: 'admin_session',
          value: 'forged_val',
          domain: '127.0.0.1',
          path: '/',
        },
      ],
      origins: [],
    };

    await expect(session.importVault(maliciousVault)).rejects.toThrow(
      /Vault Security Violation: .*disallowed private\/SSRF domain/
    );
  });

  it('导入包含 CRLF 头注入字符的 Cookie 应当被拒绝', async () => {
    const crlfVault: SessionVaultData = {
      version: '1.0.0',
      createdAt: Date.now(),
      cookies: [
        {
          name: 'evil_cookie\r\nSet-Cookie: hijacked=true',
          value: 'test',
          domain: 'example.com',
          path: '/',
        },
      ],
      origins: [],
    };

    await expect(session.importVault(crlfVault)).rejects.toThrow(
      /Vault Security Violation: [\s\S]*dangerous CRLF injection/
    );
  });

  it('导入非法协议 (file: / data:) 的 Origin 存储应当被拒绝', async () => {
    const illegalOriginVault: SessionVaultData = {
      version: '1.0.0',
      createdAt: Date.now(),
      cookies: [],
      origins: [
        {
          origin: 'file:///etc/passwd',
          localStorage: { evil: 'true' },
        },
      ],
    };

    await expect(session.importVault(illegalOriginVault)).rejects.toThrow(
      /Vault Security Violation: .*disallowed protocol/
    );
  });
});
