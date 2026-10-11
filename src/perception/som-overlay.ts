import { Page } from 'playwright';
import { VisualElement, VisualSnapshot, BoundingBox } from '../types/index.js';

export interface SOMOverlayOptions {
  includeRawScreenshot?: boolean;
  boxColors?: string[];
  boxColor?: string;
  textColor?: string;
  fontSize?: number;
}

export class SOMOverlayEngine {
  private static readonly DEFAULT_COLORS = [
    '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
    '#911eb4', '#42d4f4', '#f032e6', '#bfef45', '#fabed4',
    '#469990', '#dcbeff', '#9a6324', '#fffac8', '#800000',
  ];

  public static async captureVisualSnapshot(
    page: Page,
    options: SOMOverlayOptions = {}
  ): Promise<VisualSnapshot> {
    const baseColors = options.boxColor ? [options.boxColor] : (options.boxColors || this.DEFAULT_COLORS);
    const textColor = options.textColor || '#ffffff';
    const fontSize = options.fontSize || 11;
    const url = page.url();
    const title = await page.title();
    const viewportSize = page.viewportSize() || { width: 1280, height: 800 };

    let rawScreenshotBase64: string | undefined;
    if (options.includeRawScreenshot) {
      const rawBuf = await page.screenshot({ fullPage: false });
      rawScreenshotBase64 = rawBuf.toString('base64');
    }

    // Step 1: Inject SOM overlay layer directly into the page
    const visibleElements: VisualElement[] = await page.evaluate(
      (cfg: { palette: string[]; textColor: string; fontSize: number }) => {
        // Remove any existing overlay if leftover
        const existing = document.getElementById('__agent_som_overlay__');
        if (existing) existing.remove();

      const overlay = document.createElement('div');
      overlay.id = '__agent_som_overlay__';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 2147483647;
        pointer-events: none;
        overflow: hidden;
      `;

      const results: any[] = [];
      const markedNodes = document.querySelectorAll('[data-agent-ref]');
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let colorIndex = 0;

      markedNodes.forEach((node) => {
        const el = node as HTMLElement;
        const ref = el.getAttribute('data-agent-ref') || '';
        const style = window.getComputedStyle(el);

        // Security & Visibility checks
        if (
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          parseFloat(style.opacity || '1') <= 0 ||
          style.fontSize === '0px' ||
          style.width === '0px' ||
          style.height === '0px' ||
          el.hasAttribute('hidden') ||
          el.getAttribute('aria-hidden') === 'true'
        ) {
          return;
        }

        const inlineStyle = (el.getAttribute('style') || '').toLowerCase();
        if (
          inlineStyle.includes('display:none') ||
          inlineStyle.includes('display: none') ||
          inlineStyle.includes('visibility:hidden') ||
          inlineStyle.includes('visibility: hidden') ||
          inlineStyle.includes('opacity:0') ||
          inlineStyle.includes('opacity: 0') ||
          inlineStyle.includes('font-size:0') ||
          inlineStyle.includes('font-size: 0') ||
          /width:\s*0(px|%|em|rem)?/i.test(inlineStyle) ||
          /height:\s*0(px|%|em|rem)?/i.test(inlineStyle) ||
          /left:\s*-[0-9]{3,}px/i.test(inlineStyle) ||
          /top:\s*-[0-9]{3,}px/i.test(inlineStyle)
        ) {
          return;
        }

        const rect = el.getBoundingClientRect();

        // Must have positive dimensions
        if (rect.width <= 2 || rect.height <= 2) {
          return;
        }

        // Must intersect current viewport
        if (
          rect.bottom < 0 ||
          rect.top > vh ||
          rect.right < 0 ||
          rect.left > vw
        ) {
          return;
        }

        // Check Physical Occlusion (e.g. covered by modal or floating banner)
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        let isOccluded = false;
        if (centerX >= 0 && centerX <= vw && centerY >= 0 && centerY <= vh) {
          const topEl = document.elementFromPoint(centerX, centerY);
          if (topEl && topEl !== el && !el.contains(topEl) && !topEl.contains(el)) {
            isOccluded = true;
          }
        }

        const color = cfg.palette[colorIndex % cfg.palette.length];
        colorIndex++;

        // 1. Create Bounding Box highlight (dashed if occluded)
        const box = document.createElement('div');
        box.style.cssText = `
          position: fixed;
          top: ${Math.max(0, rect.top)}px;
          left: ${Math.max(0, rect.left)}px;
          width: ${Math.min(vw - rect.left, rect.width)}px;
          height: ${Math.min(vh - rect.top, rect.height)}px;
          border: 2px ${isOccluded ? 'dashed' : 'solid'} ${color};
          box-sizing: border-box;
          opacity: ${isOccluded ? '0.5' : '1.0'};
          pointer-events: none;
        `;

        // 2. Create Ref Badge label
        const badge = document.createElement('div');
        badge.innerText = isOccluded ? `${ref} [遮挡]` : ref;
        badge.style.cssText = `
          position: fixed;
          top: ${Math.max(0, rect.top - 14)}px;
          left: ${Math.max(0, rect.left)}px;
          background: ${color};
          color: ${cfg.textColor};
          font-family: monospace, sans-serif;
          font-size: ${cfg.fontSize}px;
          font-weight: bold;
          line-height: 14px;
          padding: 0 4px;
          border-radius: 2px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.5);
          pointer-events: none;
        `;

        overlay.appendChild(box);
        overlay.appendChild(badge);

        results.push({
          ref,
          tag: el.tagName.toLowerCase(),
          role: el.getAttribute('role') || undefined,
          name: el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('title') || undefined,
          text: (el.innerText || el.textContent || '').trim().slice(0, 80),
          disabled: (el as any).disabled === true,
          selector: `[data-agent-ref="${ref}"]`,
          boundingBox: {
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          },
          isInViewport: true,
          isOccluded,
        });
      });

      document.body.appendChild(overlay);
      return results;
    }, { palette: baseColors, textColor, fontSize });

    // Step 2: Capture screenshot with SOM markings
    let annotatedBuf: Buffer;
    try {
      annotatedBuf = await page.screenshot({ fullPage: false });
    } finally {
      // Step 3: Non-destructive restoration - remove overlay layer immediately
      await page.evaluate(() => {
        const overlay = document.getElementById('__agent_som_overlay__');
        if (overlay) overlay.remove();
      });
    }

    return {
      url,
      title,
      viewport: viewportSize,
      annotatedScreenshotBase64: annotatedBuf.toString('base64'),
      rawScreenshotBase64,
      visibleElements,
      totalAnnotatedCount: visibleElements.length,
    };
  }
}
