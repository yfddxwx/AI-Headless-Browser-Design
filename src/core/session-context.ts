import { BrowserContext, Page } from 'playwright';
import { SSRFGuard } from '../security/ssrf-guard.js';
import { PageSnapshotService } from '../perception/page-snapshot.js';
import { ActionExecutor } from '../action/action-executor.js';
import { StateDiff } from '../action/state-diff.js';
import { ActionResult, BrowserConfig, PagePerception, VisualSnapshot, TabInfo, TabSwitchResult, TabCloseResult } from '../types/index.js';
import { SOMOverlayEngine, SOMOverlayOptions } from '../perception/som-overlay.js';
import { TabManager } from './tab-manager.js';

export class SessionContext {
  private context: BrowserContext;
  private tabManager: TabManager;
  private ssrfGuard: SSRFGuard;
  private snapshotService: PageSnapshotService;
  private config: BrowserConfig;

  constructor(context: BrowserContext, page: Page, config: BrowserConfig = {}) {
    this.context = context;
    this.config = config;
    this.ssrfGuard = new SSRFGuard(config.allowedDomains || [], config.blockPrivateIPs !== false);
    this.tabManager = new TabManager(context, page, this.ssrfGuard, config.stealth !== false);
    this.snapshotService = new PageSnapshotService();
  }

  public get page(): Page {
    return this.tabManager.getActivePage();
  }

  public async navigate(url: string): Promise<PagePerception> {
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

    // 3. Capture AI-optimized perception snapshot
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
    const before = await this.getPerception();
    const urlBefore = this.page.url();
    const titleBefore = await this.page.title();

    try {
      await ActionExecutor.click(this.page, ref);
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
    const before = await this.getPerception();
    const urlBefore = this.page.url();
    const titleBefore = await this.page.title();

    try {
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
    const before = await this.getPerception();
    const urlBefore = this.page.url();
    const titleBefore = await this.page.title();

    try {
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
    const before = await this.getPerception();
    const urlBefore = this.page.url();
    const titleBefore = await this.page.title();

    try {
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

  public async screenshot(): Promise<Buffer> {
    return this.page.screenshot({ fullPage: false });
  }

  public getRawPage(): Page {
    return this.page;
  }

  public async close(): Promise<void> {
    await this.context.close();
  }
}
