import { describe, it, expect, afterAll } from 'vitest';
import { BrowserPool } from '../../src/core/browser-pool.js';

describe('Unit Test: BrowserPool (弹性会话集群池单元测试)', () => {
  let pool: BrowserPool;

  afterAll(async () => {
    if (pool) {
      await pool.drain();
    }
  });

  it('能成功租借、归还并复用会话，且正确报告连接池统计', async () => {
    pool = new BrowserPool({
      maxConcurrentSessions: 2,
      acquireTimeoutMs: 3000,
      browserConfig: { headless: true },
    });

    const statsInitial = pool.getStats();
    expect(statsInitial.activeSessions).toBe(0);
    expect(statsInitial.idleSessions).toBe(0);

    // 1. Acquire first session
    const pooled1 = await pool.acquire();
    expect(pooled1.id).toBeDefined();
    expect(pool.getStats().activeSessions).toBe(1);

    // 2. Acquire second session
    const pooled2 = await pool.acquire();
    expect(pooled2.id).toBeDefined();
    expect(pool.getStats().activeSessions).toBe(2);
    expect(pool.getStats().status).toBe('exhausted');

    // 3. Release first session
    await pooled1.release();
    expect(pool.getStats().activeSessions).toBe(1);
    expect(pool.getStats().idleSessions).toBe(1);

    // 4. Re-acquire should reuse the idle session
    const pooled3 = await pool.acquire();
    expect(pooled3.id).toBe(pooled1.id);
    expect(pool.getStats().activeSessions).toBe(2);

    // Clean up
    await pooled2.release();
    await pooled3.release();
  });

  it('达到并发上限时能够排队等待并在释放后立即唤醒等待队列', async () => {
    const queuePool = new BrowserPool({
      maxConcurrentSessions: 1,
      acquireTimeoutMs: 2000,
      browserConfig: { headless: true },
    });

    const s1 = await queuePool.acquire();

    let s2Acquired = false;
    const s2Promise = queuePool.acquire().then((s2) => {
      s2Acquired = true;
      return s2;
    });

    // Check queued
    expect(queuePool.getStats().queuedRequests).toBe(1);
    expect(s2Acquired).toBe(false);

    // Release s1 -> should wake s2 immediately
    await s1.release();

    const s2 = await s2Promise;
    expect(s2Acquired).toBe(true);
    expect(s2.id).toBe(s1.id);

    await s2.release();
    await queuePool.drain();
  });

  it('支持主动回收 (recycle) 降级或异常会话', async () => {
    const recyclePool = new BrowserPool({
      maxConcurrentSessions: 2,
      browserConfig: { headless: true },
    });

    const session = await recyclePool.acquire();
    const id = session.id;

    const recycled = await recyclePool.recycle(id);
    expect(recycled).toBe(true);
    expect(recyclePool.getStats().recycledSessions).toBe(1);
    expect(recyclePool.getStats().activeSessions).toBe(0);

    await recyclePool.drain();
  });
});
