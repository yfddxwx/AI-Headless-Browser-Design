# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-10-11

### Added
- **🏛️ Architecture & Contracts**:
  - Defined strict TypeScript contracts for `InteractiveElement`, `PagePerception`, `ActionResult`, and `BrowserConfig`.
- **⚙️ Core Engine**:
  - Implemented `BrowserManager` with Chromium life cycle management and memory-efficient flags.
  - Implemented `SessionContext` for interactive page manipulation.
  - Built `STEALTH_SCRIPT` for evasive fingerprinting masking (`navigator.webdriver` removal, plugins/languages spoofing).
- **🧠 AI Perception & Protocol**:
  - Built `DOMCompressor` reducing HTML tokens by 85%-95% into LLM-digestible Markdown.
  - Built `ElementRegistry` assigning deterministic `@1`, `@2` references to interactive elements.
  - Created `StateDiff` to report before/after mutations, URL shifts, and added/removed elements.
  - Implemented standard `AgentBrowserMCPServer` exposing `browser_navigate`, `browser_act`, and `browser_get_snapshot`.
- **🛡️ Security Sandbox**:
  - Built `SSRFGuard` preventing private network access (`127.0.0.0/8`, `10.0.0.0/8`, `192.168.0.0/16`, AWS/Cloud metadata `169.254.169.254`).
  - Built `PromptGuard` stripping CSS-hidden text (`display:none`, `visibility:hidden`, `font-size:0`, `opacity:0`) and detecting indirect prompt injection payloads.
- **🧪 Autonomous Gatekeeper**:
  - Multi-dimensional test suite (Unit, Functional, Integration, Security).
  - Automated CI gatekeeper pipeline (`scripts/gatekeeper.ts`).
- **🖼️ Multimodal Visual Perception (Feature 02)**:
  - Built `SOMOverlayEngine` for Set-of-Mark (SOM) visual grounding with non-destructive DOM restoration.
  - Implemented `getVisualSnapshot()` with bounding box coordinate calculation.
  - Implemented `clickCoordinate(x, y)` for physical pixel grounding.
  - Added MCP tools `browser_get_visual_snapshot` and `browser_click_coordinate`.
  - Strengthened visual prompt injection defense against zero-dimension and off-screen nodes.
- **📑 Tab Manager & Popup History Tree (Feature 03)**:
  - Implemented `TabManager` supporting deterministic tab IDs (`tab-1`, `tab-2`), creation, switching, and closing.
  - Automated popup capture on `context.on('page')` linking tree relationships (`openerTabId`).
  - Integrated full multi-tab situational awareness (`tabId` and `activeTabs`) directly into `PagePerception`.
  - Added MCP tools: `browser_list_tabs`, `browser_create_tab`, `browser_switch_tab`, and `browser_close_tab`.
  - Enforced SSRF security validation across tab creation and popup events.
- **🔐 Session Vault & Captcha Defense (Feature 04)**:
  - Implemented `SessionVault` for full export/import of authenticated Cookies, LocalStorage, and SessionStorage.
  - Created `CaptchaDetector` detecting Cloudflare Turnstile, Google reCAPTCHA, hCaptcha, and generic bot mitigation barriers.
  - Built `VaultSecuritySanitizer` defending against private IP / SSRF cookie domains, CRLF header injection, and illegal origin protocols.
  - Exposed MCP tools: `browser_export_vault`, `browser_import_vault`, and `browser_detect_captcha`.
- **⚡ Performance Shield & Occlusion Awareness (Feature 05)**:
  - Implemented `NetworkShield` routing engine to abort analytics, ad trackers, and heavy media, slashing load latency by up to 70%.
  - Added physical occlusion detection (`document.elementFromPoint`) to flag covered elements with `isOccluded: true` and dashed visual boxes.
  - Implemented viewport overlap scrolling (`scrollOverlap`) maintaining a continuous 20% buffer to prevent reading gaps across folds.
  - Exposed MCP tools: `browser_scroll_overlap`, `browser_get_network_stats`, and `browser_configure_network_shield`.
- **📊 Schema-Driven Structured Extraction (Feature 06)**:
  - Implemented `StructuredExtractor` supporting schema-driven extraction across HTML tables, repeating cards, and definition lists.
  - Built `MetadataExtractor` for Schema.org JSON-LD (including `@graph`), OpenGraph, Twitter Cards, and canonical SEO metadata.
  - Developed `ExtractionSanitizer` defending against indirect prompt injection (IPI) inside extracted fields, stripping dangerous executable HTML/XSS tags, and blocking prototype pollution attacks.
  - Added focused context slicing (`extractFocusedContext`) achieving >90% token savings for downstream LLM prompts.
  - Exposed MCP tools: `browser_extract_structured_data` and `browser_extract_metadata`.
- **🤝 Human-in-the-Loop (HITL) Circuit Breaker & Solver Hook (Feature 07)**:
  - Implemented `HITLCircuitBreaker` state machine (`closed` / `open` / `half_open`) to pause runaway agent execution when confronting bot mitigation barriers.
  - Extended `CaptchaDetector` with Two-Factor Authentication (2FA / OTP / SMS code) input and text detection.
  - Built pluggable `ChallengeSolverHook` supporting automated CAPTCHA solvers (2Captcha, CapSolver, custom webhooks) alongside manual operator intervention.
  - Added cryptographic high-entropy challenge ID generation, anti-forgery resolution validation, and strict timeout bounds against DoS traps.
  - Exposed MCP tools: `browser_get_active_challenges`, `browser_resolve_challenge`, and `browser_configure_hitl`.
