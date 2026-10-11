import { describe, it, expect } from 'vitest';
import { SSRFGuard } from '../../src/security/ssrf-guard.js';

describe('Security Test: SSRFGuard (私有网络与危险协议拦截防御)', () => {
  const guard = new SSRFGuard();

  it('应当拦截对 localhost 和 127.0.0.1 本地回环地址的访问', () => {
    const res1 = guard.validateUrl('http://127.0.0.1:8080/admin');
    expect(res1.safe).toBe(false);
    expect(res1.violations.join('')).toContain('blocked by SSRFGuard');

    const res2 = guard.validateUrl('http://localhost:3000/api');
    expect(res2.safe).toBe(false);
  });

  it('应当拦截各类局域网私有网段 (10.x, 172.16-31.x, 192.168.x)', () => {
    expect(guard.validateUrl('http://10.1.2.3/conf').safe).toBe(false);
    expect(guard.validateUrl('http://172.20.1.1/').safe).toBe(false);
    expect(guard.validateUrl('http://192.168.1.1/router').safe).toBe(false);
  });

  it('应当严密拦截云厂商内部元数据端点 (169.254.169.254)', () => {
    const res = guard.validateUrl('http://169.254.169.254/latest/meta-data/');
    expect(res.safe).toBe(false);
    expect(res.violations.join('')).toContain('blocked by SSRFGuard');
  });

  it('应当拒绝非 http/https 协议 (file:, data:, javascript:)', () => {
    expect(guard.validateUrl('file:///etc/passwd').safe).toBe(false);
    expect(guard.validateUrl('data:text/html,<script>evil()</script>').safe).toBe(false);
    expect(guard.validateUrl('javascript:alert(1)').safe).toBe(false);
  });

  it('应当放行正常的合法公网 HTTP/HTTPS 网址', () => {
    expect(guard.validateUrl('https://example.com').safe).toBe(true);
    expect(guard.validateUrl('https://api.github.com/repos').safe).toBe(true);
  });
});
