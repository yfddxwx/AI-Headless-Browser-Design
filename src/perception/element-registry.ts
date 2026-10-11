import * as cheerio from 'cheerio';
import { InteractiveElement } from '../types/index.js';

export class ElementRegistry {
  private elements: Map<string, InteractiveElement> = new Map();
  private counter: number = 0;

  public clear(): void {
    this.elements.clear();
    this.counter = 0;
  }

  /**
   * Scans a cheerio root and attaches data-agent-ref attributes,
   * returning an array of interactive elements with unique references.
   */
  public registerFromCheerio($: cheerio.CheerioAPI): InteractiveElement[] {
    this.clear();
    const result: InteractiveElement[] = [];

    // Interactive element selectors
    const interactiveSelector = [
      'a[href]',
      'button',
      'input',
      'select',
      'textarea',
      '[role="button"]',
      '[role="link"]',
      '[role="checkbox"]',
      '[role="combobox"]',
      '[role="searchbox"]',
      '[role="menuitem"]',
      '[role="tab"]',
      '[tabindex="0"]',
    ].join(', ');

    $(interactiveSelector).each((_, el) => {
      const $el = $(el);

      // Check if disabled
      const disabled = $el.is(':disabled') || $el.attr('aria-disabled') === 'true';

      const tag = (el as any).tagName?.toLowerCase() || '';
      const role = $el.attr('role');
      const href = $el.attr('href');
      const type = $el.attr('type') || (tag === 'textarea' ? 'textarea' : undefined);
      const value = $el.val()?.toString() || $el.attr('value');

      // Resolve human-readable name or label
      const name = 
        $el.attr('aria-label') ||
        $el.attr('placeholder') ||
        $el.attr('title') ||
        $el.attr('name') ||
        undefined;

      const text = $el.text().trim().replace(/\s+/g, ' ');

      // Ignore empty non-input elements with no label
      if (!name && !text && tag !== 'input' && tag !== 'select' && tag !== 'textarea') {
        return;
      }

      this.counter++;
      const ref = `@${this.counter}`;

      // Build CSS selector or ref locator
      const id = $el.attr('id');
      const selector = id ? `#${id}` : `[data-agent-ref="${ref}"]`;

      // Inject data-agent-ref into the DOM for downstream execution
      $el.attr('data-agent-ref', ref);

      const item: InteractiveElement = {
        ref,
        tag,
        role,
        name,
        text: text.slice(0, 100), // cap text length to keep it concise
        value,
        href,
        type,
        disabled,
        selector,
      };

      this.elements.set(ref, item);
      result.push(item);
    });

    return result;
  }

  public get(ref: string): InteractiveElement | undefined {
    return this.elements.get(ref);
  }

  public getAll(): InteractiveElement[] {
    return Array.from(this.elements.values());
  }
}
