import { describe, it, expect, vi } from 'vitest';
import { HITLCircuitBreaker } from '../../src/core/hitl-circuit-breaker.js';

describe('Unit Test: HITLCircuitBreaker (人机协同挑战熔断器单元测试)', () => {
  it('初始状态为 closed，trip 后转为 open 并能阻塞操作', async () => {
    const breaker = new HITLCircuitBreaker({ defaultTimeoutMs: 5000 });
    expect(breaker.getState()).toBe('closed');

    // Trip the breaker
    const tripPromise = breaker.trip({
      type: 'cloudflare_turnstile',
      url: 'https://protected.example.com',
      message: 'Cloudflare Turnstile challenge encountered.',
    });

    expect(breaker.getState()).toBe('open');
    expect(breaker.getActiveChallenges()).toHaveLength(1);

    // Verify assertCanExecute blocks
    expect(() => breaker.assertCanExecute('click')).toThrow(/HITL Circuit Breaker is OPEN/);

    // Resolve the challenge
    const active = breaker.getActiveChallenges()[0];
    const resolved = breaker.resolve(active.challengeId, {
      solved: true,
      notes: 'Human solved challenge successfully.',
    });

    expect(resolved).toBe(true);
    const result = await tripPromise;
    expect(result.solved).toBe(true);
    expect(breaker.getState()).toBe('closed');
    expect(breaker.getActiveChallenges()).toHaveLength(0);

    // Assert passes after resolution
    expect(() => breaker.assertCanExecute('click')).not.toThrow();
  });

  it('支持自动解题钩子 (solverHook) 自动应答并解开熔断', async () => {
    const solverHook = vi.fn().mockImplementation(async (event) => {
      expect(event.type).toBe('recaptcha');
      return {
        challengeId: event.challengeId,
        solved: true,
        resolutionToken: 'token-recaptcha-bypass-12345',
        resolvedBy: 'automated_hook' as const,
      };
    });

    const breaker = new HITLCircuitBreaker({
      solverHook,
      defaultTimeoutMs: 5000,
    });

    const result = await breaker.trip({
      type: 'recaptcha',
      url: 'https://captcha.example.com',
      message: 'Google reCAPTCHA v2 barrier.',
    });

    expect(solverHook).toHaveBeenCalledTimes(1);
    expect(result.solved).toBe(true);
    expect(result.resolutionToken).toBe('token-recaptcha-bypass-12345');
    expect(result.resolvedBy).toBe('automated_hook');
    expect(breaker.getState()).toBe('closed');
  });

  it('超时未解决时能够安全终止并标记为 timeout', async () => {
    const breaker = new HITLCircuitBreaker({ defaultTimeoutMs: 100 });

    const result = await breaker.trip({
      type: 'hcaptcha',
      url: 'https://hcaptcha.example.com',
      message: 'hCaptcha timeout test.',
      timeoutMs: 50,
    });

    expect(result.solved).toBe(false);
    expect(result.resolvedBy).toBe('system');
    expect(result.notes).toContain('timed out');
    expect(breaker.getState()).toBe('closed');
  });
});
