# Requirements: Claunch

**Defined:** 2026-06-28
**Core Value:** One command opens every worktree with the right Claude session

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Git Discovery

- [ ] **GIT-01**: User can run `claunch` from any worktree and it discovers the repo root
- [ ] **GIT-02**: All worktrees are discovered via `git worktree list --porcelain` parsing
- [ ] **GIT-03**: Each worktree's branch name is extracted (stripping `refs/heads/` prefix)
- [ ] **GIT-04**: Bare worktrees are detected and excluded from tab launching
- [ ] **GIT-05**: Detached HEAD worktrees fall back to path basename as identifier
- [ ] **GIT-06**: Current worktree is identified and flagged for priority ordering

### Session Management

- [ ] **SESS-01**: Session-to-branch mappings persist in `~/.claunch/sessions.json`
- [ ] **SESS-02**: Branch name is used as the `--resume` argument value
- [ ] **SESS-03**: SessionStore class abstracts the mapping layer for future ID migration
- [ ] **SESS-04**: Storage directory `~/.claunch/` is created automatically on first run
- [ ] **SESS-05**: Paths are normalized (lowercase, forward slashes, resolved) before use as keys
- [ ] **SESS-06**: JSON writes are atomic (write temp file, rename) to prevent corruption
- [ ] **SESS-07**: Corrupt or missing `sessions.json` falls back to empty state without crashing

### Terminal Launching

- [ ] **TERM-01**: A new Windows Terminal window opens with one tab per worktree
- [ ] **TERM-02**: Each tab's working directory is set to the worktree path via `-d` flag
- [ ] **TERM-03**: Each tab executes `claude --resume <session>` if a mapping exists
- [ ] **TERM-04**: Each tab executes plain `claude` if no session mapping exists
- [ ] **TERM-05**: Current worktree's tab opens first (is the default/focused tab)
- [ ] **TERM-06**: Each tab title is set to the branch name via `--title` flag
- [ ] **TERM-07**: PowerShell semicolon escaping is handled correctly for `wt.exe` multi-tab commands
- [ ] **TERM-08**: Window is forced to be new (`-w -1`) not added to existing terminal

### Error Handling

- [ ] **ERR-01**: Missing Git displays "Git is not installed."
- [ ] **ERR-02**: Not inside a repo displays "No Git repository detected."
- [ ] **ERR-03**: Missing Claude CLI displays "Claude Code CLI not found."
- [ ] **ERR-04**: Missing Windows Terminal displays "Windows Terminal is required."

### Packaging

- [ ] **PKG-01**: `npm install -g claunch` works on Windows without native compilation
- [ ] **PKG-02**: Zero native dependencies (no node-pty, ffi, C++, Rust)
- [ ] **PKG-03**: Single bundled output via tsup with proper shebang
- [ ] **PKG-04**: `claunch` command is available globally after install via `bin` field
- [ ] **PKG-05**: Strict TypeScript with ESM targeting Node 22+

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Selective Launching

- **SEL-01**: User can run `claunch main` to open only the main worktree
- **SEL-02**: User can run `claunch dashboard` to open a worktree by partial branch match
- **SEL-03**: User can run `claunch --all` to explicitly open all worktrees

### Session Lifecycle

- **LIFE-01**: User can list stored session mappings
- **LIFE-02**: User can clear a specific session mapping
- **LIFE-03**: Conversation IDs replace name strings in session mapping values

## Out of Scope

| Feature | Reason |
|---------|--------|
| GUI / TUI / Electron | Philosophy: tiny Unix utility |
| PTY management | Anti-pattern per PRD; use wt.exe instead |
| Background daemon | Single invocation tool |
| Config files / themes / settings | Zero configuration by design |
| Plugin system | Unnecessary complexity |
| Telemetry | Privacy and simplicity |
| WSL / Linux / macOS | Windows 11 only |
| Auto-install missing tools | Just error clearly; user installs |
| Interactive session picker | No user interaction in the flow |
| Cross-repo session management | Each repo is independent |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| GIT-01 | — | Pending |
| GIT-02 | — | Pending |
| GIT-03 | — | Pending |
| GIT-04 | — | Pending |
| GIT-05 | — | Pending |
| GIT-06 | — | Pending |
| SESS-01 | — | Pending |
| SESS-02 | — | Pending |
| SESS-03 | — | Pending |
| SESS-04 | — | Pending |
| SESS-05 | — | Pending |
| SESS-06 | — | Pending |
| SESS-07 | — | Pending |
| TERM-01 | — | Pending |
| TERM-02 | — | Pending |
| TERM-03 | — | Pending |
| TERM-04 | — | Pending |
| TERM-05 | — | Pending |
| TERM-06 | — | Pending |
| TERM-07 | — | Pending |
| TERM-08 | — | Pending |
| ERR-01 | — | Pending |
| ERR-02 | — | Pending |
| ERR-03 | — | Pending |
| ERR-04 | — | Pending |
| PKG-01 | — | Pending |
| PKG-02 | — | Pending |
| PKG-03 | — | Pending |
| PKG-04 | — | Pending |
| PKG-05 | — | Pending |

**Coverage:**
- v1 requirements: 30 total
- Mapped to phases: 0
- Unmapped: 30 ⚠️

---
*Requirements defined: 2026-06-28*
*Last updated: 2026-06-28 after initial definition*
