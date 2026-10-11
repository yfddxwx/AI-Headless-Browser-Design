import { describe, it, expect } from 'vitest';
import { CDPSecurityGuard } from '../../src/security/cdp-security-guard.js';

describe('Security Red Team Test: CDP Security Guard (远端端点与凭证脱敏安全测试)', () => {
  it('能够严密拦截指向云原生元数据服务 (169.254.169.254) 的 SSRF 探测攻击', () => {
    const maliciousEndpoints = [
      'ws://169.254.169.254/devtools/browser/abc',
      'http://169.254.169.254/latest/meta-data',
      'wss://metadata.google.internal/cdp',
    ];

    for (const ep of maliciousEndpoints) {
      const result = CDPSecurityGuard.validateEndpoint(ep, true);
      expect(result.valid).toBe(false);
      expect(result.violations.some(v => v.includes('metadata service'))).toBe(true);
    }
  });

  it('坚决拒绝非法协议与伪造 CDP 地址 (ftp, file, gopher, javascript)', () => {
    const illegalEndpoints = [
      'file:///etc/hosts',
      'ftp://attacker.com/cdp',
      'gopher://evil.internal',
      'javascript:alert(1)',
      '',
    ];

    for (const ep of illegalEndpoints) {
      const result = CDPSecurityGuard.validateEndpoint(ep, true);
      expect(result.valid).toBe(false);
    }
  });

  it('严格拦截非公网私网 IP 端点（当 allowLocal 为 false 时）', () => {
    const privateEndpoints = [
      'ws://127.0.0.1:9222',
      'ws://localhost:9222',
      'ws://10.0.0.1:9222',
      'ws://192.168.1.100:9222',
      'ws://172.20.0.5:9222',
    ];

    for (const ep of privateEndpoints) {
      const result = CDPSecurityGuard.validateEndpoint(ep, false);
      expect(result.valid).toBe(false);
      expect(result.violations.some(v => v.includes('Private network'))).toBe(true);
    }
  });

  it('输出统计与排查日志时能安全脱敏 API Key 与 Authorization 令牌', () => {
    const rawHeaders = {
      'Authorization': 'Bearer sk-proj-1234567890abcdef',
      'x-api-key': 'secret-prod-token-999',
      'Content-Type': 'application/json',
    };

    const masked = CDPSecurityGuard.maskHeaders(rawHeaders);

    expect(masked['Authorization']).not.toBe('Bearer sk-proj-1234567890abcdef');
    expect(masked['Authorization']).toContain('***');
    expect(masked['x-api-key']).not.toBe('secret-prod-token-999');
    expect(masked['x-api-key']).toContain('***');
    expect(masked['Content-Type']).toBe('application/json');
  });
});
