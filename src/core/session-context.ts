import { BrowserContext, Page } from 'playwright';
import { SSRFGuard } from '../security/ssrf-guard.js';
import { PageSnapshotService } from '../perception/page-snapshot.js';
import { ActionExecutor } from '../action/action-executor.js';
import { StateDiff } from '../action/state-diff.js';
import { ActionResult, BrowserConfig, PagePerception, VisualSnapshot, TabInfo, TabSwitchResult, TabCloseResult, SessionVaultData, CaptchaDetectionResult, NetworkStats, NetworkShieldConfig, PageMetadata, ExtractionResult, ExtractionSchema, StructuredExtractorOptions, ChallengeEvent, ChallengeResolution, HITLConfig, ChallengeType } from '../types/index.js';
import { SOMOverlayEngine, SOMOverlayOptions } from '../perception/som-overlay.js';
import { MetadataExtractor } from '../perception/metadata-extractor.js';
import { StructuredExtractor } from '../perception/structured-extractor.js';
import { TabManager } from './tab-manager.js';
import { SessionVault } from './session-vault.js';
import { CaptchaDetector } from '../security/captcha-detector.js';
import { NetworkShield } from './network-shield.js';
import { HITLCircuitBreaker } from './hitl-circuit-breaker.js';

export class SessionContext {
  private context: BrowserContext;
  private tabManager: TabManager;
  private ssrfGuard: SSRFGuard;
  private networkShield: NetworkShield;
  private snapshotService: PageSnapshotService;
  private structuredExtractor: StructuredExtractor;
  private metadataExtractor: MetadataExtractor;
  private hitlBreaker: HITLCircuitBreaker;
  private config: BrowserConfig;

  constructor(context: BrowserContext, page: Page, config: BrowserConfig = {}) {
    this.context = context;
    this.config = config;
    this.ssrfGuard = new SSRFGuard(config.allowedDomains || [], config.blockPrivateIPs !== false);
    this.networkShield = new NetworkShield(config.networkShield);
    this.networkShield.attachToPage(page).catch(() => {});
    this.tabManager = new TabManager(context, page, this.ssrfGuard, config.stealth !== false, this.networkShield);
    this.snapshotService = new PageSnapshotService();
    this.structuredExtractor = new StructuredExtractor();
    this.metadataExtractor = new MetadataExtractor();
    this.hitlBreaker = new HITLCircuitBreaker(config.hitl);
  }

  public get page(): Page {
    return this.tabManager.getActivePage();
  }

  public async navigate(url: string): Promise<PagePerception> {
    // 0. HITL Circuit breaker check
    this.hitlBreaker.assertCanExecute('navigate');

    // 1. SSRF Guard verification
    const securityCheck = this.ssrfGuard.validateUrl(url);
    if (!securityCheck.safe) {
      throw new Error(`SSRF Security Violation: ${securityCheck.violations.join('; ')}`);
    }

    // 2. Navigation
    await this.page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: this.config.timeout || 30000,
    });

    // 3. Optional auto-break on bot challenge / 2FA
    if (this.config.hitl?.autoBreakOnCaptcha) {
      const captcha = await this.detectCaptcha();
      if (captcha.detected) {
        let screenshotBase64: string | undefined;
        try {
          const buf = await this.screenshot();
          screenshotBase64 = buf.toString('base64');
        } catch {}
        this.hitlBreaker.trip({
          type: captcha.type || 'generic_challenge',
          url,
          message: captcha.message || 'Captcha or verification challenge barrier detected.',
          screenshotBase64,
        }).catch(() => {});
      }
    }

    // 4. Capture AI-optimized perception snapshot
    return this.getPerception();
  }

  public async setContent(html: string): Promise<PagePerception> {
    await this.page.setContent(html, { waitUntil: 'domcontentloaded' });
    return this.getPerception();
  }

  public async getPerception(): Promise<PagePerception> {
    const perception = await this.snapshotService.capturePageSnapshot(this.page);
    perception.tabId = this.tabManager.getActiveTabId();
    perception.activeTabs = await this.tabManager.listTabs();
    return perception;
  }

  public async createTab(url?: string): Promise<{ tabId: string; perception?: PagePerception }> {
    const { tabId } = await this.tabManager.createTab(url);
    let perception: PagePerception | undefined;
    if (url) {
      // Temporarily switch or take snapshot of new tab
      const currentActive = this.tabManager.getActiveTabId();
      await this.tabManager.switchTab(tabId);
      perception = await this.getPerception();
      // restore if needed, or leave active
    }
    return { tabId, perception };
  }

  public async switchTab(tabId: string): Promise<TabSwitchResult> {
    const previousTabId = this.tabManager.getActiveTabId();
    await this.tabManager.switchTab(tabId);
    const perception = await this.getPerception();
    return {
      previousTabId,
      currentTabId: tabId,
      perception,
    };
  }

  public async closeTab(tabId: string): Promise<TabCloseResult> {
    return this.tabManager.closeTab(tabId);
  }

  public async listTabs(): Promise<TabInfo[]> {
    return this.tabManager.listTabs();
  }

  public getActiveTabId(): string {
    return this.tabManager.getActiveTabId();
  }

  public async click(ref: string): Promise<ActionResult> {
    const urlBefore = this.page.url();
    let titleBefore = '';
    try { titleBefore = await this.page.title(); } catch {}

    try {
      this.hitlBreaker.assertCanExecute('click');
      const before = await this.getPerception();
      await ActionExecutor.click(this.page, ref);
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      await this.page.waitForTimeout(500); // brief wait for reactive mutations
      const after = await this.getPerception();

      const diffSummary = StateDiff.computeSummary(before, after);

      return {
        success: true,
        action: 'click',
        targetRef: ref,
        message: `Successfully clicked element ${ref}.`,
        urlBefore,
        urlAfter: this.page.url(),
        titleBefore,
        titleAfter: await this.page.title(),
        diffSummary,
      };
    } catch (err: any) {
      return {
        success: false,
        action: 'click',
        targetRef: ref,
        message: `Failed to click element ${ref}: ${err.message}`,
        urlBefore,
        urlAfter: this.page.url(),
        titleBefore,
        titleAfter: await this.page.title(),
        error: err.message,
      };
    }
  }

  public async fill(ref: string, text: string): Promise<ActionResult> {
    const urlBefore = this.page.url();
    let titleBefore = '';
    try { titleBefore = await this.page.title(); } catch {}

    try {
      this.hitlBreaker.assertCanExecute('fill');
      const before = await this.getPerception();
      await ActionExecutor.fill(this.page, ref, text);
      const after = await this.getPerception();
      const diffSummary = StateDiff.computeSummary(before, after);

      return {
        success: true,
        action: 'fill',
        targetRef: ref,
        message: `Successfully filled element ${ref} with provided text.`,
        urlBefore,
        urlAfter: this.page.url(),
        titleBefore,
        titleAfter: await this.page.title(),
        diffSummary,
      };
    } catch (err: any) {
      return {
        success: false,
        action: 'fill',
        targetRef: ref,
        message: `Failed to fill element ${ref}: ${err.message}`,
        urlBefore,
        urlAfter: this.page.url(),
        titleBefore,
        titleAfter: await this.page.title(),
        error: err.message,
      };
    }
  }

  public async scroll(direction: 'down' | 'up' | 'top' | 'bottom'): Promise<ActionResult> {
    const urlBefore = this.page.url();
    let titleBefore = '';
    try { titleBefore = await this.page.title(); } catch {}

    try {
      this.hitlBreaker.assertCanExecute(`scroll_${direction}`);
      const before = await this.getPerception();
      await ActionExecutor.scroll(this.page, direction);
      await this.page.waitForTimeout(300);
      const after = await this.getPerception();
      const diffSummary = StateDiff.computeSummary(before, after);

      return {
        success: true,
        action: `scroll_${direction}`,
        message: `Scrolled page ${direction}.`,
        urlBefore,
        urlAfter: urlBefore,
        titleBefore,
        titleAfter: await this.page.title(),
        diffSummary,
      };
    } catch (err: any) {
      return {
        success: false,
        action: `scroll_${direction}`,
        message: `Failed to scroll: ${err.message}`,
        urlBefore,
        urlAfter: urlBefore,
        titleBefore,
        titleAfter: titleBefore,
        error: err.message,
      };
    }
  }

  public async getVisualSnapshot(options?: SOMOverlayOptions): Promise<VisualSnapshot> {
    // Ensure active page is annotated with refs first
    await this.getPerception();
    return SOMOverlayEngine.captureVisualSnapshot(this.page, options);
  }

  public async clickCoordinate(x: number, y: number): Promise<ActionResult> {
    const urlBefore = this.page.url();
    let titleBefore = '';
    try { titleBefore = await this.page.title(); } catch {}

    try {
      this.hitlBreaker.assertCanExecute('click_coordinate');
      const before = await this.getPerception();
      await ActionExecutor.clickCoordinate(this.page, x, y);
      await this.page.waitForTimeout(500);
      const after = await this.getPerception();
      const diffSummary = StateDiff.computeSummary(before, after);

      return {
        success: true,
        action: 'click_coordinate',
        message: `Clicked at coordinates (${x}, ${y}).`,
        urlBefore,
        urlAfter: this.page.url(),
        titleBefore,
        titleAfter: await this.page.title(),
        diffSummary,
      };
    } catch (err: any) {
      return {
        success: false,
        action: 'click_coordinate',
        message: `Failed to click coordinates (${x}, ${y}): ${err.message}`,
        urlBefore,
        urlAfter: this.page.url(),
        titleBefore,
        titleAfter: titleBefore,
        error: err.message,
      };
    }
  }

  public async exportVault(filepath?: string): Promise<SessionVaultData> {
    const pages = this.context.pages();
    const vault = await SessionVault.exportVault(this.context, pages);
    if (filepath) {
      await SessionVault.saveToFile(filepath, vault);
    }
    return vault;
  }

  public async importVault(vaultOrPath: SessionVaultData | string): Promise<{ cookiesImported: number; originsInjected: number }> {
    let vaultData: SessionVaultData;
    if (typeof vaultOrPath === 'string') {
      vaultData = await SessionVault.loadFromFile(vaultOrPath);
    } else {
      vaultData = vaultOrPath;
    }
    return SessionVault.importVault(this.context, vaultData, this.page);
  }

  public async detectCaptcha(): Promise<CaptchaDetectionResult> {
    return CaptchaDetector.detect(this.page);
  }

  public async scrollOverlap(direction: 'down' | 'up', overlapRatio: number = 0.2): Promise<ActionResult> {
    const urlBefore = this.page.url();
    let titleBefore = '';
    try { titleBefore = await this.page.title(); } catch {}

    try {
      this.hitlBreaker.assertCanExecute(`scroll_overlap_${direction}`);
      const before = await this.getPerception();
      const distance = await ActionExecutor.scrollOverlap(this.page, direction, overlapRatio);
      await this.page.waitForTimeout(300);
      const after = await this.getPerception();
      const diffSummary = StateDiff.computeSummary(before, after);

      return {
        success: true,
        action: `scroll_overlap_${direction}`,
        message: `Scrolled ${direction} with 20% viewport overlap (${distance}px).`,
        urlBefore,
        urlAfter: urlBefore,
        titleBefore,
        titleAfter: await this.page.title(),
        diffSummary,
      };
    } catch (err: any) {
      return {
        success: false,
        action: `scroll_overlap_${direction}`,
        message: `Failed to scroll with overlap: ${err.message}`,
        urlBefore,
        urlAfter: urlBefore,
        titleBefore,
        titleAfter: titleBefore,
        error: err.message,
      };
    }
  }

  public getNetworkStats(): NetworkStats {
    return this.networkShield.getStats();
  }

  public configureNetworkShield(config: Partial<NetworkShieldConfig>): void {
    this.networkShield.updateConfig(config);
  }

  public async screenshot(): Promise<Buffer> {
    return this.page.screenshot({ fullPage: false });
  }

  public getRawPage(): Page {
    return this.page;
  }

  public async extractData<T = any>(
    schema: ExtractionSchema | Record<string, any>,
    options?: StructuredExtractorOptions
  ): Promise<ExtractionResult<T>> {
    const html = await this.page.content();
    return this.structuredExtractor.extract<T>(html, schema, options);
  }

  public async extractMetadata(): Promise<PageMetadata> {
    const html = await this.page.content();
    return this.metadataExtractor.extract(html);
  }

  public async extractFocusedContext(
    keywordsOrSelectors?: string[]
  ): Promise<{ markdown: string; tokensEstimated: number; tokensSavedRatio: number }> {
    const html = await this.page.content();
    return this.structuredExtractor.extractFocusedContext(html, keywordsOrSelectors);
  }

  public getCircuitBreaker(): HITLCircuitBreaker {
    return this.hitlBreaker;
  }

  public tripChallenge(params: {
    type: ChallengeType;
    url?: string;
    message?: string;
    screenshotBase64?: string;
    timeoutMs?: number;
    metadata?: Record<string, any>;
  }): Promise<ChallengeResolution> {
    const url = params.url || this.page.url();
    const resolutionPromise = this.hitlBreaker.trip({
      type: params.type,
      url,
      message: params.message || `HITL challenge tripped for ${params.type}.`,
      screenshotBase64: params.screenshotBase64,
      timeoutMs: params.timeoutMs,
      metadata: params.metadata,
    });

    if (!params.screenshotBase64) {
      this.screenshot()
        .then((buf) => {
          const active = this.hitlBreaker.getActiveChallenges();
          if (active.length > 0) {
            active[active.length - 1].screenshotBase64 = buf.toString('base64');
          }
        })
        .catch(() => {});
    }

    return resolutionPromise;
  }

  public resolveChallenge(challengeId: string, resolution: Partial<ChallengeResolution>): boolean {
    return this.hitlBreaker.resolve(challengeId, resolution);
  }

  public getActiveChallenges(): ChallengeEvent[] {
    return this.hitlBreaker.getActiveChallenges();
  }

  public configureHITL(config: Partial<HITLConfig>): void {
    this.hitlBreaker.updateConfig(config);
  }

  public async close(): Promise<void> {
    await this.context.close();
  }
}
