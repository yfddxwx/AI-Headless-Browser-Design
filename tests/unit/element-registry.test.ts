import { describe, it, expect } from 'vitest';
import * as cheerio from 'cheerio';
import { ElementRegistry } from '../../src/perception/element-registry.js';

describe('Unit Test: ElementRegistry (交互元素注册表)', () => {
  it('应当正确识别按钮、超链接、输入框并赋予递增 @Ref 句柄', () => {
    const html = `
      <div>
        <a href="https://example.com/docs">文档中心</a>
        <button id="submit-btn">提交表单</button>
        <input type="text" name="username" placeholder="请输入用户名" value="alice" />
        <textarea placeholder="留言内容"></textarea>
        <button disabled>已禁用的按钮</button>
      </div>
    `;

    const $ = cheerio.load(html);
    const registry = new ElementRegistry();
    const elements = registry.registerFromCheerio($);

    expect(elements).toHaveLength(5);

    // First element: Link
    expect(elements[0].ref).toBe('@1');
    expect(elements[0].tag).toBe('a');
    expect(elements[0].text).toBe('文档中心');
    expect(elements[0].href).toBe('https://example.com/docs');

    // Second element: Button
    expect(elements[1].ref).toBe('@2');
    expect(elements[1].tag).toBe('button');
    expect(elements[1].text).toBe('提交表单');

    // Third element: Input
    expect(elements[2].ref).toBe('@3');
    expect(elements[2].tag).toBe('input');
    expect(elements[2].name).toBe('请输入用户名');
    expect(elements[2].value).toBe('alice');

    // Fifth element: Disabled button
    expect(elements[4].disabled).toBe(true);

    // Test map lookup
    expect(registry.get('@2')?.text).toBe('提交表单');
  });
});
