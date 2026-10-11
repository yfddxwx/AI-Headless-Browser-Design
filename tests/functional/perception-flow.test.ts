import { describe, it, expect } from 'vitest';
import { DOMCompressor } from '../../src/perception/dom-compressor.js';
import { ElementRegistry } from '../../src/perception/element-registry.js';

describe('Functional Test: Perception Flow (端到端感知提取功能测试)', () => {
  it('能够处理具有登录表单与复杂导航的完整页面并保留所有必要交互属性', () => {
    const pageHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>系统登录 - 企业中台</title></head>
        <body>
          <nav>
            <a href="/home">首页</a>
            <a href="/help">帮助指南</a>
          </nav>
          <div class="login-card">
            <h2>账户身份验证</h2>
            <form id="login-form">
              <label>用户名</label>
              <input id="user-input" type="text" placeholder="输入邮箱/工号" />
              <label>密码</label>
              <input id="pwd-input" type="password" placeholder="输入密码" />
              <label>部门选择</label>
              <select id="dept-select">
                <option value="tech">研发中心</option>
                <option value="sales">市场部</option>
              </select>
              <button id="login-submit" type="submit">立即登录</button>
            </form>
          </div>
        </body>
      </html>
    `;

    const registry = new ElementRegistry();
    const compressor = new DOMCompressor(registry);
    const perception = compressor.compress(pageHtml, 'https://oa.enterprise.internal/login', '系统登录 - 企业中台');

    expect(perception.title).toBe('系统登录 - 企业中台');
    expect(perception.interactiveElements.length).toBe(6); // 2 links + 2 inputs + 1 select + 1 button

    const inputs = perception.interactiveElements.filter(e => e.tag === 'input');
    expect(inputs).toHaveLength(2);
    expect(inputs[0].name).toBe('输入邮箱/工号');

    const submitBtn = perception.interactiveElements.find(e => e.tag === 'button');
    expect(submitBtn).toBeDefined();
    expect(submitBtn?.text).toBe('立即登录');

    // Ensure references are present in markdown
    expect(perception.compressedMarkdown).toContain(submitBtn!.ref);
  });
});
