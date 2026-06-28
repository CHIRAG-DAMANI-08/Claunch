# Pitfalls Research: Claunch

## Critical Pitfalls

### 1. Windows `child_process.spawn` ENOENT
**Warning Signs:** `ENOENT` error when spawning `git`, `claude`, or `wt`
**Why It Happens:** Windows doesn't resolve `.cmd`/`.ps1` extensions like Unix resolves executables
**Prevention:**
- Always use `{ shell: true }` when spawning CLI tools on Windows
- Or explicitly use `.cmd` extension (e.g., `claude.cmd`)
- Best approach for claunch: spawn `wt.exe` with `{ shell: true }` since we're launching through PowerShell
**Phase:** Phase 1 (terminal launcher implementation)

### 2. PowerShell Semicolon Escaping
**Warning Signs:** `wt.exe` opens only one tab instead of multiple
**Why It Happens:** PowerShell interprets `;` as its own statement separator, so `wt cmd ; new-tab cmd` becomes TWO PowerShell commands instead of one wt command
**Prevention:**
- Escape semicolons: `` `; `` in PowerShell
- Or pass the entire command as a single string via `cmd.exe /c`
- Or use `--` separator in `spawn` argument arrays
**Phase:** Phase 2 (terminal launcher implementation)

### 3. Paths with Spaces
**Warning Signs:** Commands fail for paths like `C:\Users\John Smith\Projects`
**Why It Happens:** Unquoted paths with spaces are split into multiple arguments
**Prevention:**
- Always quote paths in constructed command strings
- Use `path.join()` for path construction
- Test with paths containing spaces
**Phase:** Phase 1 (all modules that handle paths)

### 4. JSON File Corruption
**Warning Signs:** `sessions.json` becomes invalid JSON, crashes on next run
**Why It Happens:** Process killed mid-write; concurrent writes from multiple claunch invocations
**Prevention:**
- Write to temp file, then rename (atomic write)
- Use `JSON.parse` with try/catch and fallback to empty state
- Never append to JSON files — always rewrite the full file
**Phase:** Phase 1 (session store implementation)

### 5. Windows Path Normalization
**Warning Signs:** Same repo appears as different entries: `C:\Code\vaani` vs `c:\code\vaani` vs `C:/Code/vaani`
**Why It Happens:** Windows paths are case-insensitive but Git outputs them case-sensitively
**Prevention:**
- Normalize all paths before using as keys: lowercase, forward slashes, resolved
- Use `path.resolve()` then normalize consistently
**Phase:** Phase 1 (session store key generation)

### 6. Missing `~/.claunch/` Directory
**Warning Signs:** ENOENT when trying to write `sessions.json` on first run
**Why It Happens:** Directory doesn't exist until first use
**Prevention:**
- Use `fs.mkdir` with `{ recursive: true }` before writing
- Handle in SessionStore constructor or write method
**Phase:** Phase 1 (session store)

### 7. Git Not in a Worktree
**Warning Signs:** `git worktree list` shows only one entry (the main tree)
**Why It Happens:** User has a normal repo with no additional worktrees
**Prevention:**
- This is valid — claunch should still work with a single worktree
- Don't treat "only one worktree" as an error
- Open one Windows Terminal tab with claude in the single worktree
**Phase:** Phase 1 (git discovery)

### 8. Bare Repository as Main Worktree
**Warning Signs:** `git worktree list --porcelain` output includes `bare` attribute
**Why It Happens:** Some worktree workflows use bare repos as the root
**Prevention:**
- Skip bare worktrees in the tab list
- Don't try to open Claude in a bare repo (no working directory)
**Phase:** Phase 1 (git discovery)

### 9. `wt.exe` Not in PATH
**Warning Signs:** Tool installed from Microsoft Store but not in system PATH
**Why It Happens:** Some Windows Terminal installations don't add wt.exe to PATH
**Prevention:**
- Check PATH first, clear error message
- Document that Windows Terminal must be installed from Microsoft Store or winget
**Phase:** Phase 1 (environment validation)

### 10. ESM + TypeScript `bin` Script Issues
**Warning Signs:** `npm install -g` works but `claunch` command fails
**Why It Happens:** Shebang line issues, missing `.js` extension in ESM imports, or tsup misconfiguration
**Prevention:**
- Use tsup to bundle into a single file (avoids import resolution issues)
- Test the bundled output directly: `node dist/cli.js`
- Ensure `bin` field in package.json points to the bundled output
- Add proper shebang: `#!/usr/bin/env node`
**Phase:** Final phase (packaging)

## Risk Matrix

| Pitfall | Likelihood | Impact | Phase |
|---------|-----------|--------|-------|
| spawn ENOENT | High | Blocks all execution | 1 |
| Semicolon escaping | High | Opens wrong number of tabs | 2 |
| Paths with spaces | Medium | Breaks for some users | 1 |
| JSON corruption | Low | Loses session mappings | 1 |
| Path normalization | High | Duplicate entries | 1 |
| Missing directory | High | Crashes on first run | 1 |
| Single worktree | Medium | Confusing behavior | 1 |
| Bare repo | Low | Unexpected error | 1 |
| wt.exe not in PATH | Medium | Tool doesn't work | 1 |
| ESM bin issues | Medium | Install works, run fails | Final |

---
*Researched: 2026-06-28*
