import * as cheerio from 'cheerio';
import { ExtractionResult, ExtractionSchema, StructuredExtractorOptions, PageMetadata } from '../types/index.js';
import { MetadataExtractor } from './metadata-extractor.js';
import { ExtractionSanitizer } from '../security/extraction-sanitizer.js';

export class StructuredExtractor {
  private metadataExtractor: MetadataExtractor;
  private sanitizer: ExtractionSanitizer;

  constructor() {
    this.metadataExtractor = new MetadataExtractor();
    this.sanitizer = new ExtractionSanitizer();
  }

  public extract<T = any>(
    html: string,
    schema: ExtractionSchema | Record<string, any>,
    options: StructuredExtractorOptions = {}
  ): ExtractionResult<T> {
    const rawLength = html.length;
    const metadata = this.metadataExtractor.extract(html);
    const warnings: string[] = [];

    // Normalized schema properties and target type
    const isArraySchema =
      schema.type === 'array' ||
      Array.isArray(schema.items) ||
      (schema.items && typeof schema.items === 'object') ||
      Array.isArray(schema);

    // 1. Attempt JSON-LD matching first if preferMetadata is not false
    if (options.preferMetadata !== false && metadata.jsonLd && metadata.jsonLd.length > 0) {
      const jsonLdMatch = this.tryMatchJsonLd(metadata.jsonLd, schema, isArraySchema);
      if (jsonLdMatch) {
        return this.finalizeResult(jsonLdMatch as T, 'json-ld', 0.95, metadata, rawLength, options);
      }
    }

    const $ = cheerio.load(html);

    // Clean non-semantic script/style tags except what's needed
    $('script, style, noscript').remove();

    // 2. Table extraction if array schema
    if (isArraySchema) {
      const tableMatch = this.tryExtractFromTables($, schema, options);
      if (tableMatch && tableMatch.length > 0) {
        return this.finalizeResult(tableMatch as unknown as T, 'semantic-table', 0.9, metadata, rawLength, options);
      }

      // 3. Repeating Card / Container clustering
      const cardMatch = this.tryExtractRepeatingCards($, schema, options);
      if (cardMatch && cardMatch.length > 0) {
        return this.finalizeResult(cardMatch as unknown as T, 'semantic-card', 0.85, metadata, rawLength, options);
      }
    } else {
      // Single object extraction
      const singleMatch = this.tryExtractSingleObject($, schema, metadata);
      if (singleMatch && Object.keys(singleMatch).length > 0) {
        return this.finalizeResult(singleMatch as unknown as T, 'heuristic', 0.8, metadata, rawLength, options);
      }
    }

    // Fallback: empty structure conforming to schema
    const fallbackData = (isArraySchema ? [] : {}) as unknown as T;
    warnings.push('Could not find high-confidence semantic structures matching schema on page.');
    return this.finalizeResult(fallbackData, 'heuristic', 0.2, metadata, rawLength, options, warnings);
  }

  public extractFocusedContext(
    html: string,
    keywordsOrSelectors?: string[]
  ): { markdown: string; tokensEstimated: number; tokensSavedRatio: number } {
    const rawLength = html.length;
    const $ = cheerio.load(html);

    // Remove noise elements
    $('header, footer, nav, aside, [role="navigation"], [role="banner"], script, style, noscript, svg').remove();

    const selectedElements: string[] = [];

    if (keywordsOrSelectors && keywordsOrSelectors.length > 0) {
      for (const query of keywordsOrSelectors) {
        try {
          $(query).each((_, el) => {
            selectedElements.push($(el).text().trim());
          });
        } catch {
          // If query is not a valid CSS selector, treat as keyword search
          $(`*:contains("${query}")`).filter((_, el) => $(el).children().length === 0).each((_, el) => {
            const parent = $(el).parent();
            selectedElements.push(parent.text().trim());
          });
        }
      }
    }

    let extractedText = '';
    if (selectedElements.length > 0) {
      extractedText = Array.from(new Set(selectedElements)).join('\n\n');
    } else {
      // Main semantic content
      extractedText = $('main, article, [role="main"], table, ul, ol').text().trim().replace(/\s+/g, ' ');
      if (!extractedText) {
        extractedText = $('body').text().trim().replace(/\s+/g, ' ');
      }
    }

    const compressedLength = extractedText.length;
    const tokensEstimated = Math.ceil(compressedLength / 4);
    const tokensSavedRatio = rawLength > 0 ? Math.max(0, Math.min(1, 1 - compressedLength / rawLength)) : 0;

    return {
      markdown: extractedText,
      tokensEstimated,
      tokensSavedRatio: Math.round(tokensSavedRatio * 100) / 100,
    };
  }

  // Helper: Match schema against JSON-LD records
  private tryMatchJsonLd(jsonLdItems: any[], schema: any, isArray: boolean): any {
    const itemProps = isArray ? (schema.items?.properties || schema.items || {}) : (schema.properties || schema);
    const propKeys = Object.keys(itemProps).map(k => k.toLowerCase());

    if (isArray) {
      // Look for ItemList or array of nodes
      for (const item of jsonLdItems) {
        if (item['@type'] === 'ItemList' && Array.isArray(item.itemListElement)) {
          const matchedList = item.itemListElement.map((elem: any) => {
            const node = elem.item || elem;
            return this.mapObjectByKeys(node, itemProps);
          });
          if (matchedList.length > 0) return matchedList;
        }
      }

      // Check if jsonLdItems has multiple items matching properties
      const matchingItems = jsonLdItems
        .filter(item => typeof item === 'object' && item !== null)
        .map(item => this.mapObjectByKeys(item, itemProps))
        .filter(obj => Object.keys(obj).length >= Math.min(2, propKeys.length));

      if (matchingItems.length > 1) {
        return matchingItems;
      }
    } else {
      // Single object match
      for (const item of jsonLdItems) {
        if (typeof item === 'object' && item !== null) {
          const mapped = this.mapObjectByKeys(item, itemProps);
          if (Object.keys(mapped).length >= Math.max(1, Math.floor(propKeys.length * 0.5))) {
            return mapped;
          }
        }
      }
    }

    return null;
  }

  // Helper: map JSON-LD or raw object to schema keys
  private mapObjectByKeys(source: Record<string, any>, targetProps: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    const sourceKeys = Object.keys(source);

    for (const [targetKey, fieldDef] of Object.entries(targetProps)) {
      const lowerTarget = targetKey.toLowerCase();
      // Direct or fuzzy key lookup
      const foundSourceKey = sourceKeys.find(sk => {
        const lowerSource = sk.toLowerCase().replace(/[^a-z0-9]/g, '');
        return lowerSource === lowerTarget || lowerSource.includes(lowerTarget) || lowerTarget.includes(lowerSource);
      });

      if (foundSourceKey && source[foundSourceKey] !== undefined) {
        const expectedType = typeof fieldDef === 'string' ? fieldDef : (fieldDef.type || 'string');
        result[targetKey] = this.coerceType(source[foundSourceKey], expectedType);
      }
    }

    return result;
  }

  // Helper: Table extraction
  private tryExtractFromTables($: cheerio.CheerioAPI, schema: any, options: StructuredExtractorOptions): any[] | null {
    const itemProps = schema.items?.properties || schema.items || schema.properties || {};
    const propKeys = Object.keys(itemProps);
    if (propKeys.length === 0) return null;

    const results: any[] = [];

    $('table').each((_, table) => {
      const $table = $(table);
      const headers: string[] = [];

      $table.find('thead th, tr:first-child th, tr:first-child td').each((_, th) => {
        headers.push($(th).text().trim().toLowerCase());
      });

      if (headers.length === 0) return;

      // Find matching column indices for each target property
      const columnMapping: Record<string, number> = {};
      for (const prop of propKeys) {
        const lowerProp = prop.toLowerCase();
        const colIdx = headers.findIndex(h => h.includes(lowerProp) || lowerProp.includes(h));
        if (colIdx !== -1) {
          columnMapping[prop] = colIdx;
        }
      }

      // If at least one column matched
      if (Object.keys(columnMapping).length > 0) {
        const rows = $table.find('tbody tr').length > 0 ? $table.find('tbody tr') : $table.find('tr').slice(1);
        rows.each((_, tr) => {
          if (options.maxItems && results.length >= options.maxItems) return false;
          const $cells = $(tr).find('td');
          if ($cells.length === 0) return;

          const rowData: Record<string, any> = {};
          for (const [prop, colIdx] of Object.entries(columnMapping)) {
            const cellText = $cells.eq(colIdx).text().trim();
            const expectedType = typeof itemProps[prop] === 'string' ? itemProps[prop] : (itemProps[prop]?.type || 'string');
            rowData[prop] = this.coerceType(cellText, expectedType);
          }

          if (Object.values(rowData).some(v => v !== undefined && v !== '')) {
            results.push(rowData);
          }
        });
      }
    });

    return results.length > 0 ? results : null;
  }

  // Helper: Repeating Card / Container clustering
  private tryExtractRepeatingCards($: cheerio.CheerioAPI, schema: any, options: StructuredExtractorOptions): any[] | null {
    const itemProps = schema.items?.properties || schema.items || schema.properties || {};
    const propKeys = Object.keys(itemProps);
    if (propKeys.length === 0) return null;

    const results: any[] = [];
    const containerSelector = options.containerSelector ||
      'article, [class*="product-card"], [class*="card"], [class*="item"], [data-testid*="item"], [data-testid*="product"], li:has(h2, h3, h4, a), tr:has(td)';

    const $containers = $(containerSelector);
    if ($containers.length >= 2) {
      $containers.each((_, container) => {
        if (options.maxItems && results.length >= options.maxItems) return false;
        const $card = $(container);
        const itemData: Record<string, any> = {};

        for (const [prop, fieldDef] of Object.entries(itemProps)) {
          const expectedType = typeof fieldDef === 'string' ? fieldDef : ((fieldDef as any)?.type || 'string');
          const value = this.extractFieldValueFromCard($, $card, prop, expectedType);
          if (value !== undefined) {
            itemData[prop] = value;
          }
        }

        if (Object.keys(itemData).length >= Math.min(1, propKeys.length)) {
          results.push(itemData);
        }
      });
    }

    return results.length > 0 ? results : null;
  }

  // Helper: Extract field value from a single card container
  private extractFieldValueFromCard($: cheerio.CheerioAPI, $card: cheerio.Cheerio<any>, prop: string, expectedType: string): any {
    const lower = prop.toLowerCase();

    // 1. Selector hint if prop is attribute-based or itemprop
    const itempropVal = $card.find(`[itemprop="${prop}"], [itemprop="${lower}"]`).first().text().trim();
    if (itempropVal) return this.coerceType(itempropVal, expectedType);

    const dataAttrVal = $card.find(`[data-${lower}]`).first().attr(`data-${lower}`);
    if (dataAttrVal) return this.coerceType(dataAttrVal, expectedType);

    // 2. Title / Name heuristics
    if (lower.includes('title') || lower.includes('name') || lower.includes('headline')) {
      const heading = $card.find('h1, h2, h3, h4, h5, [class*="title"], [class*="name"]').first().text().trim();
      if (heading) return this.coerceType(heading, expectedType);
      const linkText = $card.find('a').first().text().trim();
      if (linkText) return this.coerceType(linkText, expectedType);
    }

    // 3. Price heuristics
    if (lower.includes('price') || lower.includes('cost') || lower.includes('amount')) {
      const priceEl = $card.find('[class*="price"], [class*="cost"], [data-testid*="price"]').first().text().trim();
      if (priceEl) return this.coerceType(priceEl, expectedType);

      // Search text for currency symbol
      const fullText = $card.text();
      const priceMatch = fullText.match(/[$¥€£]\s*([0-9]+([.,][0-9]{2})?)/);
      if (priceMatch) return this.coerceType(priceMatch[0], expectedType);
    }

    // 4. Link / URL heuristics
    if (lower.includes('link') || lower.includes('url') || lower.includes('href')) {
      const href = $card.find('a[href]').first().attr('href');
      if (href) return this.coerceType(href, expectedType);
    }

    // 5. Image heuristics
    if (lower.includes('image') || lower.includes('img') || lower.includes('photo') || lower.includes('thumbnail')) {
      const src = $card.find('img[src], img[data-src]').first().attr('src') || $card.find('img[data-src]').first().attr('data-src');
      if (src) return this.coerceType(src, expectedType);
    }

    // 6. Rating heuristics
    if (lower.includes('rating') || lower.includes('score') || lower.includes('stars')) {
      const ratingEl = $card.find('[class*="rating"], [class*="score"], [aria-label*="star"], [aria-label*="rating"]').first();
      const ratingText = ratingEl.attr('aria-label') || ratingEl.text().trim();
      if (ratingText) return this.coerceType(ratingText, expectedType);
    }

    // 7. Description heuristics
    if (lower.includes('desc') || lower.includes('summary') || lower.includes('detail')) {
      const desc = $card.find('p, [class*="desc"], [class*="summary"]').first().text().trim();
      if (desc) return this.coerceType(desc, expectedType);
    }

    // 8. Stock / Availability heuristics
    if (lower.includes('stock') || lower.includes('avail') || lower.includes('status')) {
      const stockEl = $card.find('[class*="stock"], [class*="avail"], [class*="status"]').first().text().trim();
      if (stockEl) return this.coerceType(stockEl, expectedType);
    }

    // 9. General class or text matching (supporting camelCase split like inStock -> stock)
    const words = prop.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().split(/[\s_-]+/);
    for (const word of words) {
      if (word.length >= 3) {
        const found = $card.find(`[class*="${word}"]`).first().text().trim();
        if (found) return this.coerceType(found, expectedType);
      }
    }

    const generic = $card.find(`[class*="${lower}"]`).first().text().trim();
    if (generic) return this.coerceType(generic, expectedType);

    return undefined;
  }

  // Helper: Single object extraction
  private tryExtractSingleObject($: cheerio.CheerioAPI, schema: any, metadata: PageMetadata): Record<string, any> {
    const targetProps = schema.properties || schema;
    const result: Record<string, any> = {};

    for (const [prop, fieldDef] of Object.entries(targetProps)) {
      const lower = prop.toLowerCase();
      const expectedType = typeof fieldDef === 'string' ? fieldDef : ((fieldDef as any)?.type || 'string');

      // Check metadata first
      if (lower === 'title' && metadata.title) {
        result[prop] = this.coerceType(metadata.title, expectedType);
        continue;
      }
      if (lower === 'description' && metadata.description) {
        result[prop] = this.coerceType(metadata.description, expectedType);
        continue;
      }
      if (lower === 'author' && metadata.author) {
        result[prop] = this.coerceType(metadata.author, expectedType);
        continue;
      }
      if (lower === 'canonicalurl' || lower === 'url') {
        if (metadata.canonicalUrl) {
          result[prop] = this.coerceType(metadata.canonicalUrl, expectedType);
          continue;
        }
      }

      // Check DOM
      const itemprop = $(`[itemprop="${prop}"], [itemprop="${lower}"]`).first().text().trim();
      if (itemprop) {
        result[prop] = this.coerceType(itemprop, expectedType);
        continue;
      }

      const byClass = $(`[class*="${lower}"]`).first().text().trim();
      if (byClass) {
        result[prop] = this.coerceType(byClass, expectedType);
        continue;
      }

      // Headings for title
      if (lower === 'title' || lower === 'name') {
        const h1 = $('h1').first().text().trim();
        if (h1) {
          result[prop] = this.coerceType(h1, expectedType);
          continue;
        }
      }
    }

    return result;
  }

  // Type coercion
  private coerceType(val: any, expectedType: string): any {
    if (val === null || val === undefined) return val;

    switch (expectedType.toLowerCase()) {
      case 'number': {
        if (typeof val === 'number') return val;
        const cleaned = String(val).replace(/[^0-9.-]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
      }
      case 'boolean': {
        if (typeof val === 'boolean') return val;
        const str = String(val).toLowerCase().trim();
        return str === 'true' || str === '1' || str === 'yes' || str === 'in stock' || str === 'available';
      }
      case 'array': {
        if (Array.isArray(val)) return val;
        return [val];
      }
      case 'string':
      default:
        return String(val).trim().replace(/\s+/g, ' ');
    }
  }

  // Finalize result with security sanitization
  private finalizeResult<T>(
    rawData: T,
    source: ExtractionResult['source'],
    confidence: number,
    metadata: PageMetadata,
    rawLength: number,
    options: StructuredExtractorOptions,
    warnings: string[] = []
  ): ExtractionResult<T> {
    const sanitizeResult = this.sanitizer.sanitize(rawData);
    const serializedLength = JSON.stringify(sanitizeResult.sanitizedData).length;
    const tokensSavedRatio = rawLength > 0 ? Math.max(0, Math.min(1, 1 - serializedLength / rawLength)) : 0;
    const itemCount = Array.isArray(sanitizeResult.sanitizedData) ? sanitizeResult.sanitizedData.length : 1;

    return {
      success: true,
      data: sanitizeResult.sanitizedData,
      source,
      confidence,
      itemCount,
      warnings: warnings.length > 0 ? warnings : undefined,
      securityNotices: sanitizeResult.securityNotices.length > 0 ? sanitizeResult.securityNotices : undefined,
      tokensSavedRatio: Math.round(tokensSavedRatio * 100) / 100,
      metadata,
    };
  }
}
