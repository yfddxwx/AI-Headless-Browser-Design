import { describe, it, expect } from 'vitest';
import { BrowserPool } from '../../src/core/browser-pool.js';

describe('Integration Test: Pool Session Lifecycle (多 Agent 租借生命周期与凭证隔离集成测试)', () => {
  it('多并发 Agent 租借会话并在归还时能够彻底清除凭证隔离状态', async () => {
    const pool = new BrowserPool({
      maxConcurrentSessions: 3,
      cleanSessionOnRelease: true,
      browserConfig: { headless: true },
    });

    // 1. Agent A acquires session and sets sensitive cookies
    const pooledA = await pool.acquire();
    await pooledA.session.setContent(`<html><body><h1>Agent A Session</h1></body></html>`);

    // Inject sensitive auth cookie into session A
    await pooledA.session.getRawPage().context().addCookies([
      {
        name: 'agent_auth_token',
        value: 'secret-token-agent-A',
        domain: 'localhost',
        path: '/',
      },
    ]);

    const cookiesA = await pooledA.session.getRawPage().context().cookies();
    expect(cookiesA.some(c => c.name === 'agent_auth_token')).toBe(true);

    // 2. Agent A finishes and releases session back to pool
    await pooledA.release();

    // 3. Agent B acquires next available session (should be the recycled session from pool)
    const pooledB = await pool.acquire();

    // 4. Verify that Agent B cannot see Agent A's cookies (cleanSessionOnRelease worked!)
    const cookiesB = await pooledB.session.getRawPage().context().cookies();
    expect(cookiesB.some(c => c.name === 'agent_auth_token')).toBe(false);

    await pooledB.release();
    await pool.drain();
  });
});
