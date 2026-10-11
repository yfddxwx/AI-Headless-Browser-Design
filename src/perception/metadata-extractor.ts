import * as cheerio from 'cheerio';
import { PageMetadata } from '../types/index.js';

export class MetadataExtractor {
  public extract(html: string): PageMetadata {
    const $ = cheerio.load(html);

    // 1. Title
    const title =
      $('meta[property="og:title"]').attr('content')?.trim() ||
      $('meta[name="twitter:title"]').attr('content')?.trim() ||
      $('title').text().trim() ||
      undefined;

    // 2. Description
    const description =
      $('meta[name="description"]').attr('content')?.trim() ||
      $('meta[property="og:description"]').attr('content')?.trim() ||
      $('meta[name="twitter:description"]').attr('content')?.trim() ||
      undefined;

    // 3. Canonical URL
    const canonicalUrl =
      $('link[rel="canonical"]').attr('href')?.trim() ||
      $('meta[property="og:url"]').attr('content')?.trim() ||
      undefined;

    // 4. Author
    const author =
      $('meta[name="author"]').attr('content')?.trim() ||
      $('meta[property="article:author"]').attr('content')?.trim() ||
      $('[rel="author"]').text().trim() ||
      undefined;

    // 5. Language
    const language =
      $('html').attr('lang')?.trim() ||
      $('meta[http-equiv="content-language"]').attr('content')?.trim() ||
      undefined;

    // 6. Published Time
    const publishedTime =
      $('meta[property="article:published_time"]').attr('content')?.trim() ||
      $('meta[name="publication_date"]').attr('content')?.trim() ||
      $('time[datetime]').first().attr('datetime')?.trim() ||
      undefined;

    // 7. OpenGraph dictionary
    const openGraph: Record<string, string> = {};
    $('meta[property^="og:"]').each((_, el) => {
      const prop = $(el).attr('property');
      const content = $(el).attr('content');
      if (prop && content !== undefined) {
        openGraph[prop.replace(/^og:/, '')] = content.trim();
      }
    });

    // 8. Twitter card dictionary
    const twitter: Record<string, string> = {};
    $('meta[name^="twitter:"]').each((_, el) => {
      const name = $(el).attr('name');
      const content = $(el).attr('content');
      if (name && content !== undefined) {
        twitter[name.replace(/^twitter:/, '')] = content.trim();
      }
    });

    // 9. JSON-LD scripts
    const jsonLd: any[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      const text = $(el).text().trim();
      if (!text) return;
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          jsonLd.push(...parsed);
        } else if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed['@graph'])) {
            jsonLd.push(...parsed['@graph']);
          } else {
            jsonLd.push(parsed);
          }
        }
      } catch {
        // Skip unparseable JSON-LD blocks silently
      }
    });

    return {
      title,
      description,
      canonicalUrl,
      author,
      language,
      publishedTime,
      openGraph: Object.keys(openGraph).length > 0 ? openGraph : undefined,
      twitter: Object.keys(twitter).length > 0 ? twitter : undefined,
      jsonLd: jsonLd.length > 0 ? jsonLd : undefined,
    };
  }
}
