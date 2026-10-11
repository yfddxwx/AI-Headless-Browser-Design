import * as cheerio from 'cheerio';

export interface PromptGuardResult {
  sanitizedHtml: string;
  detectedThreats: string[];
  strippedHiddenElementsCount: number;
}

export class PromptGuard {
  // Common indirect prompt injection trigger patterns
  private static readonly INJECTION_PATTERNS: RegExp[] = [
    /\bignore\s+(all\s+)?(previous|prior|above)\s+instructions\b/i,
    /\bdisregard\s+(all\s+)?(previous|prior)\s+prompts?\b/i,
    /\byou\s+are\s+now\s+in\s+(developer|god|dan|unrestricted)\s+mode\b/i,
    /\bsystem\s+prompt\s+override\b/i,
    /\bnew\s+system\s+instruction\s*:\b/i,
    /\bdo\s+not\s+follow\s+safety\s+guidelines\b/i,
    /\bprint\s+(the\s+)?system\s+prompt\b/i,
  ];

  public sanitizeAndAudit(html: string): PromptGuardResult {
    const threats: string[] = [];
    let strippedCount = 0;

    const $ = cheerio.load(html);

    // 1. Remove dangerous executable or non-semantic tags
    $('script, style, noscript, iframe, frame, object, embed, applet').remove();

    // 2. Identify and remove hidden elements (often used for stealth prompt injection)
    $('*').each((_, el) => {
      const $el = $(el);
      const style = ($el.attr('style') || '').toLowerCase();
      const hiddenAttr = $el.attr('hidden');
      const ariaHidden = $el.attr('aria-hidden');

      const isHidden = 
        hiddenAttr !== undefined ||
        ariaHidden === 'true' ||
        style.includes('display:none') ||
        style.includes('display: none') ||
        style.includes('visibility:hidden') ||
        style.includes('visibility: hidden') ||
        style.includes('opacity:0') ||
        style.includes('opacity: 0') ||
        style.includes('font-size:0') ||
        style.includes('font-size: 0') ||
        /width:\s*0(px|%|em|rem)?/i.test(style) ||
        /height:\s*0(px|%|em|rem)?/i.test(style) ||
        /left:\s*-[0-9]{3,}px/i.test(style) ||
        /top:\s*-[0-9]{3,}px/i.test(style);

      if (isHidden) {
        const text = $el.text().trim();
        if (text.length > 0) {
          // Check if the hidden element contains injection attacks
          for (const pattern of PromptGuard.INJECTION_PATTERNS) {
            if (pattern.test(text)) {
              threats.push(`Hidden prompt injection pattern detected and stripped: "${text.slice(0, 100)}"`);
              break;
            }
          }
        }
        $el.remove();
        strippedCount++;
      }
    });

    // 3. Scan remaining visible text for overt prompt injection attempts
    const bodyText = $('body').text() || $.text();
    for (const pattern of PromptGuard.INJECTION_PATTERNS) {
      const match = bodyText.match(pattern);
      if (match) {
        threats.push(`Overt prompt injection trigger detected in visible content: "${match[0]}"`);
      }
    }

    return {
      sanitizedHtml: $.html(),
      detectedThreats: threats,
      strippedHiddenElementsCount: strippedCount,
    };
  }
}
