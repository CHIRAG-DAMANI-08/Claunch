# Features Research: Claunch

## Feature Categories

### Table Stakes (Must-have or tool is broken)

| Feature | Complexity | Notes |
|---------|-----------|-------|
| Discover all worktrees from any worktree | Low | `git worktree list --porcelain` parsing |
| Open Windows Terminal tabs | Low | `wt.exe` CLI arguments |
| Resume Claude sessions by name | Low | `claude --resume <name>` |
| Fallback to fresh `claude` if no session | Low | Catch resume failure, fall back |
| Persist session mappings | Low | JSON file in `~/.claunch/` |
| Clear error messages for missing tools | Low | Check PATH for git, claude, wt |

### Differentiators (Competitive advantages)

| Feature | Complexity | Notes |
|---------|-----------|-------|
| Single-command workflow (`claunch` = done) | Low | This IS the product |
| Current worktree tab opens first | Low | Ordering logic in tab construction |
| Zero config / zero interaction | None | Deliberate absence of features |
| Tab titles showing branch names | Low | `wt.exe --title` flag |
| Smart session name derivation from branch | Low | Strip `refs/heads/`, handle slashes |

### Anti-Features (Things to deliberately NOT build)

| Anti-Feature | Reason |
|--------------|--------|
| Interactive session picker | Violates "no interaction" principle |
| Selective worktree opening | v2 feature, not v1 |
| Session deletion / cleanup | Out of scope — manual JSON editing is fine |
| Cross-repo session management | Each repo is independent |
| Auto-install missing tools | Just error clearly |
| PTY multiplexing | Fundamental anti-pattern per PRD |
| Background daemon / watcher | Violates "single invocation" principle |

## Dependencies Between Features

```
Git discovery → Worktree parsing → Session mapping → Terminal launching
                                                    ↗
                                    Error checking →
```

All features are on a single critical path — no independent feature branches.

## Existing Tools in This Space

| Tool | Why it doesn't solve the problem |
|------|--------------------------------|
| ccmanager | PTY issues on native Windows |
| Worktrunk | Unix-focused, tmux integration |
| @agenttools/worktree | Linux/macOS tmux sessions |
| git-worktree-manager (gw) | Rust-based, env variable focus |

**Gap:** No existing tool does "open Windows Terminal tabs + resume Claude sessions" on native Windows.

---
*Researched: 2026-06-28*
