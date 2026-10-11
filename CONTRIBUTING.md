# Contributing to AgentBrowser

First off, thank you for considering contributing to **AgentBrowser**! 🎉

This project is built around an **Autonomous Engineering Team Model**, where every pull request and feature must be classified into an engineering role and pass through a multi-dimensional quality gatekeeper loop.

---

## 🏛️ Engineering Roles & Directory Mapping

When contributing code, please maintain clear domain boundaries:

| Directory | Responsible Role | Scope |
| :--- | :--- | :--- |
| `docs/specs/` | 🏛️ System Architect | Feature specifications, RFCs, and API schema design |
| `src/core/` | ⚙️ Core Engine Dev | Playwright/CDP life cycle, BrowserManager, session context, stealth scripts |
| `src/perception/` | 🧠 AI Protocol Dev | DOM compression algorithms, element registry, `@Ref` assignment |
| `src/action/` | 🧠 AI Protocol Dev | Action primitives (`click`, `fill`, `scroll`), StateDiff computation |
| `src/security/` | 🛡️ Security Engineer | SSRF guardrails, indirect prompt injection defense, data sanitization |
| `src/mcp/` | 🧠 AI Protocol Dev | Model Context Protocol server, tools schema |
| `tests/` | 🧪 QA Gatekeeper | Unit, Functional, Integration, and Security test suites |
| `scripts/` | 🧪 QA Gatekeeper | Automation pipelines, gatekeeper verification scripts |

---

## 🔄 The Convergence Loop (Local Verification)

Before opening a pull request, you **MUST** run the automated team gatekeeper locally:

```bash
npm run gatekeeper
```

This script verifies:
1. **Architect Gate**: Static TypeScript type check (`npx tsc --noEmit`)
2. **Protocol Gate**: Unit test suite (`npm run test:unit`)
3. **Engine Gate**: Functional browser session tests (`npm run test:func`)
4. **QA Gate**: End-to-end integration tests (`npm run test:integ`)
5. **Security Gate**: SSRF & indirect prompt injection attack tests (`npm run test:sec`)

Only contributions that receive a **100% GREEN PASS** from all 5 checks will be merged.

---

## 📝 Commit Conventions

We strictly follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat(perception): add vision bounding box support for multimodal models`
- `fix(core): resolve race condition in session teardown`
- `sec(guard): patch IPv6 bypass in SSRF filter`
- `test(qa): add edge case for iframe prompt injection`
- `docs(spec): draft feature 02 specification`

---

## 🚀 Development Workflow

1. Fork the repo and clone it locally.
2. Install dependencies: `npm install`
3. Install browser binaries: `npx playwright install chromium`
4. Create a branch: `git checkout -b feat/your-feature-name`
5. Implement changes and add corresponding tests in `tests/`.
6. Run `npm run gatekeeper` and ensure all tests pass.
7. Commit changes following conventional commit syntax.
8. Push your branch and open a Pull Request.
