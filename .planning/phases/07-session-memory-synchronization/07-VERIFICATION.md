# Verification: Phase 7 Goal Achievement

**Phase Goal:** Sync Claude Code memory and transcripts across git worktree terminal tabs, and implement a ccmanager-like interactive selector menu with focus-retention background tab opening.
**Phase Requirement IDs:** SESS-08, SESS-09, SESS-10, MENU-01, MENU-02, MENU-03, MENU-04
**Status:** pending

## Must Haves Check
- [ ] TypeScript compiles without errors
- [ ] Vitest runs and passes all tests (including new sessionLog, memorySync, and interactiveMenu tests)
- [ ] `claunch log <branch>` subcommand outputs session logs
- [ ] Worktree project memory folders are linked to the main project memory via directory junctions
- [ ] `claunch` / `claunch --menu` launches the interactive CLI menu listing all worktrees
- [ ] Selecting worktrees via Space and pressing Enter launches them in new tabs
- [ ] Pressing `o` / `L` on a row launches it in a new tab without losing focus on the menu tab (verifiable by observing `; focus-tab -t 0` in spawned terminal call)

## Artifacts Verified
- [ ] `src/claude/sessionLog.ts` contains path cleaning, scanning, parsing, and formatting functions
- [ ] `src/claude/memorySync.ts` implements directory junction symlink creation and migration of existing files
- [ ] `src/terminal/interactiveMenu.ts` implements rendering, navigation, and keypress actions
- [ ] Command and default invocation wired in `src/cli.ts`
- [ ] Unit tests pass for all modules

