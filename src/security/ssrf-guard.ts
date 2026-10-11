import { SecurityCheckResult } from '../types/index.js';

export class SSRFGuard {
  private allowedDomains: Set<string>;
  private blockPrivateIPs: boolean;

  constructor(allowedDomains: string[] = [], blockPrivateIPs: boolean = true) {
    this.allowedDomains = new Set(allowedDomains.map(d => d.toLowerCase()));
    this.blockPrivateIPs = blockPrivateIPs;
  }

  public validateUrl(rawUrl: string): SecurityCheckResult {
    const violations: string[] = [];

    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return {
        safe: false,
        violations: [`Invalid URL format: "${rawUrl}"`],
      };
    }

    // Protocol check: Only http: and https: allowed
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      violations.push(`Blocked unsafe protocol: "${parsed.protocol}". Only "http:" and "https:" are allowed.`);
    }

    const hostname = parsed.hostname.toLowerCase();

    // Check domain allowlist if configured
    if (this.allowedDomains.size > 0) {
      const isAllowed = Array.from(this.allowedDomains).some(domain => 
        hostname === domain || hostname.endsWith(`.${domain}`)
      );
      if (!isAllowed) {
        violations.push(`Hostname "${hostname}" is not in the allowed domain whitelist.`);
      }
    }

    // Check private/loopback addresses
    if (this.blockPrivateIPs) {
      if (this.isPrivateOrLocalHost(hostname)) {
        violations.push(`Access to local/private network host "${hostname}" is blocked by SSRFGuard.`);
      }
    }

    return {
      safe: violations.length === 0,
      violations,
    };
  }

  private isPrivateOrLocalHost(hostname: string): boolean {
    if (hostname === 'localhost' || hostname === 'localhost.localdomain') {
      return true;
    }

    // IPv6 loopback / local
    if (hostname === '::1' || hostname === '[::1]' || hostname.startsWith('fe80:') || hostname.startsWith('fc00:')) {
      return true;
    }

    // IPv4 check
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Regex);
    if (match) {
      const octets = match.slice(1, 5).map(Number);
      if (octets.some(o => o < 0 || o > 255)) {
        return true; // Malformed IP treated as dangerous
      }

      const [o1, o2] = octets;

      // 0.0.0.0/8
      if (o1 === 0) return true;
      // 127.0.0.0/8 (Loopback)
      if (o1 === 127) return true;
      // 10.0.0.0/8 (Private)
      if (o1 === 10) return true;
      // 172.16.0.0/12 (Private: 172.16 - 172.31)
      if (o1 === 172 && o2 >= 16 && o2 <= 31) return true;
      // 192.168.0.0/16 (Private)
      if (o1 === 192 && o2 === 168) return true;
      // 169.254.0.0/16 (Link-local & Cloud Metadata, e.g. AWS/GCP 169.254.169.254)
      if (o1 === 169 && o2 === 254) return true;
      // 100.64.0.0/10 (Carrier-grade NAT)
      if (o1 === 100 && o2 >= 64 && o2 <= 127) return true;
    }

    // Hex / Octal IP bypass checks (e.g., 0x7f.0.0.1, 2130706433)
    if (/^(0x[0-9a-f]+|\d+)$/i.test(hostname)) {
      return true;
    }

    return false;
  }
}
