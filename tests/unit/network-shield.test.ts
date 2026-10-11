import { describe, it, expect } from 'vitest';
import { NetworkShield } from '../../src/core/network-shield.js';

describe('Unit Test: NetworkShield (网络流量盾与请求模式过滤)', () => {
  it('应当准确识别并阻断第三方跟踪、遥测与广告请求', () => {
    const shield = new NetworkShield({ enabled: true, blockAnalytics: true });

    // Tracking domains
    expect(shield.shouldBlock('https://www.google-analytics.com/analytics.js', 'script')).toBe(true);
    expect(shield.shouldBlock('https://connect.facebook.net/en_US/fbevents.js', 'script')).toBe(true);
    expect(shield.shouldBlock('https://securepubads.g.doubleclick.net/gampad/ads', 'xhr')).toBe(true);
    expect(shield.shouldBlock('https://browser.sentry-cdn.com/bundle.min.js', 'script')).toBe(true);

    // Normal business requests
    expect(shield.shouldBlock('https://example.com/assets/app.js', 'script')).toBe(false);
    expect(shield.shouldBlock('https://api.example.com/users', 'fetch')).toBe(false);
  });

  it('在开启 blockMedia 时应当拦截高带宽图片与音视频资源', () => {
    const shield = new NetworkShield({ enabled: true, blockMedia: true });

    expect(shield.shouldBlock('https://example.com/banner.png', 'image')).toBe(true);
    expect(shield.shouldBlock('https://example.com/intro.mp4', 'media')).toBe(true);
    expect(shield.shouldBlock('https://example.com/data.json', 'fetch')).toBe(false);
  });

  it('支持自定义黑名单规则匹配', () => {
    const shield = new NetworkShield({ 
      enabled: true, 
      customBlockedPatterns: ['ad-tracker.custom.com', '/telemetry/ping'] 
    });

    expect(shield.shouldBlock('https://ad-tracker.custom.com/track', 'xhr')).toBe(true);
    expect(shield.shouldBlock('https://example.com/telemetry/ping?v=1', 'fetch')).toBe(true);
  });
});
