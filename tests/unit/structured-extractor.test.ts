import { describe, it, expect } from 'vitest';
import { StructuredExtractor } from '../../src/perception/structured-extractor.js';

describe('Unit Test: StructuredExtractor (模式驱动结构化提取器)', () => {
  const extractor = new StructuredExtractor();

  it('应当准确从 HTML 语义数据表格中提取强类型数组', () => {
    const tableHtml = `
      <html>
        <body>
          <table>
            <thead>
              <tr>
                <th>Ticker Symbol</th>
                <th>Company Name</th>
                <th>Stock Price</th>
                <th>Active Market</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>NVDA</td>
                <td>NVIDIA Corp</td>
                <td>$124.50</td>
                <td>true</td>
              </tr>
              <tr>
                <td>MSFT</td>
                <td>Microsoft Corp</td>
                <td>$428.10</td>
                <td>true</td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `;

    const schema = {
      type: 'array',
      items: {
        properties: {
          symbol: { type: 'string' },
          name: { type: 'string' },
          price: { type: 'number' },
          active: { type: 'boolean' },
        },
      },
    };

    const result = extractor.extract(tableHtml, schema);

    expect(result.success).toBe(true);
    expect(result.source).toBe('semantic-table');
    expect(result.itemCount).toBe(2);
    expect(result.data).toHaveLength(2);
    expect(result.data[0].price).toBe(124.5);
    expect(result.data[0].active).toBe(true);
    expect(result.data[1].price).toBe(428.1);
  });

  it('应当从电商商品卡片列表中智能聚合并提取字段及类型转换', () => {
    const cardHtml = `
      <html>
        <body>
          <div class="product-grid">
            <div class="product-card">
              <h3 class="product-title">无线降噪耳机 Ultra</h3>
              <div class="product-price">$1,299.00</div>
              <a href="/items/101" class="buy-link">查看详情</a>
              <span class="stock-status">In Stock</span>
              <div class="rating" aria-label="4.8 stars">4.8 颗星</div>
            </div>
            <div class="product-card">
              <h3 class="product-title">人体工学工学椅 Pro</h3>
              <div class="product-price">$2,450.50</div>
              <a href="/items/102" class="buy-link">查看详情</a>
              <span class="stock-status">Out of stock</span>
              <div class="rating" aria-label="4.9 stars">4.9 颗星</div>
            </div>
          </div>
        </body>
      </html>
    `;

    const schema = {
      type: 'array',
      items: {
        title: 'string',
        price: 'number',
        link: 'string',
        inStock: 'boolean',
        rating: 'number',
      },
    };

    const result = extractor.extract(cardHtml, schema);

    expect(result.success).toBe(true);
    expect(result.source).toBe('semantic-card');
    expect(result.itemCount).toBe(2);
    expect(result.data[0].title).toBe('无线降噪耳机 Ultra');
    expect(result.data[0].price).toBe(1299);
    expect(result.data[0].link).toBe('/items/101');
    expect(result.data[0].inStock).toBe(true);
    expect(result.data[0].rating).toBe(4.8);

    expect(result.data[1].title).toBe('人体工学工学椅 Pro');
    expect(result.data[1].price).toBe(2450.5);
    expect(result.data[1].inStock).toBe(false);
  });

  it('应当剔除页面导航与噪声，提供高 Token 节省率的聚焦提取切片', () => {
    const pageHtml = `
      <html>
        <body>
          <header><nav><a href="/">首页</a><a href="/about">关于</a></nav></header>
          <aside><div class="ad">投放广告横幅</div></aside>
          <main>
            <article>
              <h1>核心财报分析报告</h1>
              <p>2026年第三季度营收同比增长 45%，净利润达 120 亿美元。</p>
            </article>
          </main>
          <footer><p>版权声明与社交媒体链接</p></footer>
        </body>
      </html>
    `;

    const focused = extractor.extractFocusedContext(pageHtml, ['article']);

    expect(focused.markdown).toContain('核心财报分析报告');
    expect(focused.markdown).toContain('2026年第三季度营收同比增长');
    expect(focused.markdown).not.toContain('投放广告横幅');
    expect(focused.markdown).not.toContain('首页');
    expect(focused.tokensEstimated).toBeGreaterThan(0);
    expect(focused.tokensSavedRatio).toBeGreaterThan(0);
  });
});
