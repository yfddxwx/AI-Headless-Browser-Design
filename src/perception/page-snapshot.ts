import { Page } from 'playwright';
import { DOMCompressor } from './dom-compressor.js';
import { ElementRegistry } from './element-registry.js';
import { PromptGuard } from '../security/prompt-guard.js';
import { PagePerception } from '../types/index.js';

export class PageSnapshotService {
  private compressor: DOMCompressor;
  private promptGuard: PromptGuard;
  private registry: ElementRegistry;

  constructor() {
    this.registry = new ElementRegistry();
    this.compressor = new DOMCompressor(this.registry);
    this.promptGuard = new PromptGuard();
  }

  public async capturePageSnapshot(page: Page): Promise<PagePerception> {
    const rawHtml = await page.content();
    const url = page.url();
    const title = await page.title();

    // 1. Run security sanitization and prompt injection checks
    const guardResult = this.promptGuard.sanitizeAndAudit(rawHtml);

    // 2. Compress DOM and build interactive element registry
    const perception = this.compressor.compress(
      guardResult.sanitizedHtml,
      url,
      title,
      guardResult.detectedThreats
    );

    // 3. Inject data-agent-ref into the live browser DOM to enable deterministic actions by ref
    await page.evaluate((elements) => {
      for (const el of elements) {
        try {
          if (el.selector && el.selector.startsWith('#')) {
            const found = document.querySelector(el.selector);
            if (found) {
              found.setAttribute('data-agent-ref', el.ref);
            }
          }
        } catch {
          // ignore selector errors
        }
      }
    }, perception.interactiveElements);

    return perception;
  }
}
