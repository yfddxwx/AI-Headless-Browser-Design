import { describe, it, expect } from 'vitest';
import { StateDiff } from '../../src/action/state-diff.js';
import { PagePerception } from '../../src/types/index.js';

describe('Unit Test: StateDiff (动作状态差分器)', () => {
  it('应当正确比对 URL 跳转与元素增减', () => {
    const before: PagePerception = {
      url: 'https://example.com/login',
      title: '登录页面',
      compressedMarkdown: '...',
      interactiveElements: [
        { ref: '@1', tag: 'input', text: '', disabled: false, selector: '#u' },
        { ref: '@2', tag: 'button', text: '登录', disabled: false, selector: '#btn' },
      ],
      rawHtmlLength: 1000,
      compressedLength: 200,
      compressionRatio: 80,
      tokensEstimated: 50,
    };

    const after: PagePerception = {
      url: 'https://example.com/dashboard',
      title: '控制台大屏',
      compressedMarkdown: '...',
      interactiveElements: [
        { ref: '@3', tag: 'a', text: '退出登录', disabled: false, selector: '#logout' },
      ],
      rawHtmlLength: 2000,
      compressedLength: 400,
      compressionRatio: 80,
      tokensEstimated: 100,
    };

    const diff = StateDiff.computeSummary(before, after);

    expect(diff).toContain('URL 跳转: "https://example.com/login" -> "https://example.com/dashboard"');
    expect(diff).toContain('标题变更: "登录页面" -> "控制台大屏"');
    expect(diff).toContain('新增交互元素 (1 个): @3[退出登录]');
  });
});
