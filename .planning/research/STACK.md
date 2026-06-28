# Stack Research: Claunch

## Recommended Stack (2025)

### Runtime & Language
| Component | Choice | Rationale | Confidence |
|-----------|--------|-----------|------------|
| **Runtime** | Node.js 22+ | User requirement; LTS with native ESM support | ✓ High |
| **Language** | TypeScript (strict) | User requirement; full type safety | ✓ High |
| **Module System** | ESM (`"type": "module"`) | User requirement; modern standard | ✓ High |

### CLI Framework
| Option | Verdict | Rationale |
|--------|---------|-----------|
| **Commander.js** | ✓ **Recommended** | Minimal, zero-dependency, perfect for single-command CLIs. Chainable API supports future subcommands cleanly |
| Yargs | ✗ Overkill | Too feature-rich for a tool with effectively one command |
| oclif | ✗ Overkill | Enterprise scaffolding unnecessary for this scope |
| Citty | ✗ Too new | Less ecosystem maturity; no significant advantage here |
| **No framework** | ✓ **Also viable** | For a tool THIS simple, `process.argv` parsing may suffice. Commander adds ~35KB but future-proofs for subcommands |

**Decision:** Use Commander.js. The PRD says "architecture should make it easy to add commands later" — Commander handles this natively. Overhead is negligible.

### Build & Distribution
| Component | Choice | Rationale | Confidence |
|-----------|--------|-----------|------------|
| **Bundler** | tsup | Fastest TS→JS bundler, outputs clean ESM, handles `bin` scripts | ✓ High |
| **Distribution** | npm (`bin` field in package.json) | `npm install -g claunch` requirement | ✓ High |
| **Shebang** | `#!/usr/bin/env node` | Standard for Node.js CLI tools | ✓ High |

### Testing
| Component | Choice | Rationale | Confidence |
|-----------|--------|-----------|------------|
| **Test Runner** | Vitest | User requirement; fast, ESM-native, excellent TS support | ✓ High |
| **Assertion** | Vitest built-in | No need for external assertion library | ✓ High |

### Code Quality
| Component | Choice | Rationale | Confidence |
|-----------|--------|-----------|------------|
| **Linting** | ESLint (flat config) | User requirement | ✓ High |
| **Formatting** | Prettier | User requirement | ✓ High |

### What NOT to Use
| Avoid | Reason |
|-------|--------|
| node-pty | User requirement — no native deps |
| chalk | Unnecessary for error messages; use ANSI codes directly or skip colors entirely |
| ora / clack | No interactive prompts needed |
| inquirer | No user prompts in the flow |
| Bun | User specified Node.js 22+ |

## Dependencies Summary

**Production:**
- `commander` (~35KB) — CLI framework

**Dev-only:**
- `typescript` — Compiler
- `tsup` — Bundler
- `vitest` — Test runner
- `eslint` — Linting
- `prettier` — Formatting
- `@types/node` — Type definitions

**Total production deps: 1** (or 0 if we skip Commander)

---
*Researched: 2026-06-28*
