import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { BrowserManager } from '../../src/core/browser-manager.js';
import { SessionContext } from '../../src/core/session-context.js';

describe('Integration Test: HITL Integration & Event Lifecycle (多标签挑战事件生命周期集成)', () => {
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

  it('监听器能准确接收 ChallengeDetected 与 ChallengeResolved 事件并在多标签中维持隔离', async () => {
    const onDetected = vi.fn();
    const onResolved = vi.fn();

    session.configureHITL({
      enabled: true,
      onChallengeDetected: onDetected,
      onChallengeResolved: onResolved,
      defaultTimeoutMs: 5000,
    });

    const tripPromise = session.tripChallenge({
      type: 'cloudflare_turnstile',
      url: 'https://test.cloudflare.com/verify',
      message: 'Cloudflare interactive challenge.',
    });

    expect(onDetected).toHaveBeenCalledTimes(1);
    const event = onDetected.mock.calls[0][0];
    expect(event.type).toBe('cloudflare_turnstile');
    expect(event.challengeId).toBeDefined();

    // Resolve
    session.resolveChallenge(event.challengeId, {
      solved: true,
      resolutionToken: 'cf-clearance-token-xyz',
      resolvedBy: 'human',
    });

    const res = await tripPromise;
    expect(res.solved).toBe(true);
    expect(onResolved).toHaveBeenCalledTimes(1);
    expect(onResolved.mock.calls[0][0].resolutionToken).toBe('cf-clearance-token-xyz');
  });
});
