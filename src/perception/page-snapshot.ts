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
    // 1. Tag interactive elements directly in the live browser DOM with deterministic refs (@1, @2, ...)
    try {
      await page.evaluate((selector) => {
        // Clear previous refs to prevent stale tags across dynamic updates
        const oldMarked = document.querySelectorAll('[data-agent-ref]');
        oldMarked.forEach((el) => el.removeAttribute('data-agent-ref'));

        const nodes = document.querySelectorAll(selector);
        let count = 0;
        for (const node of nodes) {
          // Skip elements inside template, noscript, svg
          if (node.closest('template, noscript, svg')) {
            continue;
          }

          // Security checks: ignore hidden, zero-sized or adversarial offscreen elements
          if (node.hasAttribute('hidden') || node.getAttribute('aria-hidden') === 'true') {
            continue;
          }

          const inlineStyle = (node.getAttribute('style') || '').toLowerCase();
          if (
            inlineStyle.includes('display:none') ||
            inlineStyle.includes('display: none') ||
            inlineStyle.includes('visibility:hidden') ||
            inlineStyle.includes('visibility: hidden') ||
            inlineStyle.includes('opacity:0') ||
            inlineStyle.includes('opacity: 0') ||
            inlineStyle.includes('font-size:0') ||
            inlineStyle.includes('font-size: 0') ||
            /width:\s*0(px|%|em|rem)?/i.test(inlineStyle) ||
            /height:\s*0(px|%|em|rem)?/i.test(inlineStyle) ||
            /left:\s*-[0-9]{3,}px/i.test(inlineStyle) ||
            /top:\s*-[0-9]{3,}px/i.test(inlineStyle)
          ) {
            continue;
          }

          const compStyle = window.getComputedStyle(node);
          if (
            compStyle.display === 'none' ||
            compStyle.visibility === 'hidden' ||
            parseFloat(compStyle.opacity || '1') <= 0 ||
            compStyle.fontSize === '0px'
          ) {
            continue;
          }

          const tag = node.tagName.toLowerCase();
          const name =
            node.getAttribute('aria-label') ||
            node.getAttribute('placeholder') ||
            node.getAttribute('title') ||
            node.getAttribute('name');
          const text = (node.textContent || '').trim().replace(/\s+/g, ' ');

          // Ignore empty non-input elements with no label (matches ElementRegistry)
          if (!name && !text && tag !== 'input' && tag !== 'select' && tag !== 'textarea') {
            continue;
          }

          count++;
          node.setAttribute('data-agent-ref', `@${count}`);
        }
      }, ElementRegistry.INTERACTIVE_SELECTOR);
    } catch {
      // Ignore if page is in transition / destroyed
    }

    const rawHtml = await page.content();
    const url = page.url();
    const title = await page.title();

    // 2. Run security sanitization and prompt injection checks
    const guardResult = this.promptGuard.sanitizeAndAudit(rawHtml);

    // 3. Compress DOM and build interactive element registry
    const perception = this.compressor.compress(
      guardResult.sanitizedHtml,
      url,
      title,
      guardResult.detectedThreats
    );

    return perception;
  }
}
