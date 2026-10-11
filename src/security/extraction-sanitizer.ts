export interface SanitizationResult<T = any> {
  sanitizedData: T;
  securityNotices: string[];
  threatsDetectedCount: number;
}

export class ExtractionSanitizer {
  private static readonly INJECTION_PATTERNS: RegExp[] = [
    /\bignore\s+(all\s+)?(previous|prior|above)\s+instructions\b/i,
    /\bdisregard\s+(all\s+)?(previous|prior)\s+prompts?\b/i,
    /\bforget\s+(all\s+)?(previous|prior)\s+instructions\b/i,
    /\byou\s+are\s+now\s+in\s+(developer|god|dan|unrestricted)\s+mode\b/i,
    /\bsystem\s+prompt\s+override\b/i,
    /\bnew\s+system\s+instruction\s*:\b/i,
    /\bdo\s+not\s+follow\s+safety\s+guidelines\b/i,
    /\bprint\s+(the\s+)?system\s+prompt\b/i,
    /\bjailbreak\b/i,
    /\bdelete\s+all\s+files\b/i,
  ];

  private static readonly DANGEROUS_TAGS_REGEX = /<\s*(script|iframe|object|embed|applet|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>|<\s*(script|iframe|object|embed|applet|style)[^>]*\/?>/gi;
  private static readonly DANGEROUS_URI_REGEX = /^\s*(javascript:|data:text\/html|vbscript:)/i;

  public sanitize<T>(data: T, maxDepth: number = 10): SanitizationResult<T> {
    const securityNotices: string[] = [];
    let threatsDetectedCount = 0;

    const sanitizeValue = (val: any, currentDepth: number, path: string): any => {
      if (currentDepth > maxDepth) {
        return null;
      }

      if (val === null || val === undefined) {
        return val;
      }

      if (typeof val === 'string') {
        let clean = val;

        // 1. Strip dangerous tags (XSS / execution)
        if (ExtractionSanitizer.DANGEROUS_TAGS_REGEX.test(clean)) {
          clean = clean.replace(ExtractionSanitizer.DANGEROUS_TAGS_REGEX, '');
          securityNotices.push(`Stripped dangerous HTML tag from field "${path}"`);
          threatsDetectedCount++;
        }

        // 2. Disarm dangerous URIs
        if (ExtractionSanitizer.DANGEROUS_URI_REGEX.test(clean)) {
          securityNotices.push(`Neutralized dangerous pseudo-protocol URI from field "${path}"`);
          threatsDetectedCount++;
          clean = '#blocked-dangerous-uri';
        }

        // 3. Scan for indirect prompt injection
        for (const pattern of ExtractionSanitizer.INJECTION_PATTERNS) {
          const match = clean.match(pattern);
          if (match) {
            securityNotices.push(`Prompt Injection pattern detected in field "${path}": "${match[0]}"`);
            threatsDetectedCount++;
            // Neutralize the injection pattern by inserting safety escaping
            clean = clean.replace(match[0], `[PROMPT_INJECTION_CONTAINED: ${match[0]}]`);
          }
        }

        return clean;
      }

      if (typeof val === 'number' || typeof val === 'boolean') {
        return val;
      }

      if (Array.isArray(val)) {
        return val.map((item, index) => sanitizeValue(item, currentDepth + 1, `${path}[${index}]`));
      }

      if (typeof val === 'object') {
        const cleanObj: Record<string, any> = {};
        for (const key of Object.keys(val)) {
          // Prototype pollution defense
          if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
            securityNotices.push(`Blocked prototype pollution attempt on key "${key}" at "${path}"`);
            threatsDetectedCount++;
            continue;
          }

          cleanObj[key] = sanitizeValue(val[key], currentDepth + 1, path ? `${path}.${key}` : key);
        }
        return cleanObj;
      }

      return val;
    };

    const sanitizedData = sanitizeValue(data, 0, 'root');

    return {
      sanitizedData,
      securityNotices,
      threatsDetectedCount,
    };
  }
}
