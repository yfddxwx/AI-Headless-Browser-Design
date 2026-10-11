import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { BrowserManager } from '../../src/core/browser-manager.js';
import { SessionContext } from '../../src/core/session-context.js';

describe('Integration Test: Extraction Flow (端到端多标签提取与切片流水线)', () => {
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

  it('多标签协同场景下能够分别提取不同标签页的结构化数据与上下文切片', async () => {
    // 1. Tab 1: Product inventory table
    const tab1Html = `
      <html>
        <head><title>库存管理系统 - 标签页1</title></head>
        <body>
          <table>
            <thead><tr><th>SKU</th><th>Quantity</th><th>Unit Price</th></tr></thead>
            <tbody>
              <tr><td>SKU-A1</td><td>150</td><td>$12.00</td></tr>
              <tr><td>SKU-B2</td><td>75</td><td>$45.50</td></tr>
            </tbody>
          </table>
        </body>
      </html>
    `;
    await session.setContent(tab1Html);

    const tableSchema = {
      type: 'array',
      items: {
        sku: 'string',
        quantity: 'number',
        price: 'number',
      },
    };
    const tab1Data = await session.extractData(tableSchema);
    expect(tab1Data.success).toBe(true);
    expect(tab1Data.itemCount).toBe(2);
    expect(tab1Data.data[0].sku).toBe('SKU-A1');
    expect(tab1Data.data[0].quantity).toBe(150);

    // 2. Open Tab 2 with rich article content
    const { tabId: tab2Id } = await session.createTab();
    await session.switchTab(tab2Id);

    const tab2Html = `
      <html>
        <head>
          <title>深度研究专栏 - 标签页2</title>
          <meta name="author" content="Research Bot">
        </head>
        <body>
          <header><nav>Home | Archive</nav></header>
          <main>
            <article>
              <h1>大模型自动化网络智能体架构设计</h1>
              <p>研究证明使用局部确定性句柄能显著减少幻觉并降低 90% 的上下文开销。</p>
            </article>
          </main>
          <footer>Footer text</footer>
        </body>
      </html>
    `;
    await session.setContent(tab2Html);

    // Verify metadata in Tab 2
    const tab2Meta = await session.extractMetadata();
    expect(tab2Meta.author).toBe('Research Bot');

    // Verify focused context extraction in Tab 2
    const focused = await session.extractFocusedContext(['article']);
    expect(focused.markdown).toContain('大模型自动化网络智能体架构设计');
    expect(focused.tokensSavedRatio).toBeGreaterThan(0);

    // Clean up tab
    await session.closeTab(tab2Id);
  });
});
