import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { BrowserManager } from '../../src/core/browser-manager.js';
import { SessionVaultData } from '../../src/types/index.js';

describe('Integration Test: Session Restore Flow (跨会话生命周期凭证导出与秒级还原)', () => {
  let browserManager: BrowserManager;

  beforeAll(async () => {
    browserManager = new BrowserManager({ headless: true });
  });

  afterAll(async () => {
    await browserManager.close();
  });

  it('在会话 A 中保存的状态保险箱能够完整恢复至全新创建的会话 B 中', async () => {
    // 1. Session A: Setup authentication cookie
    const sessionA = await browserManager.createSession();
    const mockAuthVault: SessionVaultData = {
      version: '1.0.0',
      createdAt: Date.now(),
      cookies: [
        {
          name: 'agent_auth_jwt',
          value: 'mock_jwt_token_payload_xyz',
          domain: 'example.com',
          path: '/',
          httpOnly: true,
          secure: true,
        },
      ],
      origins: [],
    };

    // Import into Session A
    await sessionA.importVault(mockAuthVault);

    // Export vault from Session A
    const exportedVault = await sessionA.exportVault();
    expect(exportedVault.cookies.some(c => c.name === 'agent_auth_jwt')).toBe(true);

    // Close Session A completely
    await sessionA.close();

    // 2. Session B: Brand new independent context
    const sessionB = await browserManager.createSession();

    // Import exported vault into Session B
    const importResult = await sessionB.importVault(exportedVault);
    expect(importResult.cookiesImported).toBeGreaterThanOrEqual(1);

    // Verify Session B possesses the auth cookie
    const vaultB = await sessionB.exportVault();
    const restoredCookie = vaultB.cookies.find(c => c.name === 'agent_auth_jwt');
    expect(restoredCookie).toBeDefined();
    expect(restoredCookie?.value).toBe('mock_jwt_token_payload_xyz');

    await sessionB.close();
  });
});
