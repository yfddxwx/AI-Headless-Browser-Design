import * as cheerio from 'cheerio';
import { ElementRegistry } from './element-registry.js';
import { PagePerception } from '../types/index.js';

export class DOMCompressor {
  private elementRegistry: ElementRegistry;

  constructor(elementRegistry?: ElementRegistry) {
    this.elementRegistry = elementRegistry || new ElementRegistry();
  }

  public compress(rawHtml: string, url: string = '', title: string = '', securityNotices: string[] = []): PagePerception {
    const rawHtmlLength = rawHtml.length;
    const $ = cheerio.load(rawHtml);

    // 1. Remove non-semantic tags, hidden elements, and closed dropdown popovers
    $('script, style, noscript, svg, canvas, template, link, meta, [hidden], [aria-hidden="true"]').remove();
    $('details:not([open]) > *:not(summary)').remove();
    $('[style*="display:none"], [style*="display: none"], [style*="visibility:hidden"]').remove();
    $('.SelectMenu, .select-menu-modal, .dropdown-menu').filter((_, el) => {
      return $(el).parents('details:not([open])').length > 0;
    }).remove();

    // 2. Scan and annotate interactive elements with references (@1, @2, ...)
    const interactiveElements = this.elementRegistry.registerFromCheerio($);

    // 3. Transform HTML structure into compact, agent-friendly Markdown
    const markdownLines: string[] = [];

    if (title) {
      markdownLines.push(`# ${title}\n`);
    }

    $('h1, h2, h3, h4, h5, h6, p, ul, ol, table, form, article, [data-agent-ref]').each((_, el) => {
      const $el = $(el);
      const tag = (el as any).tagName?.toLowerCase();
      const ref = $el.attr('data-agent-ref');

      // Check if this element is already handled by a parent container
      if ($el.parents('p, ul, ol, table, article, [data-agent-ref]').length > 0 && !ref) {
        return;
      }

      if (tag === 'article') {
        const titleText = $el.find('h1, h2, h3, h4, [class*="title"], [class*="repo"], a').first().text().trim().replace(/\s+/g, ' ');
        const descText = $el.find('p, [class*="desc"]').first().text().trim().replace(/\s+/g, ' ');
        const metaText = $el.find('[class*="meta"], [class*="stats"], [class*="footer"], span').not('[class*="desc"]').text().trim().replace(/\s+/g, ' ');
        if (titleText) {
          markdownLines.push(`### [Article/Item] ${titleText}`);
          if (descText) markdownLines.push(`> ${descText}`);
          if (metaText && metaText !== descText) markdownLines.push(`*Metadata:* ${metaText.slice(0, 150)}`);
        }
      } else if (tag === 'h1') {
        const text = $el.text().trim();
        if (text) markdownLines.push(`## ${text}`);
      } else if (tag === 'h2') {
        const text = $el.text().trim();
        if (text) markdownLines.push(`### ${text}`);
      } else if (tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6') {
        const text = $el.text().trim();
        if (text) markdownLines.push(`#### ${text}`);
      } else if (tag === 'p') {
        const text = $el.text().trim().replace(/\s+/g, ' ');
        if (text) markdownLines.push(text);
      } else if (tag === 'ul' || tag === 'ol') {
        const isNavHeader = $el.parents('header, nav, [role="navigation"], [role="banner"]').length > 0;
        let count = 0;
        $el.find('li').each((_, li) => {
          if (isNavHeader && count >= 5) return;
          const itemText = $(li).text().trim().replace(/\s+/g, ' ');
          if (itemText) {
            markdownLines.push(`- ${itemText}`);
            count++;
          }
        });
        if (isNavHeader && count >= 5) {
          markdownLines.push(`- ... (other navigation links compacted)`);
        }
      } else if (ref) {
        const item = this.elementRegistry.get(ref);
        if (item) {
          if (item.tag === 'a') {
            markdownLines.push(`[Link: ${item.text || item.name || '链接'}](${item.href || '#'}) {${item.ref}}`);
          } else if (item.tag === 'button' || item.role === 'button') {
            markdownLines.push(`[Button: ${item.text || item.name || '按钮'}] {${item.ref}}`);
          } else if (item.tag === 'input' || item.tag === 'textarea') {
            const desc = item.name ? ` "${item.name}"` : '';
            const val = item.value ? ` value="${item.value}"` : '';
            markdownLines.push(`[Input: ${item.type || 'text'}${desc}${val}] {${item.ref}}`);
          } else if (item.tag === 'select') {
            markdownLines.push(`[Select: ${item.name || '下拉选择框'}] {${item.ref}}`);
          }
        }
      }
    });

    const compressedMarkdown = markdownLines
      .filter((line, index, arr) => line !== '' || arr[index - 1] !== '') // remove duplicate empty lines
      .join('\n\n');

    const compressedLength = compressedMarkdown.length;
    const compressionRatio = rawHtmlLength > 0 
      ? Math.max(0, Math.min(100, Math.round((1 - compressedLength / rawHtmlLength) * 100))) 
      : 0;

    // Approximating token count (4 chars ~ 1 token)
    const tokensEstimated = Math.ceil(compressedLength / 4);

    return {
      url,
      title: title || $('title').text().trim(),
      compressedMarkdown,
      interactiveElements,
      rawHtmlLength,
      compressedLength,
      compressionRatio,
      tokensEstimated,
      securityNotice: securityNotices.length > 0 ? securityNotices : undefined,
    };
  }
}
