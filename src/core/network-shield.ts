import { Page, Route, Request } from 'playwright';
import { NetworkShieldConfig, NetworkStats } from '../types/index.js';

export class NetworkShield {
  private static readonly DEFAULT_TRACKING_HOSTS = [
    'google-analytics.com',
    'googletagmanager.com',
    'doubleclick.net',
    'analytics.google.com',
    'facebook.net',
    'connect.facebook.net',
    'clarity.ms',
    'hotjar.com',
    'mixpanel.com',
    'segment.io',
    'sentry.io',
    'sentry-cdn.com',
    'adservice.google.com',
    'scorecardresearch.com',
    'quantserve.com',
  ];

  private config: NetworkShieldConfig;
  private totalRequests: number = 0;
  private blockedRequests: number = 0;
  private blockedResources: string[] = [];

  constructor(config: NetworkShieldConfig = {}) {
    this.config = {
      enabled: true,
      blockAnalytics: true,
      blockMedia: false, // Default false to allow visual screenshots
      blockFonts: false,
      ...config,
    };
  }

  public shouldBlock(url: string, resourceType: string): boolean {
    if (!this.config.enabled) {
      return false;
    }

    // 1. Check resource types
    if (this.config.blockMedia && (resourceType === 'image' || resourceType === 'media')) {
      return true;
    }

    if (this.config.blockFonts && resourceType === 'font') {
      return true;
    }

    // 2. Check tracking & analytics hosts
    if (this.config.blockAnalytics) {
      try {
        const hostname = new URL(url).hostname.toLowerCase();
        for (const host of NetworkShield.DEFAULT_TRACKING_HOSTS) {
          if (hostname === host || hostname.endsWith(`.${host}`)) {
            return true;
          }
        }
      } catch {
        // invalid URL
      }
    }

    // 3. Check custom blocked patterns
    if (this.config.customBlockedPatterns && this.config.customBlockedPatterns.length > 0) {
      for (const pattern of this.config.customBlockedPatterns) {
        if (url.includes(pattern)) {
          return true;
        }
      }
    }

    return false;
  }

  public async attachToPage(page: Page): Promise<void> {
    await page.route('**/*', (route: Route, request: Request) => {
      this.totalRequests++;
      const url = request.url();
      const resourceType = request.resourceType();

      if (this.shouldBlock(url, resourceType)) {
        this.blockedRequests++;
        if (this.blockedResources.length < 50) {
          this.blockedResources.push(`[${resourceType}] ${url.slice(0, 100)}`);
        }
        route.abort().catch(() => {});
      } else {
        route.continue().catch(() => {});
      }
    });
  }

  public getStats(): NetworkStats {
    return {
      totalRequests: this.totalRequests,
      blockedRequests: this.blockedRequests,
      blockedResources: [...this.blockedResources],
    };
  }

  public resetStats(): void {
    this.totalRequests = 0;
    this.blockedRequests = 0;
    this.blockedResources = [];
  }

  public updateConfig(newConfig: Partial<NetworkShieldConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}
