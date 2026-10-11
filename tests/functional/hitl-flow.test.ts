import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { BrowserManager } from '../../src/core/browser-manager.js';
import { SessionContext } from '../../src/core/session-context.js';

describe('Functional Test: HITL Flow (真实浏览器人机协同熔断与恢复测试)', () => {
  let browserManager: BrowserManager;
  let session: SessionContext;

  beforeAll(async () => {
    browserManager = new BrowserManager({ headless: true });
    session = await browserManager.createSession({
      hitl: {
        enabled: true,
        autoBreakOnCaptcha: true,
        defaultTimeoutMs: 10000,
      },
    });
  });

  afterAll(async () => {
    await session.close();
    await browserManager.close();
  });

  it('遭遇验证码或双重认证拦截时，能够主动触发熔断并在人工介入解决后无缝恢复执行', async () => {
    // 1. Load an HTML page simulating a 2FA OTP verification roadblock
    const challengeHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>安全验证 - 双重身份验证</title></head>
        <body>
          <h2>请输入短信验证码</h2>
          <form id="otp-form">
            <input id="otp-code" autocomplete="one-time-code" placeholder="输入 6 位验证码" />
            <button id="submit-btn" onclick="document.body.innerHTML = '<h1>验证通过！欢迎进入后台</h1>'">确认提交</button>
          </form>
        </body>
      </html>
    `;

    await session.setContent(challengeHtml);

    // 2. Detect captcha/2FA
    const detection = await session.detectCaptcha();
    expect(detection.detected).toBe(true);
    expect(detection.type).toBe('two_factor_auth');

    // 3. Trip challenge
    const tripPromise = session.tripChallenge({
      type: 'two_factor_auth',
      message: 'Detected 2FA SMS code barrier.',
    });

    const breaker = session.getCircuitBreaker();
    expect(breaker.getState()).toBe('open');

    // 4. Verify agent action is blocked while breaker is OPEN
    const actionResult = await session.click('@1');
    expect(actionResult.success).toBe(false);
    expect(actionResult.error).toContain('HITL Circuit Breaker is OPEN');

    // 5. Operator / Human solves the challenge
    const active = session.getActiveChallenges();
    expect(active.length).toBeGreaterThan(0);
    const resolved = session.resolveChallenge(active[0].challengeId, {
      solved: true,
      notes: 'User entered SMS code manually.',
    });
    expect(resolved).toBe(true);

    const tripResult = await tripPromise;
    expect(tripResult.solved).toBe(true);
    expect(breaker.getState()).toBe('closed');

    // 6. Execution can now resume smoothly
    const perception = await session.setContent(`
      <html><body><button id="resume-btn" onclick="document.body.innerText = '已恢复业务流'">继续执行</button></body></html>
    `);
    const btn = perception.interactiveElements.find(e => e.tag === 'button');
    expect(btn).toBeDefined();

    const resumeResult = await session.click(btn!.ref);
    expect(resumeResult.success).toBe(true);
  });
});
