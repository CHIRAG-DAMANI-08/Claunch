# Phase 7: Session Memory Sync & Interactive Menu - Context

**Gathered:** 2026-06-28
**Status:** Ready for planning
**Source:** User requests for session log querying, cross-session memory syncing, and a ccmanager-like interactive selection menu with background tab spawning.

<domain>
## Phase Boundary
This phase introduces cross-session syncing, log querying, and interactive selector capabilities:
1. **Dialogue Log Reader**: Exposes `claunch log <branch>` to print a clean dialogue log of a session.
2. **Automatic Memory Syncing**: Configures worktree projects under `~/.claude/projects/` to share the same `memory/` folder using directory junctions.
3. **Interactive Selector Menu**: Implements `claunch --menu` (and default flow when run without args) presenting a selection list. Choosing a worktree opens it in a new tab without losing focus on the menu tab (using `; focus-tab -t 0`).
</domain>

<decisions>
## Implementation Decisions

### Session Log Querying
- Subcommand: `claunch log <branch>` (with alias `session-log`)
- Behavior:
  - Scans `~/.claude/projects/` for any directories matching worktrees of the current repo.
  - Resolves target branch to its corresponding project directory.
  - Locates the latest `.jsonl` session log matching the branch name.
  - Parses the JSONL, filtering out file-history snapshots and tool calls, printing only user prompts and assistant responses in a readable format.

### Memory Syncing
- Action: Run automatically on `claunch` launch.
- Mechanism:
  - For each discovered worktree (except the main repository):
    - Compute its target Claude project directory under `~/.claude/projects/`.
    - If a normal `memory` folder exists there, delete/rename it, and create a directory junction pointing to the main repository's `memory` folder (e.g. `~/.claude/projects/C--Code-vaani/memory`).
    - If the `memory` folder does not exist, create the junction directly.
  - This ensures all worktrees share the exact same `MEMORY.md` file in real-time.

### Interactive Selection Menu
- Invocation: `claunch` with no arguments, or `claunch --menu` (alias `-m`).
- Interface:
  - Highlights current worktree in green.
  - Lists all discovered worktrees with their branch names and active session info.
  - Key bindings:
    - `↑`/`↓` or `j`/`k`: Navigate.
    - `Space`: Toggle selection (multi-select).
    - `Enter`: Launch all selected worktrees in a new Windows Terminal window.
    - `o` or `L` (on highlighted row): Launch that worktree immediately in a new tab of the current window, but run `focus-tab -t 0` so the menu tab remains focused.
    - `q` or `Ctrl+C`: Exit.
</decisions>

<canonical_refs>
## Canonical References
- [ROADMAP.md](file:///c:/Users/Chirag/Projects/claunch/.planning/ROADMAP.md)
</canonical_refs>
