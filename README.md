# Claunch 🚀

> **Native Windows CLI tool that manages multiple Claude Code sessions across Git worktrees.**

Claunch is designed for high-throughput developers who use **Claude Code** and **Git Worktrees** on Windows. It orchestrates opening separate Claude Code CLI sessions in individual tabs of Windows Terminal, keeping your working directory focus intact and syncing Claude's learnings in real-time.

---

## Features

- 📂 **Auto-Discover Worktrees**: Scans your Git repository, finds all active worktrees, and ignores bare repositories automatically.
- 🗂 **Interactive TUI Selector**: Launching `claunch` with no arguments opens a rich command-line selector. Arrow up/down, select multiple worktrees with `Space`, and open them all in a new window with `Enter`.
- 🔄 **Background Tab Spawning**: Press `o` or `L` in the menu to spawn a worktree immediately in a new tab of the current window, instantly returning focus to the menu so you can launch more.
- 🧠 **Cross-Session Memory Sync**: Automatically creates NTFS directory junctions linking each worktree project's `memory` directory under `~/.claude/projects/` back to the main repository. This allows Claude to share `MEMORY.md` learnings in real-time.
- 📖 **Dialogue Logs**: Query and read formatted chat logs of active branches using `claunch log <branch>` directly from your command line.

---

## Installation

You can install Claunch globally on your system:

```bash
npm install -g .
```

Or run directly without installing:

```bash
npx claunch
```

---

## Command Usage

### 1. Interactive Menu (Default)
Run without arguments to select which worktrees to open:
```bash
claunch
```

### 2. Launch All Worktrees Directly
Bypass the interactive menu and open all active worktrees in a new Windows Terminal window:
```bash
claunch --all
```

### 3. Read Claude Dialogues
Print a cleanly formatted transcript (User prompts and Claude responses) of any active branch's session:
```bash
claunch log <branch-name>
# or
claunch log <session-uuid>
```

---

## Requirements

- **OS**: Windows 10/11
- **Terminal**: Windows Terminal (`wt.exe`)
- **Shell**: PowerShell (runs `powershell.exe`)
- **Node**: `>= 22.0.0`
- **Dependencies**: Git CLI, Claude Code CLI installed globally

---

## License

MIT
