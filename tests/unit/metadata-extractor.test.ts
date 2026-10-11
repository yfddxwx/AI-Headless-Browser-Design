import { describe, it, expect } from 'vitest';
import { MetadataExtractor } from '../../src/perception/metadata-extractor.js';

describe('Unit Test: MetadataExtractor (Web 标准结构化元数据提取器)', () => {
  const extractor = new MetadataExtractor();

  it('应当准确提取 OpenGraph、Twitter Card 与标准 SEO 标签', () => {
    const html = `
      <!DOCTYPE html>
      <html lang="zh-CN">
        <head>
          <title>测试文章标题</title>
          <meta name="description" content="这是一篇用于大模型解析测试的技术文章。">
          <meta name="author" content="yifangdong">
          <link rel="canonical" href="https://example.com/article/100">
          <meta property="og:title" content="OG 标题: AI 无头浏览器">
          <meta property="og:description" content="专为智能体打造的高性能浏览器">
          <meta property="og:image" content="https://example.com/cover.png">
          <meta property="og:type" content="article">
          <meta name="twitter:card" content="summary_large_image">
          <meta name="twitter:title" content="Twitter 标题: AgentBrowser">
          <meta property="article:published_time" content="2026-10-11T12:00:00Z">
        </head>
        <body>
          <main><h1>正文内容</h1></main>
        </body>
      </html>
    `;

    const metadata = extractor.extract(html);

    expect(metadata.title).toBe('OG 标题: AI 无头浏览器');
    expect(metadata.description).toBe('这是一篇用于大模型解析测试的技术文章。');
    expect(metadata.author).toBe('yifangdong');
    expect(metadata.canonicalUrl).toBe('https://example.com/article/100');
    expect(metadata.language).toBe('zh-CN');
    expect(metadata.publishedTime).toBe('2026-10-11T12:00:00Z');
    expect(metadata.openGraph?.type).toBe('article');
    expect(metadata.openGraph?.image).toBe('https://example.com/cover.png');
    expect(metadata.twitter?.card).toBe('summary_large_image');
  });

  it('应当提取并解析多种 Schema.org JSON-LD 结构（包括 @graph 与单多对象）', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "Product",
              "name": "极速无线机械键盘",
              "image": "https://example.com/kb.jpg",
              "description": "RGB 背光超低延迟智能键盘",
              "offers": {
                "@type": "Offer",
                "price": "299.00",
                "priceCurrency": "USD",
                "availability": "https://schema.org/InStock"
              }
            }
          </script>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "name": "NoHead AI Lab",
                  "url": "https://example.com"
                }
              ]
            }
          </script>
        </head>
        <body><div id="app"></div></body>
      </html>
    `;

    const metadata = extractor.extract(html);

    expect(metadata.jsonLd).toBeDefined();
    expect(metadata.jsonLd?.length).toBe(2);
    expect(metadata.jsonLd?.[0].name).toBe('极速无线机械键盘');
    expect(metadata.jsonLd?.[0].offers?.price).toBe('299.00');
    expect(metadata.jsonLd?.[1].name).toBe('NoHead AI Lab');
  });
});
