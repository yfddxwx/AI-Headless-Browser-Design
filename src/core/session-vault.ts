import { BrowserContext, Page } from 'playwright';
import * as fs from 'fs/promises';
import { SessionVaultData, BrowserCookie, OriginStorage } from '../types/index.js';
import { VaultSecuritySanitizer } from '../security/vault-sanitizer.js';

export class SessionVault {
  public static async exportVault(context: BrowserContext, activePages: Page[] = []): Promise<SessionVaultData> {
    const rawCookies = await context.cookies();
    const cookies: BrowserCookie[] = rawCookies.map(c => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path,
      expires: c.expires,
      httpOnly: c.httpOnly,
      secure: c.secure,
      sameSite: c.sameSite as any,
    }));

    const origins: OriginStorage[] = [];
    const seenOrigins = new Set<string>();

    for (const page of activePages) {
      try {
        const origin = await page.evaluate(() => window.location.origin);
        if (origin && origin !== 'null' && origin !== 'about:blank' && !seenOrigins.has(origin)) {
          seenOrigins.add(origin);
          const storageData = await page.evaluate(() => {
            const ls: Record<string, string> = {};
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              if (k) ls[k] = localStorage.getItem(k) || '';
            }

            const ss: Record<string, string> = {};
            for (let i = 0; i < sessionStorage.length; i++) {
              const k = sessionStorage.key(i);
              if (k) ss[k] = sessionStorage.getItem(k) || '';
            }

            return { localStorage: ls, sessionStorage: ss };
          });

          origins.push({
            origin,
            localStorage: storageData.localStorage,
            sessionStorage: storageData.sessionStorage,
          });
        }
      } catch {
        // Ignore evaluation errors on unloaded/closed pages
      }
    }

    return {
      version: '1.0.0',
      createdAt: Date.now(),
      cookies,
      origins,
    };
  }

  public static async importVault(
    context: BrowserContext,
    vault: SessionVaultData,
    activePage?: Page
  ): Promise<{ cookiesImported: number; originsInjected: number }> {
    // 1. Run security sanitizer
    const validation = VaultSecuritySanitizer.sanitizeAndValidate(vault);
    if (!validation.valid) {
      throw new Error(`Vault Security Violation: ${validation.errors.join('; ')}`);
    }

    // 2. Inject Cookies
    if (vault.cookies && vault.cookies.length > 0) {
      const validCookies = vault.cookies.map(c => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path || '/',
        expires: c.expires,
        httpOnly: c.httpOnly,
        secure: c.secure,
        sameSite: c.sameSite,
      }));
      await context.addCookies(validCookies);
    }

    // 3. Inject LocalStorage/SessionStorage if activePage matches origin
    let originsInjected = 0;
    if (activePage && vault.origins && vault.origins.length > 0) {
      try {
        const currentOrigin = await activePage.evaluate(() => window.location.origin);
        const matchingStorage = vault.origins.find(o => o.origin === currentOrigin);
        if (matchingStorage) {
          await activePage.evaluate((storage) => {
            if (storage.localStorage) {
              for (const [k, v] of Object.entries(storage.localStorage)) {
                localStorage.setItem(k, v);
              }
            }
            if (storage.sessionStorage) {
              for (const [k, v] of Object.entries(storage.sessionStorage)) {
                sessionStorage.setItem(k, v);
              }
            }
          }, matchingStorage);
          originsInjected++;
        }
      } catch {
        // ignore storage injection on blank page
      }
    }

    return {
      cookiesImported: vault.cookies.length,
      originsInjected,
    };
  }

  public static async saveToFile(filepath: string, vault: SessionVaultData): Promise<void> {
    const data = JSON.stringify(vault, null, 2);
    await fs.writeFile(filepath, data, 'utf-8');
  }

  public static async loadFromFile(filepath: string): Promise<SessionVaultData> {
    const content = await fs.readFile(filepath, 'utf-8');
    const parsed = JSON.parse(content) as SessionVaultData;
    return parsed;
  }
}
