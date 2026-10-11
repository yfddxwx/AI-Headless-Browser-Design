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
