import { randomBytes } from 'crypto';
import {
  ChallengeEvent,
  ChallengeResolution,
  ChallengeType,
  CircuitBreakerState,
  HITLConfig,
} from '../types/index.js';

interface ActiveChallengeRecord {
  event: ChallengeEvent;
  resolve: (res: ChallengeResolution) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
}

export class HITLCircuitBreaker {
  private state: CircuitBreakerState = 'closed';
  private config: HITLConfig;
  private activeChallenges: Map<string, ActiveChallengeRecord> = new Map();
  private challengeHistory: ChallengeEvent[] = [];

  constructor(config: HITLConfig = {}) {
    this.config = {
      enabled: config.enabled !== false,
      autoBreakOnCaptcha: config.autoBreakOnCaptcha !== false,
      defaultTimeoutMs: config.defaultTimeoutMs || 120000, // 2 minutes default
      ...config,
    };
  }

  public getState(): CircuitBreakerState {
    return this.state;
  }

  public isEnabled(): boolean {
    return this.config.enabled === true;
  }

  public updateConfig(config: Partial<HITLConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public assertCanExecute(actionName: string = 'operation'): void {
    if (this.state === 'open' && this.activeChallenges.size > 0) {
      const active = Array.from(this.activeChallenges.values())[0].event;
      throw new Error(
        `HITL Circuit Breaker is OPEN: Execution paused due to active challenge [${active.type}] (${active.challengeId}). ` +
        `Action "${actionName}" cannot proceed until challenge is resolved.`
      );
    }
  }

  public async trip(params: {
    type: ChallengeType;
    url: string;
    message: string;
    screenshotBase64?: string;
    timeoutMs?: number;
    metadata?: Record<string, any>;
  }): Promise<ChallengeResolution> {
    const timeout = params.timeoutMs || this.config.defaultTimeoutMs || 120000;
    const challengeId = `hitl-${Date.now()}-${randomBytes(4).toString('hex')}`;

    const event: ChallengeEvent = {
      challengeId,
      type: params.type,
      url: params.url,
      detectedAt: Date.now(),
      expiresAt: Date.now() + timeout,
      screenshotBase64: params.screenshotBase64,
      message: params.message,
      status: 'waiting_for_resolution',
      metadata: params.metadata,
    };

    // Trip circuit breaker to OPEN
    this.state = 'open';

    // Notify challenge detected callback
    if (this.config.onChallengeDetected) {
      try {
        this.config.onChallengeDetected(event);
      } catch {
        // Ignore listener exceptions
      }
    }

    const resolutionPromise = new Promise<ChallengeResolution>((resolve, reject) => {
      const timer = setTimeout(() => {
        event.status = 'timeout';
        this.activeChallenges.delete(challengeId);
        this.challengeHistory.push({ ...event });
        this.evaluateState();

        const timeoutResolution: ChallengeResolution = {
          challengeId,
          solved: false,
          notes: `Challenge timed out after ${timeout}ms.`,
          resolvedBy: 'system',
        };
        resolve(timeoutResolution);
      }, timeout);

      this.activeChallenges.set(challengeId, {
        event,
        resolve,
        reject,
        timer,
      });
    });

    // If an automated solver hook is registered, invoke it
    if (this.config.solverHook) {
      Promise.resolve()
        .then(() => this.config.solverHook!(event))
        .then((hookResult) => {
          if (hookResult !== undefined && hookResult !== null) {
            if (typeof hookResult === 'boolean') {
              this.resolve(challengeId, {
                solved: hookResult,
                resolvedBy: 'automated_hook',
                notes: hookResult ? 'Solved by automated solver hook.' : 'Automated solver hook failed.',
              });
            } else if (typeof hookResult === 'object') {
              this.resolve(challengeId, {
                ...hookResult,
                resolvedBy: hookResult.resolvedBy || 'automated_hook',
              });
            }
          }
        })
        .catch((err) => {
          // If solver hook fails, let it remain open for human resolution or timeout
          event.metadata = { ...event.metadata, solverError: err.message };
        });
    }

    return resolutionPromise;
  }

  public resolve(challengeId: string, resolution: Partial<ChallengeResolution>): boolean {
    const record = this.activeChallenges.get(challengeId);
    if (!record) {
      return false;
    }

    clearTimeout(record.timer);
    this.activeChallenges.delete(challengeId);

    const fullResolution: ChallengeResolution = {
      challengeId,
      solved: resolution.solved !== false,
      resolutionToken: resolution.resolutionToken,
      notes: resolution.notes,
      resolvedBy: resolution.resolvedBy || 'human',
    };

    record.event.status = fullResolution.solved ? 'resolved' : 'failed';
    this.challengeHistory.push({ ...record.event });

    this.evaluateState();

    if (this.config.onChallengeResolved) {
      try {
        this.config.onChallengeResolved(fullResolution);
      } catch {
        // Ignore listener exceptions
      }
    }

    record.resolve(fullResolution);
    return true;
  }

  public getActiveChallenges(): ChallengeEvent[] {
    return Array.from(this.activeChallenges.values()).map((r) => ({ ...r.event }));
  }

  public getChallenge(challengeId: string): ChallengeEvent | undefined {
    const active = this.activeChallenges.get(challengeId);
    if (active) return { ...active.event };
    return this.challengeHistory.find((c) => c.challengeId === challengeId);
  }

  public reset(): void {
    for (const record of this.activeChallenges.values()) {
      clearTimeout(record.timer);
      record.resolve({
        challengeId: record.event.challengeId,
        solved: false,
        notes: 'Circuit breaker manually reset.',
        resolvedBy: 'system',
      });
    }
    this.activeChallenges.clear();
    this.state = 'closed';
  }

  private evaluateState(): void {
    if (this.activeChallenges.size === 0) {
      this.state = 'closed';
    } else {
      this.state = 'open';
    }
  }
}
