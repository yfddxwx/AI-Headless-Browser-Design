import { Page } from 'playwright';
import { ActionResult } from '../types/index.js';

export class ActionExecutor {
  public static async click(page: Page, ref: string): Promise<void> {
    const locator = page.locator(`[data-agent-ref="${ref}"]`);
    if (await locator.count() === 0) {
      throw new Error(`Element with ref "${ref}" not found in current page context.`);
    }
    await locator.first().click({ timeout: 5000 });
  }

  public static async fill(page: Page, ref: string, text: string): Promise<void> {
    const locator = page.locator(`[data-agent-ref="${ref}"]`);
    if (await locator.count() === 0) {
      throw new Error(`Element with ref "${ref}" not found in current page context.`);
    }
    await locator.first().fill(text, { timeout: 5000 });
  }

  public static async scroll(page: Page, direction: 'down' | 'up' | 'top' | 'bottom', amount: number = 500): Promise<void> {
    if (direction === 'top') {
      await page.evaluate(() => window.scrollTo(0, 0));
    } else if (direction === 'bottom') {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    } else if (direction === 'down') {
      await page.evaluate((y) => window.scrollBy(0, y), amount);
    } else if (direction === 'up') {
      await page.evaluate((y) => window.scrollBy(0, -y), amount);
    }
  }

  public static async scrollOverlap(page: Page, direction: 'down' | 'up', overlapRatio: number = 0.2): Promise<number> {
    const scrollAmount = await page.evaluate((ratio) => {
      const vh = window.innerHeight;
      const step = Math.max(100, Math.round(vh * (1 - ratio)));
      return step;
    }, overlapRatio);

    if (direction === 'down') {
      await page.evaluate((y) => window.scrollBy(0, y), scrollAmount);
    } else {
      await page.evaluate((y) => window.scrollBy(0, -y), scrollAmount);
    }

    return scrollAmount;
  }

  public static async clickCoordinate(page: Page, x: number, y: number): Promise<void> {
    await page.mouse.click(x, y);
  }

  public static async pressKey(page: Page, key: string): Promise<void> {
    await page.keyboard.press(key);
  }
}
