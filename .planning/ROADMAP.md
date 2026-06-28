# Roadmap: Claunch

## Overview

Claunch is built as a linear pipeline: first set up the project foundation and types, then build each module independently (git discovery, session store, claude launcher, terminal launcher), wire them together in the CLI entry point, and finally package for npm distribution. The architecture ensures each module is independently testable before integration.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Project Foundation** - Initialize the TypeScript project with build tooling, types, and environment validation (completed 2026-06-28)
- [x] **Phase 2: Git Worktree Discovery** - Parse `git worktree list --porcelain` output into structured data (completed 2026-06-28)
- [x] **Phase 3: Session Store** - Persist and retrieve session-to-branch mappings from JSON file (completed 2026-06-28)
- [x] **Phase 4: Claude & Terminal Launching** - Build Claude command strings and launch Windows Terminal tabs (completed 2026-06-28)
- [x] **Phase 5: CLI Integration** - Wire all modules together into the `claunch` command (completed 2026-06-28)
- [x] **Phase 6: Packaging & Distribution** - Bundle with tsup and prepare for npm global install (completed 2026-06-28)
- [ ] **Phase 7: Session Memory Synchronization** - Sync Claude Code memory and session transcripts across git worktree terminal tabs

## Phase Details

### Phase 1: Project Foundation
**Goal**: Set up the TypeScript ESM project with all dev tooling, define core types, and implement environment validation utilities
**Depends on**: Nothing (first phase)
**Requirements**: PKG-02, PKG-05, ERR-01, ERR-02, ERR-03, ERR-04
**Success Criteria** (what must be TRUE):
  1. `npm install` succeeds and TypeScript compiles without errors
  2. Vitest runs and passes a placeholder test
  3. ESLint and Prettier are configured and pass on all source files
  4. Core type interfaces (Worktree, TabSpec, SessionData) are defined
  5. Environment validation functions detect missing git, claude, wt.exe and return clear error messages
**Plans**: 3 plans

Plans:
- [ ] 01-01: Initialize npm project with TypeScript ESM, tsup, Vitest, ESLint, Prettier
- [ ] 01-02: Define core type interfaces and project structure
- [ ] 01-03: Implement environment validation utilities (check git, claude, wt.exe in PATH)

### Phase 2: Git Worktree Discovery
**Goal**: Discover and parse all Git worktrees from any directory within a repository
**Depends on**: Phase 1
**Requirements**: GIT-01, GIT-02, GIT-03, GIT-04, GIT-05, GIT-06
**Success Criteria** (what must be TRUE):
  1. Running from any worktree discovers the repo root correctly
  2. All worktrees are parsed with correct paths and branch names
  3. Bare worktrees are excluded from results
  4. Detached HEAD worktrees use path basename as identifier
  5. Current worktree is flagged in results
**Plans**: 2 plans

Plans:
- [ ] 02-01: Implement git repo root discovery and worktree list parsing
- [ ] 02-02: Add unit tests for porcelain output parsing (normal, bare, detached HEAD, spaces in paths)

### Phase 3: Session Store
**Goal**: Provide persistent, reliable session-to-branch mapping storage
**Depends on**: Phase 1
**Requirements**: SESS-01, SESS-02, SESS-03, SESS-04, SESS-05, SESS-06, SESS-07
**Success Criteria** (what must be TRUE):
  1. SessionStore reads and writes `~/.claunch/sessions.json` correctly
  2. Branch name is stored as the session value
  3. `~/.claunch/` directory is created automatically on first write
  4. Paths are normalized before use as keys
  5. Corrupt JSON falls back to empty state without crashing
**Plans**: 2 plans

Plans:
- [ ] 03-01: Implement SessionStore class with get/set/path normalization/atomic writes
- [ ] 03-02: Add unit tests for session store (CRUD, corruption recovery, path normalization)

### Phase 4: Claude & Terminal Launching
**Goal**: Build command strings for Claude and launch Windows Terminal with properly configured tabs
**Depends on**: Phase 1
**Requirements**: TERM-01, TERM-02, TERM-03, TERM-04, TERM-05, TERM-06, TERM-07, TERM-08
**Success Criteria** (what must be TRUE):
  1. Command strings are correctly constructed for `claude --resume` and plain `claude`
  2. wt.exe command has `-w -1` for new window
  3. Semicolons are properly escaped for PowerShell
  4. Each tab has correct `-d` (directory) and `--title` (branch name) flags
  5. Current worktree tab appears first in the command
**Plans**: 2 plans

Plans:
- [ ] 04-01: Implement Claude command builder and Windows Terminal launcher
- [ ] 04-02: Add unit tests for command construction and tab ordering

### Phase 5: CLI Integration
**Goal**: Wire all modules into the Commander.js-based `claunch` command with proper error handling
**Depends on**: Phase 2, Phase 3, Phase 4
**Requirements**: GIT-06, TERM-05
**Success Criteria** (what must be TRUE):
  1. Running `claunch` discovers worktrees, maps sessions, and launches Windows Terminal
  2. Current worktree tab opens first
  3. All error conditions produce clear, expected messages
  4. Process exits cleanly after launching
**Plans**: 2 plans

Plans:
- [ ] 05-01: Implement CLI entry point with Commander.js wiring all modules
- [ ] 05-02: Add integration tests for the full pipeline

### Phase 6: Packaging & Distribution
**Goal**: Bundle the tool and verify it works as a globally-installed npm package
**Depends on**: Phase 5
**Requirements**: PKG-01, PKG-03, PKG-04
**Success Criteria** (what must be TRUE):
  1. `tsup` produces a single bundled JS file with shebang
  2. `npm install -g` installs without native compilation
  3. `claunch` command is available globally after install
  4. Running `claunch` from a git worktree opens Windows Terminal tabs correctly
**Plans**: 2 plans

Plans:
- [ ] 06-01: Configure tsup build, package.json bin field, and npm metadata
- [ ] 06-02: End-to-end verification of global install and execution

### Phase 7: Session Memory Synchronization
**Goal**: Sync Claude Code memory and session transcripts across git worktree terminal tabs, allowing Claude sessions to query other worktree contexts and learn from other sessions.
**Depends on**: Phase 6
**Requirements**: SESS-08, SESS-09, SESS-10
**Success Criteria** (what must be TRUE):
  1. Claude sessions can query details/history of another active session/branch.
  2. `claunch` provides a command to export or view session histories easily.
  3. Memory (`MEMORY.md`) changes from one worktree session are synced automatically or easily accessible by others.
**Plans**: TBD

Plans:
- [ ] TBD (run /gsd-plan-phase 7 to break down)

## Progress

**Execution Order:**
Phases 2, 3, 4 can execute in parallel (all depend only on Phase 1).
Phase 5 depends on 2, 3, 4. Phase 6 depends on 5. Phase 7 depends on Phase 6.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Project Foundation | 3/3 | Complete    | 2026-06-28 |
| 2. Git Worktree Discovery | 2/2 | Complete    | 2026-06-28 |
| 3. Session Store | 2/2 | Complete    | 2026-06-28 |
| 4. Claude & Terminal Launching | 2/2 | Complete    | 2026-06-28 |
| 5. CLI Integration | 2/2 | Complete    | 2026-06-28 |
| 6. Packaging & Distribution | 2/2 | Complete    | 2026-06-28 |
| 7. Session Memory Synchronization | 0/2 | Not started | - |

