import { describe, it, expect } from 'vitest';
import { DOMCompressor } from '../../src/perception/dom-compressor.js';

describe('Unit Test: DOMCompressor (AI 语义感知压缩器)', () => {
  it('应当剔除非语义脚本与样式，并将大篇幅 HTML 压缩为紧凑 Markdown', () => {
    const rawHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>测试标题</title>
          <style>body { background: #fff; font-size: 16px; } .banner { color: red; }</style>
          <script>console.log("analytics tracking code...");</script>
        </head>
        <body>
          <header><div class="logo">Logo</div></header>
          <main>
            <h1>欢迎使用 Agent 浏览器</h1>
            <p>这是一段详细的产品说明文档，旨在帮助大模型快速理解网页内容。</p>
            <ul>
              <li>功能一：Token 语义压缩</li>
              <li>功能二：确定性动作句柄</li>
            </ul>
            <button id="btn1">立即体验</button>
          </main>
          <footer><p>版权所有 2026</p></footer>
        </body>
      </html>
    `;

    const compressor = new DOMCompressor();
    const perception = compressor.compress(rawHtml, 'https://example.com', '测试页面');

    expect(perception.title).toBe('测试页面');
    expect(perception.compressedMarkdown).toContain('欢迎使用 Agent 浏览器');
    expect(perception.compressedMarkdown).toContain('功能一：Token 语义压缩');
    expect(perception.compressedMarkdown).not.toContain('analytics tracking');
    expect(perception.compressedMarkdown).not.toContain('background: #fff');
    expect(perception.compressionRatio).toBeGreaterThan(0);
    expect(perception.interactiveElements.length).toBeGreaterThan(0);
    expect(perception.interactiveElements[0].ref).toBe('@1');
  });
});
