import { chromium, Browser } from 'playwright';
import { BrowserConfig } from '../types/index.js';
import { SessionContext } from './session-context.js';
import { STEALTH_SCRIPT } from './stealth.js';
import { CDPSecurityGuard } from '../security/cdp-security-guard.js';

export class BrowserManager {
  private browser: Browser | null = null;
  private config: BrowserConfig;
  private isCdp: boolean = false;

  constructor(config: BrowserConfig = {}) {
    this.config = {
      headless: true,
      stealth: true,
      viewport: { width: 1280, height: 800 },
      ...config,
    };
  }

  public async init(): Promise<void> {
    if (this.browser) return;

    const cdpUrl = this.config.cdpUrl || this.config.remoteCdp?.endpointUrl;

    if (cdpUrl) {
      // 1. Validate remote CDP endpoint security
      const validation = CDPSecurityGuard.validateEndpoint(
        cdpUrl,
        this.config.blockPrivateIPs === false
      );

      if (!validation.valid) {
        throw new Error(`CDP Security Violation: ${validation.violations.join('; ')}`);
      }

      const headers = this.config.cdpHeaders || this.config.remoteCdp?.headers;
      const timeout = this.config.timeout || this.config.remoteCdp?.timeout || 30000;
      const slowMo = this.config.remoteCdp?.slowMo;

      this.browser = await chromium.connectOverCDP(validation.sanitizedEndpoint, {
        headers,
        timeout,
        slowMo,
      });
      this.isCdp = true;
    } else {
      // 2. Launch managed local Chromium instance
      this.browser = await chromium.launch({
        headless: this.config.headless !== false,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled',
        ],
      });
      this.isCdp = false;
    }
  }

  public async createSession(customConfig?: Partial<BrowserConfig>): Promise<SessionContext> {
    await this.init();

    if (!this.browser) {
      throw new Error('Browser instance failed to initialize.');
    }

    const mergedConfig: BrowserConfig = { ...this.config, ...customConfig };

    const context = await this.browser.newContext({
      viewport: mergedConfig.viewport,
      userAgent: mergedConfig.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    });

    if (mergedConfig.stealth !== false) {
      await context.addInitScript(STEALTH_SCRIPT);
    }

    const page = await context.newPage();
    return new SessionContext(context, page, mergedConfig);
  }

  public isConnectedOverCDP(): boolean {
    return this.isCdp;
  }

  public getBrowser(): Browser | null {
    return this.browser;
  }

  public async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.isCdp = false;
    }
  }
}
