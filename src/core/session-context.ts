import { BrowserContext, Page } from 'playwright';
import { SSRFGuard } from '../security/ssrf-guard.js';
import { PageSnapshotService } from '../perception/page-snapshot.js';
import { ActionExecutor } from '../action/action-executor.js';
import { StateDiff } from '../action/state-diff.js';
import { ActionResult, BrowserConfig, PagePerception } from '../types/index.js';

export class SessionContext {
  private context: BrowserContext;
  private page: Page;
  private ssrfGuard: SSRFGuard;
  private snapshotService: PageSnapshotService;
  private config: BrowserConfig;

  constructor(context: BrowserContext, page: Page, config: BrowserConfig = {}) {
    this.context = context;
    this.page = page;
    this.config = config;
    this.ssrfGuard = new SSRFGuard(config.allowedDomains || [], config.blockPrivateIPs !== false);
    this.snapshotService = new PageSnapshotService();
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
    return this.snapshotService.capturePageSnapshot(this.page);
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
