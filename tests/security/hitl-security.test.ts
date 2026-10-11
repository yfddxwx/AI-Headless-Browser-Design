import { describe, it, expect } from 'vitest';
import { HITLCircuitBreaker } from '../../src/core/hitl-circuit-breaker.js';

describe('Security Red Team Test: HITL Security & Anti-Tampering (熔断器红队防伪造测试)', () => {
  it('伪造或非法的 challengeId 无法欺骗熔断器并被坚决拒绝', () => {
    const breaker = new HITLCircuitBreaker();

    // Attempt to resolve non-existent or forged challenge IDs
    expect(breaker.resolve('fake-challenge-id', { solved: true })).toBe(false);
    expect(breaker.resolve('__proto__', { solved: true })).toBe(false);
    expect(breaker.resolve('constructor', { solved: true })).toBe(false);

    expect(breaker.getState()).toBe('closed');
  });

  it('生成的 challengeId 具备高熵加密随机性，防止预测与重放攻击', async () => {
    const breaker = new HITLCircuitBreaker({ defaultTimeoutMs: 5000 });

    const p1 = breaker.trip({ type: 'recaptcha', url: 'https://a.com', message: 'test1' });
    const p2 = breaker.trip({ type: 'recaptcha', url: 'https://b.com', message: 'test2' });

    const challenges = breaker.getActiveChallenges();
    expect(challenges).toHaveLength(2);

    const id1 = challenges[0].challengeId;
    const id2 = challenges[1].challengeId;

    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^hitl-\d+-[a-f0-9]{8}$/);
    expect(id2).toMatch(/^hitl-\d+-[a-f0-9]{8}$/);

    breaker.reset();
    await Promise.all([p1, p2]);
  });

  it('严格受控的超时边界机制，防止恶意站点触发永久挂起型拒绝服务 (DoS)', async () => {
    const breaker = new HITLCircuitBreaker({ defaultTimeoutMs: 80 });

    const startTime = Date.now();
    const resolution = await breaker.trip({
      type: 'generic_challenge',
      url: 'https://dos-trap.com',
      message: 'Trap barrier meant to hang agents.',
      timeoutMs: 60,
    });
    const duration = Date.now() - startTime;

    expect(duration).toBeGreaterThanOrEqual(50);
    expect(duration).toBeLessThan(500); // Must not hang indefinitely
    expect(resolution.solved).toBe(false);
    expect(resolution.resolvedBy).toBe('system');
    expect(breaker.getState()).toBe('closed');
  });
});
