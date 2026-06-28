# Research Summary: Claunch

## Stack Recommendation

**Node.js 22+ / TypeScript (strict) / ESM** with:
- **Commander.js** for CLI parsing (future-proofs for subcommands)
- **tsup** for bundling into single distributable file
- **Vitest** for testing
- **ESLint + Prettier** for code quality
- **1 production dependency** (commander) — everything else is dev-only

## Key Findings

### What's Table Stakes
1. Git worktree discovery via `git worktree list --porcelain`
2. Windows Terminal tab management via `wt.exe` CLI
3. Claude session resumption via `claude --resume <name>`
4. JSON-based session persistence at `~/.claunch/sessions.json`
5. Clear error messages for missing prerequisites

### Architecture Pattern
Linear pipeline: **Git Discovery → Session Mapping → Command Building → Terminal Launching**

Four independent modules with no circular dependencies. Each module is independently testable with pure inputs/outputs.

### Critical Risks (Top 3)

| Risk | Mitigation |
|------|-----------|
| **PowerShell semicolon escaping** | wt.exe uses `;` to chain tabs, but PowerShell interprets `;` as statement separator. Must escape or use `cmd.exe /c` |
| **Windows path normalization** | Same path in different cases creates duplicate session entries. Normalize all paths (lowercase, forward slashes) |
| **spawn ENOENT on Windows** | Use `{ shell: true }` when spawning CLI tools to resolve `.cmd`/`.ps1` extensions |

### What NOT to Build
- No interactive prompts, no PTY, no daemon, no GUI
- No config files — hardcode sensible defaults
- No cleanup commands — manual JSON editing is acceptable
- No cross-platform — Windows 11 only

### Build Order (Dependency-driven)
1. Types & interfaces
2. Git worktree discovery (standalone, testable)
3. Session store (standalone, testable)
4. Claude command builder (standalone, testable)
5. Windows Terminal launcher (integration layer)
6. CLI entry point (orchestration)
7. Build & packaging (tsup + npm bin)

### Gap Analysis
No existing tool solves "open Windows Terminal tabs + resume Claude sessions" on native Windows. This is genuinely novel for the Windows + Claude Code ecosystem.

---
*Synthesized: 2026-06-28*
