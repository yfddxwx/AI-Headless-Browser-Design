import { Page } from 'playwright';
import { CaptchaDetectionResult } from '../types/index.js';

export class CaptchaDetector {
  public static async detect(page: Page): Promise<CaptchaDetectionResult> {
    try {
      const pageTitle = await page.title().catch(() => '');

      return await page.evaluate((title) => {
        // 1. Cloudflare Turnstile & Cloudflare Challenge
        const cfFrame = document.querySelector('iframe[src*="cloudflare.com"], iframe[src*="turnstile"]');
        const cfElement = document.querySelector('.cf-turnstile, #cf-turnstile, #challenge-running, #cf-stage');
        const cfTextMatch = document.body ? document.body.innerText.toLowerCase() : '';

        if (
          cfFrame ||
          cfElement ||
          title.includes('Just a moment...') ||
          cfTextMatch.includes('checking your browser') ||
          cfTextMatch.includes('verify you are human')
        ) {
          return {
            detected: true,
            type: 'cloudflare_turnstile',
            message: 'Detected Cloudflare Turnstile / Challenge verification barrier.',
            selector: cfElement ? cfElement.tagName.toLowerCase() : 'iframe',
          };
        }

        // 2. Google reCAPTCHA
        const recaptcha = document.querySelector('.g-recaptcha, iframe[src*="google.com/recaptcha"], iframe[src*="recaptcha.net"]');
        if (recaptcha) {
          return {
            detected: true,
            type: 'recaptcha',
            message: 'Detected Google reCAPTCHA challenge barrier.',
            selector: '.g-recaptcha',
          };
        }

        // 3. hCaptcha
        const hcaptcha = document.querySelector('.h-captcha, iframe[src*="hcaptcha.com"]');
        if (hcaptcha) {
          return {
            detected: true,
            type: 'hcaptcha',
            message: 'Detected hCaptcha challenge barrier.',
            selector: '.h-captcha',
          };
        }

        // 4. Generic Bot Security Check
        if (
          title.includes('Attention Required!') ||
          title.includes('Security Check') ||
          title.includes('Bot Detection')
        ) {
          return {
            detected: true,
            type: 'generic_challenge',
            message: `Detected generic bot mitigation page: "${title}".`,
          };
        }

        return {
          detected: false,
        };
      }, pageTitle);
    } catch {
      return { detected: false };
    }
  }
}
