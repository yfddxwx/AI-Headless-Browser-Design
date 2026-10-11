import { describe, it, expect } from 'vitest';
import { VaultSecuritySanitizer } from '../../src/security/vault-sanitizer.js';
import { SessionVaultData } from '../../src/types/index.js';

describe('Unit Test: SessionVault Sanitizer (状态保险箱契约与安全性校验)', () => {
  it('合法的公网域名 Cookie 与存储应当顺利通过验证', () => {
    const validVault: SessionVaultData = {
      version: '1.0.0',
      createdAt: Date.now(),
      cookies: [
        {
          name: 'session_id',
          value: 'secret_token_123',
          domain: 'example.com',
          path: '/',
          httpOnly: true,
          secure: true,
        },
      ],
      origins: [
        {
          origin: 'https://example.com',
          localStorage: { theme: 'dark', user: 'alice' },
        },
      ],
    };

    const result = VaultSecuritySanitizer.sanitizeAndValidate(validVault);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);

    const summary = VaultSecuritySanitizer.sanitizeSummary(validVault);
    expect(summary.cookieCount).toBe(1);
    expect(summary.cookieNames[0]).toBe('session_id (example.com)');
  });

  it('缺失关键顶层字段的破损 Vault 应当被拦截', () => {
    const brokenVault = { version: '1.0.0' } as any;
    const result = VaultSecuritySanitizer.sanitizeAndValidate(brokenVault);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('missing required top-level fields');
  });
});
