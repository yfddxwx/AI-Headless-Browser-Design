import { SessionVaultData, BrowserCookie } from '../types/index.js';
import { SSRFGuard } from './ssrf-guard.js';

export class VaultSecuritySanitizer {
  private static ssrfGuard = new SSRFGuard();

  public static sanitizeAndValidate(vault: SessionVaultData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!vault.version || !Array.isArray(vault.cookies) || !Array.isArray(vault.origins)) {
      return { valid: false, errors: ['Invalid SessionVault format: missing required top-level fields.'] };
    }

    // 1. Validate cookies
    for (const cookie of vault.cookies) {
      if (!cookie.name || typeof cookie.name !== 'string') {
        errors.push('Cookie missing valid name.');
        continue;
      }

      // Check domain against SSRF private network
      if (cookie.domain) {
        const cleanDomain = cookie.domain.replace(/^\./, '');
        const check = this.ssrfGuard.validateUrl(`http://${cleanDomain}`);
        if (!check.safe) {
          errors.push(`Cookie "${cookie.name}" has disallowed private/SSRF domain "${cookie.domain}".`);
        }
      }

      // Check for CRLF injection
      if (/[\r\n]/.test(cookie.name) || /[\r\n]/.test(cookie.value)) {
        errors.push(`Cookie "${cookie.name}" contains dangerous CRLF injection characters.`);
      }
    }

    // 2. Validate Origin Storage
    for (const originEntry of vault.origins) {
      if (!originEntry.origin || typeof originEntry.origin !== 'string') {
        errors.push('Origin storage missing valid origin string.');
        continue;
      }

      // Validate origin URL format
      try {
        const parsed = new URL(originEntry.origin);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          errors.push(`Origin storage has disallowed protocol: "${parsed.protocol}" in "${originEntry.origin}".`);
        }
      } catch {
        errors.push(`Invalid origin URL: "${originEntry.origin}".`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  public static sanitizeSummary(vault: SessionVaultData) {
    return {
      version: vault.version,
      createdAt: vault.createdAt,
      cookieCount: vault.cookies.length,
      cookieNames: vault.cookies.map(c => `${c.name} (${c.domain})`),
      originCount: vault.origins.length,
      origins: vault.origins.map(o => o.origin),
    };
  }
}
