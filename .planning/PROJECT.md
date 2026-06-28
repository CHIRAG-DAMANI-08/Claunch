# Claunch

## What This Is

A lightweight, native Windows CLI tool that automates opening Claude Code sessions across Git worktrees. Running `claunch` from any worktree discovers all sibling worktrees, opens each in its own Windows Terminal tab inside a single new window, and resumes the correct Claude conversation in each. It replaces the manual workflow of opening 4–8 terminals, cd'ing into worktrees, and picking the right session.

## Core Value

One command opens every worktree with the right Claude session — no manual terminal management, no wrong sessions, no repetition.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

<!-- Current scope. Building toward these. -->

- [ ] Discover all Git worktrees from any worktree in the repo
- [ ] Open a new Windows Terminal window with one tab per worktree
- [ ] Launch `claude --resume <session-name>` in each tab
- [ ] Fall back to plain `claude` if no session mapping exists
- [ ] Persist session-to-branch mappings in `~/.claunch/sessions.json`
- [ ] Use branch name as the session identifier (resume argument)
- [ ] Isolate mapping behind a `SessionStore` class for future ID migration
- [ ] Clear error messages for missing Git, repo, Claude CLI, or Windows Terminal
- [ ] Install globally via `npm install -g claunch`
- [ ] Zero native dependencies (no node-pty, no C++, no Rust)
- [ ] Strict TypeScript with ESM targeting Node 22+

### Out of Scope

- GUI / TUI / Electron — philosophy is "tiny Unix utility"
- PTY management or terminal embedding — we launch `wt.exe`, not embed
- Background daemon — single invocation, no long-running process
- Config files / themes / settings / plugins / telemetry — zero configuration
- WSL / Linux / macOS — Windows 11 only
- Selective worktree launching (`claunch main`, `claunch --all`) — architecture supports it but not implemented in v1
- tmux / ccmanager replacement — this is complementary, not competitive

## Context

- User currently manages 4–8 worktrees per repo (e.g. vaani, vaani-dashboard, vaani-api, vaani-settings)
- Each worktree maps to a Git branch (main, feat/dashboard, feat/api, etc.)
- `ccmanager` would solve this but has PTY compatibility issues on native Windows
- Claude Code CLI supports `claude --resume <name>` to resume by session name
- Windows Terminal (`wt.exe`) supports opening new windows with multiple tabs via CLI arguments
- The tool should prioritize the current worktree's tab (open it first), then open remaining worktrees as additional tabs

## Constraints

- **Platform**: Windows 11 + PowerShell + Windows Terminal — no cross-platform
- **Runtime**: Node.js 22+ with ESM — no CommonJS
- **Dependencies**: Zero native/compiled deps — pure JS/TS only, `npm install -g` must work
- **CLI surface**: Single command `claunch` — no subcommands in v1
- **Architecture**: Modular enough to add `claunch <worktree>` and `claunch --all` later without rewriting

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Branch name as session ID | Claude CLI accepts `--resume <name>`, simplest approach | — Pending |
| SessionStore class abstraction | Future-proofs for conversation ID migration | — Pending |
| New Windows Terminal window (not tabs in existing) | User wants clean separation of worktree sessions | — Pending |
| Current worktree tab opens first | User's mental model: "I'm here, show me this first" | — Pending |
| No fallback prompt on first launch | PRD says auto-fallback to plain `claude`, no user interaction | — Pending |

---
*Last updated: 2026-06-28 after initialization*
