import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { BrowserManager } from '../../src/core/browser-manager.js';
import { SessionContext } from '../../src/core/session-context.js';

describe('Functional Test: Vault Persistence & Captcha Detection (会话持久化与验证码侦测)', () => {
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

  it('在普通页面上 CaptchaDetector 应当返回未侦测到人机挑战', async () => {
    await session.setContent('<html><head><title>正常业务看板</title></head><body><h1>欢迎光临</h1></body></html>');
    const result = await session.detectCaptcha();
    expect(result.detected).toBe(false);
  });

  it('能精准识别 Cloudflare Turnstile 验证码拦截屏障', async () => {
    const cfHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>Just a moment...</title></head>
        <body>
          <div class="cf-turnstile" data-sitekey="test"></div>
          <p>Verify you are human to proceed.</p>
        </body>
      </html>
    `;

    await session.setContent(cfHtml);
    const result = await session.detectCaptcha();
    expect(result.detected).toBe(true);
    expect(result.type).toBe('cloudflare_turnstile');
  });

  it('能精准识别 Google reCAPTCHA 屏障', async () => {
    const recapHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>登录安全验证</title></head>
        <body>
          <div class="g-recaptcha" data-sitekey="test"></div>
        </body>
      </html>
    `;

    await session.setContent(recapHtml);
    const result = await session.detectCaptcha();
    expect(result.detected).toBe(true);
    expect(result.type).toBe('recaptcha');
  });
});
