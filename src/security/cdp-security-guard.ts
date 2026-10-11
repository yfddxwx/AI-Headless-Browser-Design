export interface CDPValidationResult {
  valid: boolean;
  sanitizedEndpoint: string;
  violations: string[];
}

export class CDPSecurityGuard {
  private static readonly METADATA_HOSTS = [
    '169.254.169.254',
    'metadata.google.internal',
    'metadata.tencentyun.com',
    '100.100.100.200',
  ];

  public static validateEndpoint(
    endpointUrl: string,
    allowLocal: boolean = true
  ): CDPValidationResult {
    const violations: string[] = [];

    if (!endpointUrl || typeof endpointUrl !== 'string') {
      return {
        valid: false,
        sanitizedEndpoint: '',
        violations: ['CDP endpoint URL cannot be empty.'],
      };
    }

    const trimmed = endpointUrl.trim();

    try {
      // Must be a valid URL
      const parsed = new URL(trimmed);

      // 1. Enforce allowed protocols
      if (!['ws:', 'wss:', 'http:', 'https:'].includes(parsed.protocol)) {
        violations.push(`Unsupported protocol "${parsed.protocol}". CDP requires ws://, wss://, http://, or https://.`);
      }

      // 2. Metadata service SSRF prevention
      const hostname = parsed.hostname.toLowerCase();
      if (this.METADATA_HOSTS.includes(hostname)) {
        violations.push(`Blocked dangerous cloud metadata service endpoint: "${hostname}".`);
      }

      // 3. Private IP defense if allowLocal is false
      if (!allowLocal) {
        if (
          hostname === 'localhost' ||
          hostname === '127.0.0.1' ||
          hostname === '::1' ||
          hostname.startsWith('10.') ||
          hostname.startsWith('192.168.') ||
          /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
        ) {
          violations.push(`Private network CDP endpoint forbidden: "${hostname}".`);
        }
      }

      return {
        valid: violations.length === 0,
        sanitizedEndpoint: parsed.toString(),
        violations,
      };
    } catch {
      return {
        valid: false,
        sanitizedEndpoint: '',
        violations: [`Invalid CDP URL format: "${trimmed}".`],
      };
    }
  }

  public static maskHeaders(headers?: Record<string, string>): Record<string, string> {
    if (!headers) return {};
    const masked: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      const lower = key.toLowerCase();
      if (
        lower.includes('auth') ||
        lower.includes('key') ||
        lower.includes('token') ||
        lower.includes('secret')
      ) {
        if (value.length > 8) {
          masked[key] = `${value.slice(0, 4)}***${value.slice(-3)}`;
        } else {
          masked[key] = '***';
        }
      } else {
        masked[key] = value;
      }
    }

    return masked;
  }
}
