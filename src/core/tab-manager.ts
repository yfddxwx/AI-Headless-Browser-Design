import { BrowserContext, Page } from 'playwright';
import { TabInfo, TabCloseResult } from '../types/index.js';
import { SSRFGuard } from '../security/ssrf-guard.js';
import { STEALTH_SCRIPT } from './stealth.js';

interface TabEntry {
  page: Page;
  info: TabInfo;
}

export class TabManager {
  private context: BrowserContext;
  private tabs: Map<string, TabEntry> = new Map();
  private activeTabId: string = '';
  private tabCounter: number = 0;
  private ssrfGuard: SSRFGuard;
  private stealth: boolean;

  constructor(context: BrowserContext, initialPage: Page, ssrfGuard: SSRFGuard, stealth: boolean = true) {
    this.context = context;
    this.ssrfGuard = ssrfGuard;
    this.stealth = stealth;

    // Register initial page as tab-1
    this.tabCounter++;
    const initialTabId = `tab-${this.tabCounter}`;
    this.tabs.set(initialTabId, {
      page: initialPage,
      info: {
        tabId: initialTabId,
        url: initialPage.url(),
        title: 'Initial Tab',
        isActive: true,
        createdAt: Date.now(),
      },
    });
    this.activeTabId = initialTabId;

    this.setupPageListener();
  }

  private setupPageListener(): void {
    this.context.on('page', async (newPage: Page) => {
      // Check if page already registered
      for (const entry of this.tabs.values()) {
        if (entry.page === newPage) return;
      }

      this.tabCounter++;
      const newTabId = `tab-${this.tabCounter}`;
      const openerId = this.activeTabId;

      if (this.stealth) {
        try {
          await newPage.addInitScript(STEALTH_SCRIPT);
        } catch {
          // ignore if already navigating
        }
      }

      // Check SSRF on navigation
      newPage.on('framenavigated', (frame) => {
        if (frame === newPage.mainFrame()) {
          const targetUrl = frame.url();
          if (targetUrl && targetUrl !== 'about:blank') {
            const check = this.ssrfGuard.validateUrl(targetUrl);
            if (!check.safe) {
              newPage.close().catch(() => {});
            }
          }
        }
      });

      this.tabs.set(newTabId, {
        page: newPage,
        info: {
          tabId: newTabId,
          url: newPage.url(),
          title: 'New Popup Tab',
          isActive: false,
          openerTabId: openerId,
          createdAt: Date.now(),
        },
      });

      // Handle spontaneous closing
      newPage.on('close', () => {
        this.tabs.delete(newTabId);
        if (this.activeTabId === newTabId) {
          const firstKey = this.tabs.keys().next().value;
          if (firstKey) {
            this.activeTabId = firstKey;
            this.tabs.get(firstKey)!.info.isActive = true;
          }
        }
      });
    });
  }

  public async createTab(url?: string): Promise<{ tabId: string; page: Page }> {
    if (url) {
      const check = this.ssrfGuard.validateUrl(url);
      if (!check.safe) {
        throw new Error(`SSRF Security Violation: ${check.violations.join('; ')}`);
      }
    }

    const newPage = await this.context.newPage();
    if (this.stealth) {
      await newPage.addInitScript(STEALTH_SCRIPT);
    }

    if (url) {
      await newPage.goto(url, { waitUntil: 'domcontentloaded' });
    }

    // Check if context.on('page') listener has already registered this page
    for (const [id, entry] of this.tabs.entries()) {
      if (entry.page === newPage) {
        if (url) {
          entry.info.url = newPage.url();
          entry.info.title = await newPage.title().catch(() => 'New Tab');
        }
        return { tabId: id, page: newPage };
      }
    }

    this.tabCounter++;
    const tabId = `tab-${this.tabCounter}`;
    const title = await newPage.title().catch(() => 'New Tab');

    this.tabs.set(tabId, {
      page: newPage,
      info: {
        tabId,
        url: newPage.url(),
        title: title || 'New Tab',
        isActive: false,
        openerTabId: this.activeTabId,
        createdAt: Date.now(),
      },
    });

    return { tabId, page: newPage };
  }

  public async switchTab(tabId: string): Promise<Page> {
    const entry = this.tabs.get(tabId);
    if (!entry) {
      throw new Error(`Tab "${tabId}" does not exist. Available tabs: ${Array.from(this.tabs.keys()).join(', ')}`);
    }

    // Update active states
    for (const [id, t] of this.tabs.entries()) {
      t.info.isActive = (id === tabId);
    }

    this.activeTabId = tabId;
    await entry.page.bringToFront().catch(() => {});
    return entry.page;
  }

  public async closeTab(tabId: string): Promise<TabCloseResult> {
    const entry = this.tabs.get(tabId);
    if (!entry) {
      throw new Error(`Tab "${tabId}" not found.`);
    }

    if (this.tabs.size <= 1) {
      throw new Error(`Cannot close the last remaining tab (${tabId}).`);
    }

    await entry.page.close().catch(() => {});
    this.tabs.delete(tabId);

    // If active tab was closed, switch to the most recently created remaining tab
    if (this.activeTabId === tabId) {
      const remainingKeys = Array.from(this.tabs.keys());
      this.activeTabId = remainingKeys[remainingKeys.length - 1];
      this.tabs.get(this.activeTabId)!.info.isActive = true;
    }

    const remainingTabs = await this.listTabs();

    return {
      closedTabId: tabId,
      activeTabId: this.activeTabId,
      remainingTabs,
    };
  }

  public async listTabs(): Promise<TabInfo[]> {
    const result: TabInfo[] = [];
    for (const [id, entry] of this.tabs.entries()) {
      let currentUrl = entry.page.url();
      let currentTitle = '';
      try {
        currentTitle = await entry.page.title();
      } catch {
        currentTitle = entry.info.title;
      }

      entry.info.url = currentUrl;
      entry.info.title = currentTitle || 'Untitled Tab';
      entry.info.isActive = (id === this.activeTabId);
      result.push({ ...entry.info });
    }
    return result;
  }

  public getActivePage(): Page {
    const entry = this.tabs.get(this.activeTabId);
    if (!entry) {
      throw new Error('No active page in TabManager.');
    }
    return entry.page;
  }

  public getActiveTabId(): string {
    return this.activeTabId;
  }

  public getTabCount(): number {
    return this.tabs.size;
  }
}
