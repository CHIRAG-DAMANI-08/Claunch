# Phase 7: Session Memory Synchronization - Context

**Gathered:** 2026-06-28
**Status:** Ready for planning
**Source:** User request for session log querying and cross-session memory syncing.

<domain>
## Phase Boundary
This phase introduces cross-session syncing and querying capabilities for Claude Code sessions across git worktrees:
1. **Dialogue Log Reader**: Exposes `claunch log <branch>` to print a clean dialogue log of a session.
2. **Automatic Memory Syncing**: Configures worktree projects under `~/.claude/projects/` to share the same `memory/` folder using directory junctions.
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
</decisions>

<canonical_refs>
## Canonical References
- [ROADMAP.md](file:///c:/Users/Chirag/Projects/claunch/.planning/ROADMAP.md)
</canonical_refs>
