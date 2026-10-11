# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

Security is a foundational pillar of **AgentBrowser**. If you discover a vulnerability, especially concerning:
- **SSRF bypasses** (e.g., DNS rebinding, novel IPv6/IPv4 escaping schemes)
- **Indirect Prompt Injection (IPI) bypasses** (e.g., novel CSS tricks, zero-width spaces, DOM obfuscation)
- **Arbitrary code execution or sandbox escapes** in headless browser contexts

**Please DO NOT open a public GitHub issue.**

### Reporting Process
1. Email details directly to the repository maintainer at **`fangdongyi674@gmail.com`** or create a **Private Security Advisory** via GitHub's [Security Advisories tab](https://github.com/yfddxwx/AI-Headless-Browser-Design/security/advisories/new).
2. Include reproduction steps, sample malicious HTML payloads, and expected versus actual behavior.
3. You will receive an acknowledgment within 48 hours.
4. We follow coordinated vulnerability disclosure principles.
