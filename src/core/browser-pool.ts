import { randomBytes } from 'crypto';
import { BrowserPoolConfig, PoolStats, PooledSession } from '../types/index.js';
import { BrowserManager } from './browser-manager.js';
import { SessionContext } from './session-context.js';

interface QueuedAcquire {
  resolve: (session: PooledSession) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
}

interface InternalSessionHolder {
  id: string;
  session: SessionContext;
  createdAt: number;
  lastUsedAt: number;
}

export class BrowserPool {
  private config: Required<Omit<BrowserPoolConfig, 'remoteCdp' | 'browserConfig'>> & Pick<BrowserPoolConfig, 'remoteCdp' | 'browserConfig'>;
  private browserManager: BrowserManager;
  private activeSessions: Map<string, InternalSessionHolder> = new Map();
  private idleSessions: InternalSessionHolder[] = [];
  private queuedRequests: QueuedAcquire[] = [];
  private totalCreated: number = 0;
  private totalRecycled: number = 0;
  private isDraining: boolean = false;

  constructor(config: BrowserPoolConfig = {}) {
    this.config = {
      mode: config.remoteCdp ? 'remote_cdp' : (config.mode || 'local'),
      remoteCdp: config.remoteCdp,
      minSessions: config.minSessions || 0,
      maxConcurrentSessions: config.maxConcurrentSessions || 5,
      acquireTimeoutMs: config.acquireTimeoutMs || 30000,
      idleTimeoutMs: config.idleTimeoutMs || 60000,
      maxSessionLifetimeMs: config.maxSessionLifetimeMs || 600000,
      cleanSessionOnRelease: config.cleanSessionOnRelease !== false,
      browserConfig: config.browserConfig,
    };

    // Initialize underlying browser manager
    const managerConfig = {
      ...this.config.browserConfig,
      cdpUrl: this.config.remoteCdp?.endpointUrl,
      cdpHeaders: this.config.remoteCdp?.headers,
      remoteCdp: this.config.remoteCdp,
    };
    this.browserManager = new BrowserManager(managerConfig);
  }

  public async acquire(): Promise<PooledSession> {
    if (this.isDraining) {
      throw new Error('BrowserPool is draining. No new sessions can be acquired.');
    }

    // 1. Try to reuse an existing healthy idle session
    while (this.idleSessions.length > 0) {
      const holder = this.idleSessions.pop()!;
      const age = Date.now() - holder.createdAt;

      // Check lifetime
      if (age > this.config.maxSessionLifetimeMs) {
        await this.destroySession(holder);
        continue;
      }

      // Quick health check
      const isHealthy = await this.pingSession(holder.session);
      if (!isHealthy) {
        await this.destroySession(holder);
        continue;
      }

      holder.lastUsedAt = Date.now();
      this.activeSessions.set(holder.id, holder);
      return this.wrapPooledSession(holder);
    }

    // 2. If under concurrency limit, spin up a new session
    if (this.activeSessions.size < this.config.maxConcurrentSessions) {
      const holder = await this.createNewSession();
      this.activeSessions.set(holder.id, holder);
      return this.wrapPooledSession(holder);
    }

    // 3. Pool is saturated, queue request with timeout
    return new Promise<PooledSession>((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.queuedRequests.findIndex((q) => q.timer === timer);
        if (idx !== -1) {
          this.queuedRequests.splice(idx, 1);
        }
        reject(
          new Error(
            `BrowserPool acquisition timed out after ${this.config.acquireTimeoutMs}ms (Max concurrency: ${this.config.maxConcurrentSessions}).`
          )
        );
      }, this.config.acquireTimeoutMs);

      this.queuedRequests.push({ resolve, reject, timer });
    });
  }

  public async release(pooled: PooledSession): Promise<void> {
    const holder = this.activeSessions.get(pooled.id);
    if (!holder) {
      return;
    }

    this.activeSessions.delete(pooled.id);

    // If draining, close immediately
    if (this.isDraining) {
      await this.destroySession(holder);
      return;
    }

    // Sanitize session credentials/cookies if enabled
    if (this.config.cleanSessionOnRelease) {
      try {
        await holder.session.getRawPage().context().clearCookies();
      } catch {
        // Ignore cookie clear errors on closed pages
      }
    }

    holder.lastUsedAt = Date.now();

    // Check if there are queued requests waiting
    if (this.queuedRequests.length > 0) {
      const queued = this.queuedRequests.shift()!;
      clearTimeout(queued.timer);
      this.activeSessions.set(holder.id, holder);
      queued.resolve(this.wrapPooledSession(holder));
      return;
    }

    // Return to idle pool
    this.idleSessions.push(holder);
  }

  public async recycle(sessionId: string): Promise<boolean> {
    const active = this.activeSessions.get(sessionId);
    if (active) {
      this.activeSessions.delete(sessionId);
      await this.destroySession(active);
      return true;
    }

    const idleIdx = this.idleSessions.findIndex((s) => s.id === sessionId);
    if (idleIdx !== -1) {
      const idle = this.idleSessions.splice(idleIdx, 1)[0];
      await this.destroySession(idle);
      return true;
    }

    return false;
  }

  public getStats(): PoolStats {
    let status: PoolStats['status'] = 'healthy';
    if (this.activeSessions.size >= this.config.maxConcurrentSessions) {
      status = 'exhausted';
    } else if (this.totalRecycled > 5 && this.activeSessions.size === 0) {
      status = 'degraded';
    }

    return {
      mode: this.config.mode,
      totalSessionsCreated: this.totalCreated,
      activeSessions: this.activeSessions.size,
      idleSessions: this.idleSessions.length,
      queuedRequests: this.queuedRequests.length,
      recycledSessions: this.totalRecycled,
      status,
    };
  }

  public async drain(): Promise<void> {
    this.isDraining = true;

    // Reject queued requests
    for (const queued of this.queuedRequests) {
      clearTimeout(queued.timer);
      queued.reject(new Error('BrowserPool is draining.'));
    }
    this.queuedRequests = [];

    // Close all active sessions
    const activePromises = Array.from(this.activeSessions.values()).map((h) => this.destroySession(h));
    this.activeSessions.clear();

    // Close all idle sessions
    const idlePromises = this.idleSessions.map((h) => this.destroySession(h));
    this.idleSessions = [];

    await Promise.allSettled([...activePromises, ...idlePromises]);
    await this.browserManager.close();
  }

  private async createNewSession(): Promise<InternalSessionHolder> {
    const session = await this.browserManager.createSession();
    this.totalCreated++;
    const id = `session-pool-${Date.now()}-${randomBytes(3).toString('hex')}`;
    return {
      id,
      session,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
    };
  }

  private wrapPooledSession(holder: InternalSessionHolder): PooledSession {
    return {
      id: holder.id,
      session: holder.session,
      createdAt: holder.createdAt,
      lastUsedAt: holder.lastUsedAt,
      release: () => this.release(this.wrapPooledSession(holder)),
    };
  }

  private async pingSession(session: SessionContext): Promise<boolean> {
    try {
      await session.getRawPage().evaluate(() => 1);
      return true;
    } catch {
      return false;
    }
  }

  private async destroySession(holder: InternalSessionHolder): Promise<void> {
    this.totalRecycled++;
    try {
      await holder.session.close();
    } catch {
      // Ignore closing errors
    }
  }
}
