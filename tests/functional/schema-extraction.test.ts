import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { BrowserManager } from '../../src/core/browser-manager.js';
import { SessionContext } from '../../src/core/session-context.js';

describe('Functional Test: Schema-Driven Structured Extraction (真实会话模式提取)', () => {
  let browserManager: BrowserManager;
  let session: SessionContext;

  beforeAll(async () => {
    browserManager = new BrowserManager({ headless: true });
    session = await browserManager.createSession();
  });

  afterAll(async () => {
    await session.close();
    await browserManager.close();
  });

  it('能够在真实页面环境中完整提取商品列表与类型强转', async () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>科技潮品在线商城</title></head>
        <body>
          <main>
            <div class="product-shelf">
              <article class="card">
                <h2 class="title">量子计算开发套件</h2>
                <div class="price">¥18,800.00</div>
                <a href="/p/901" class="buy-link">抢先体验</a>
                <span class="stock">In Stock</span>
              </article>
              <article class="card">
                <h2 class="title">神经拟态协处理器模块</h2>
                <div class="price">¥6,500.50</div>
                <a href="/p/902" class="buy-link">加入购物车</a>
                <span class="stock">Out of stock</span>
              </article>
            </div>
          </main>
        </body>
      </html>
    `;

    await session.setContent(html);

    const schema = {
      type: 'array',
      items: {
        title: 'string',
        price: 'number',
        buyLink: 'string',
        stock: 'boolean',
      },
    };

    const result = await session.extractData(schema);

    expect(result.success).toBe(true);
    expect(result.itemCount).toBe(2);
    expect(result.data[0].title).toBe('量子计算开发套件');
    expect(result.data[0].price).toBe(18800);
    expect(result.data[0].stock).toBe(true);
    expect(result.data[1].title).toBe('神经拟态协处理器模块');
    expect(result.data[1].price).toBe(6500.5);
    expect(result.data[1].stock).toBe(false);
  });

  it('能够提取包含 JSON-LD 和 OpenGraph 的真实页面元数据', async () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>AI 革命前沿论文研读</title>
          <meta name="author" content="Dr. Alan Turing">
          <meta property="og:title" content="AI 革命前沿精读">
          <meta property="og:description" content="关于自主大模型代理的范式转移深度解析">
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "Article",
              "headline": "AI 革命前沿论文研读",
              "author": "Dr. Alan Turing"
            }
          </script>
        </head>
        <body>
          <h1>AI 革命前沿论文研读</h1>
        </body>
      </html>
    `;

    await session.setContent(html);
    const metadata = await session.extractMetadata();

    expect(metadata.title).toBe('AI 革命前沿精读');
    expect(metadata.author).toBe('Dr. Alan Turing');
    expect(metadata.jsonLd).toBeDefined();
    expect(metadata.jsonLd?.[0].headline).toBe('AI 革命前沿论文研读');
  });
});
