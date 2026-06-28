# Architecture Research: Claunch

## System Architecture

Claunch is a **pipeline tool** — data flows linearly through 4 stages:

```
┌──────────┐    ┌───────────────┐    ┌──────────────┐    ┌──────────────────┐
│ Git      │ →  │ Worktree      │ →  │ Session      │ →  │ Windows Terminal  │
│ Discovery│    │ Parser        │    │ Store        │    │ Launcher          │
└──────────┘    └───────────────┘    └──────────────┘    └──────────────────────┘
```

### Components

#### 1. Git Discovery (`git/discoverWorktrees.ts`)
**Input:** Current working directory
**Output:** Array of `Worktree` objects

- Find git repo root via `git rev-parse --show-toplevel`
- Run `git worktree list --porcelain`
- Parse porcelain output into structured data
- Handle detached HEAD worktrees (use path basename as fallback name)
- Handle paths with spaces (common on Windows)

**Data Flow:**
```typescript
interface Worktree {
  path: string;        // Absolute path (Windows format)
  branch: string;      // Branch name (stripped refs/heads/)
  head: string;        // Commit SHA
  isBare: boolean;     // Whether it's a bare worktree
  isCurrent: boolean;  // Whether it's the CWD worktree
}
```

#### 2. Session Store (`claude/sessionStore.ts`)
**Input:** Repo root path, worktree branch name
**Output:** Session identifier (name string, or null)

- Read/write `~/.claunch/sessions.json`
- Key hierarchy: `repoPath → branch → sessionId`
- Create directories lazily (`~/.claunch/` may not exist on first run)
- Atomic writes (write to temp, rename) to prevent corruption

**Data Flow:**
```typescript
class SessionStore {
  getSession(repoPath: string, branch: string): string | null;
  setSession(repoPath: string, branch: string, sessionId: string): void;
}
```

#### 3. Claude Launcher (`claude/launchClaude.ts`)
**Input:** Worktree path, optional session name
**Output:** Command string for Windows Terminal

- Construct the `cd <path> && claude --resume <session>` command
- If no session, construct `cd <path> && claude`
- Handle path escaping for PowerShell (spaces, special chars)

This is NOT a direct process spawn — it produces command strings that wt.exe will execute.

#### 4. Windows Terminal Launcher (`terminal/openWindowsTerminal.ts`)
**Input:** Array of `{ path, command, title }` tab specifications
**Output:** Spawned `wt.exe` process

- Construct the full `wt.exe` command with chained `new-tab` arguments
- Current worktree tab is the first (default) tab
- Each tab gets `--title` set to branch name and `-d` set to worktree path
- Use `-w -1` to force a new window (not tabs in existing window)
- Handle semicolon escaping for PowerShell

**Critical wt.exe syntax:**
```
wt.exe -w -1 -d "C:\path" --title "main" cmd ; new-tab -d "C:\path2" --title "feat/dashboard" cmd
```

### CLI Entry Point (`cli.ts`)
- Parse arguments via Commander
- Orchestrate the pipeline: discover → map sessions → build commands → launch
- Error handling at each stage with clear messages

### Module Boundary Rules

| Module | Can Import | Cannot Import |
|--------|-----------|---------------|
| cli.ts | All modules | — |
| git/* | types, utils | claude/*, terminal/* |
| claude/* | types, utils | git/*, terminal/* |
| terminal/* | types, utils | git/*, claude/* |

No circular dependencies. Each module is independently testable.

## Data Flow

```
User runs `claunch`
  → cli.ts validates environment (git, claude, wt.exe in PATH)
  → discoverWorktrees(cwd) returns Worktree[]
  → Sort worktrees: current first, rest alphabetical
  → For each worktree:
      → sessionStore.getSession(repoPath, branch)
      → launchClaude.buildCommand(worktreePath, session)
  → openWindowsTerminal(tabSpecs)
  → Exit 0
```

## Build Order

1. **Types** — Define `Worktree`, `TabSpec`, `SessionEntry` interfaces
2. **Git Discovery** — Parse worktrees (independently testable)
3. **Session Store** — JSON persistence (independently testable)
4. **Claude Launcher** — Command string builder (independently testable)
5. **Terminal Launcher** — wt.exe invocation (integration-testable)
6. **CLI** — Wire everything together
7. **Package** — tsup build, bin field, npm packaging

---
*Researched: 2026-06-28*
