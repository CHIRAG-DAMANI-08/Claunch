import readline from 'node:readline';
import { execSync } from 'node:child_process';
import { dirname, basename, join } from 'node:path';
import type { Worktree, TabSpec } from '../types/index.js';
import { SessionStore } from '../claude/sessionStore.js';
import { discoverWorktrees } from '../git/discoverWorktrees.js';
import {
  getLocalBranches,
  findParentBranch,
  getDiffStats,
  discoverFeatures,
} from '../git/gitStats.js';

/**
 * Starts a revamped interactive console-based worktree selection menu.
 * Displays branch statistics and parent relationships.
 * Supports codebase feature scanning, git merge, and worktree deletion.
 */
export function startInteractiveMenu(
  repoRoot: string,
  worktrees: Worktree[],
  sessionStore: SessionStore,
  openTabsFn: (specs: TabSpec[], options?: { newWindow?: boolean; focusMenu?: boolean }) => void,
): Promise<void> {
  return new Promise((resolve) => {
    if (worktrees.length === 0) {
      resolve();
      return;
    }

    let cursorIndex = 0;
    const selectedIndices = new Set<number>();

    // UI state machine: 'main', 'new_worktree_feature', 'confirm_delete', 'confirm_merge', 'message_pause'
    let menuState: 'main' | 'new_worktree_feature' | 'confirm_delete' | 'confirm_merge' | 'message_pause' =
      'main';
    let subCursorIndex = 0;
    let messageText = '';
    let showConfig = false;

    // Codebase scanning features list
    let discoveredFeaturesList: string[] = [];

    // Cached branch analytics
    let activeWorktrees = [...worktrees];
    const branchStats: Record<
      string,
      { parent: string; diff: { insertions: number; deletions: number } | null }
    > = {};

    const stdin = process.stdin;
    const stdout = process.stdout;

    readline.emitKeypressEvents(stdin);
    if (stdin.isTTY) {
      stdin.setRawMode(true);
    }
    stdin.resume();

    // Hide cursor
    stdout.write('\x1b[?25l');

    function cleanup() {
      // Show cursor and clean up raw mode
      stdout.write('\x1b[?25h');
      if (stdin.isTTY) {
        stdin.setRawMode(false);
      }
      stdin.pause();
      stdin.removeAllListeners('keypress');
    }

    // Helper to cache parent branch and diff stats for active worktrees
    function refreshStats() {
      const localBranches = getLocalBranches(repoRoot);
      for (const wt of activeWorktrees) {
        if (wt.branch === 'main' || wt.branch === 'master') {
          branchStats[wt.branch] = { parent: wt.branch, diff: null };
          continue;
        }
        const parent = findParentBranch(wt.branch, localBranches, repoRoot);
        const diff = getDiffStats(parent, wt.branch, repoRoot);
        branchStats[wt.branch] = { parent, diff };
      }
    }

    // Initial cache
    refreshStats();

    function refreshWorktreesList() {
      activeWorktrees = discoverWorktrees(repoRoot);
      refreshStats();
      if (cursorIndex >= activeWorktrees.length) {
        cursorIndex = Math.max(0, activeWorktrees.length - 1);
      }
    }

    // Prompt for text input in TUI cleanly by temporarily suspending raw mode
    function promptTextInput(question: string, defaultValue = ''): Promise<string> {
      return new Promise((resolvePrompt) => {
        const wasRaw = stdin.isRaw;
        if (wasRaw) {
          stdin.setRawMode(false);
        }
        stdout.write('\r\x1b[K'); // clear current line

        const rl = readline.createInterface({
          input: stdin,
          output: stdout,
        });

        stdout.write('\x1b[?25h'); // show cursor

        const displayQuestion = defaultValue ? `${question} (${defaultValue}): ` : `${question}: `;

        rl.question(displayQuestion, (answer) => {
          rl.close();
          stdout.write('\x1b[?25l'); // hide cursor
          if (wasRaw) {
            stdin.setRawMode(true);
            stdin.resume();
          }
          resolvePrompt(answer.trim() || defaultValue);
        });
      });
    }

    let lastLineCount = 0;

    function render() {
      // Clean previous rendering frame
      if (lastLineCount > 0) {
        stdout.write(`\x1b[${lastLineCount}A`);
      }
      stdout.write('\x1b[J'); // Clear screen below

      let output = '';

      if (menuState === 'main') {
        output += 'Select a worktree to start or resume a Claude Code session:\n\n';

        for (let i = 0; i < activeWorktrees.length; i++) {
          const wt = activeWorktrees[i];
          const isHighlighted = i === cursorIndex;
          const isSelected = selectedIndices.has(i);

          const cursor = isHighlighted ? '\x1b[33m> \x1b[0m' : '  ';
          const indexStr = `${i} >`;
          const checkbox = isSelected ? '🟢' : '⚪';

          const stats = branchStats[wt.branch];
          let diffStr = '';
          if (stats && stats.diff && (stats.diff.insertions > 0 || stats.diff.deletions > 0)) {
            const ins = stats.diff.insertions > 0 ? `\x1b[32m+${stats.diff.insertions}\x1b[0m` : '';
            const del = stats.diff.deletions > 0 ? `\x1b[31m-${stats.diff.deletions}\x1b[0m` : '';
            diffStr = `${ins} ${del}`.trim();
          }

          const parentStr = stats && stats.parent ? `\x1b[90m(${stats.parent})\x1b[0m` : '';

          const paddedBranch = wt.branch.padEnd(25);
          const paddedDiff = diffStr ? diffStr.padEnd(20) : ''.padEnd(20);

          let rowText = '';
          if (isHighlighted) {
            rowText = `\x1b[36m\x1b[1m${paddedBranch}\x1b[0m`;
          } else {
            rowText = `\x1b[37m${paddedBranch}\x1b[0m`;
          }

          output += `${cursor}${indexStr} ${checkbox} ${rowText}  ${paddedDiff}  ${parentStr}\n`;
        }

        output += '\x1b[90m⚡───────────────────────────────────────────────────────────────────────────────────────────────────\x1b[0m\n';
        output += '  N ⊕ New Worktree\n';
        output += '  M ⧓ Merge Worktree\n';
        output += '  D ✕ Delete Worktree\n';
        output += '  C ⚙ Configuration\n';
        output += '  Q ⎋ Exit\n';

        if (showConfig) {
          output += '\n\x1b[33mActive Session Mappings:\x1b[0m\n';
          const mappings = sessionStore.getSessionsForRepo(repoRoot);
          const keys = Object.keys(mappings);
          if (keys.length === 0) {
            output += '  No active session mappings found.\n';
          } else {
            for (const key of keys) {
              output += `  branch \x1b[36m${key}\x1b[0m -> session \x1b[35m${mappings[key]}\x1b[0m\n`;
            }
          }
        }
      } else if (menuState === 'new_worktree_feature') {
        output += '💡 Select a codebase module/feature to base the new worktree on:\n\n';

        for (let i = 0; i < discoveredFeaturesList.length; i++) {
          const feat = discoveredFeaturesList[i];
          const isHighlighted = i === subCursorIndex;
          const cursor = isHighlighted ? '\x1b[33m> \x1b[0m' : '  ';
          const indexStr = `${i} >`;

          if (isHighlighted) {
            output += `${cursor}${indexStr} \x1b[36m\x1b[1m${feat.padEnd(25)}\x1b[0m  \x1b[90m(Discovered Feature)\x1b[0m\n`;
          } else {
            output += `${cursor}${indexStr} \x1b[37m${feat.padEnd(25)}\x1b[0m  \x1b[90m(Discovered Feature)\x1b[0m\n`;
          }
        }

        const isCustomHighlighted = subCursorIndex === discoveredFeaturesList.length;
        const customCursor = isCustomHighlighted ? '\x1b[33m> \x1b[0m' : '  ';
        const customIndexStr = `${discoveredFeaturesList.length} >`;
        if (isCustomHighlighted) {
          output += `${customCursor}${customIndexStr} \x1b[35m\x1b[1m[ Create Custom Branch ]\x1b[0m\n`;
        } else {
          output += `${customCursor}${customIndexStr} \x1b[37m  Create Custom Branch  \x1b[0m\n`;
        }

        output += '\x1b[90m⚡───────────────────────────────────────────────────────────────────────────────────────────────────\x1b[0m\n';
        output += '💡 Controls: ↑/↓ Navigate | Enter Select | Q Cancel\n';
      } else if (menuState === 'confirm_delete') {
        const wt = activeWorktrees[cursorIndex];
        output += `⚠️ \x1b[1m\x1b[31mConfirm Deletion\x1b[0m\n`;
        output += `Are you sure you want to delete worktree at \x1b[36m"${wt.path}"\x1b[0m and branch \x1b[36m"${wt.branch}"\x1b[0m?\n\n`;
        output += `Press \x1b[1m\x1b[31mY\x1b[0m to delete, or any other key to cancel.\n`;
      } else if (menuState === 'confirm_merge') {
        const wt = activeWorktrees[cursorIndex];
        const stats = branchStats[wt.branch];
        const parent = stats?.parent || 'main';
        output += `⧓ \x1b[1m\x1b[36mConfirm Merge\x1b[0m\n`;
        output += `Are you sure you want to merge branch \x1b[36m"${wt.branch}"\x1b[0m into its parent \x1b[36m"${parent}"\x1b[0m?\n\n`;
        output += `Press \x1b[1m\x1b[36mY\x1b[0m to merge, or any other key to cancel.\n`;
      } else if (menuState === 'message_pause') {
        output += `${messageText}\n\n`;
        output += `Press any key to return to the menu...`;
      }

      stdout.write(output);
      lastLineCount = output.split('\n').length - 1;
    }

    render();

    function rewrite() {
      render();
    }

    // Helper to check local branch status
    function branchExistsLocally(branch: string, cwd: string): boolean {
      try {
        execSync(`git show-ref --quiet refs/heads/${branch}`, { cwd, stdio: 'ignore' });
        return true;
      } catch {
        return false;
      }
    }

    stdin.on('keypress', async (str, key) => {
      if (key && key.ctrl && key.name === 'c') {
        cleanup();
        resolve();
        return;
      }

      const keyName = key ? key.name : '';
      const char = str || (key && key.sequence) || '';
      const upperChar = char.toUpperCase();

      if (menuState === 'main') {
        // Digit selection
        if (/^[0-9]$/.test(char)) {
          const index = parseInt(char, 10);
          if (index < activeWorktrees.length) {
            cursorIndex = index;
            rewrite();
          }
          return;
        }

        switch (keyName) {
          case 'up':
          case 'k':
            cursorIndex = (cursorIndex - 1 + activeWorktrees.length) % activeWorktrees.length;
            rewrite();
            break;

          case 'down':
          case 'j':
            cursorIndex = (cursorIndex + 1) % activeWorktrees.length;
            rewrite();
            break;

          case 'space':
            if (cursorIndex < activeWorktrees.length) {
              if (selectedIndices.has(cursorIndex)) {
                selectedIndices.delete(cursorIndex);
              } else {
                selectedIndices.add(cursorIndex);
              }
              rewrite();
            }
            break;

          case 'o':
          case 'l': {
            // Launch in background
            if (cursorIndex < activeWorktrees.length) {
              const targetWt = activeWorktrees[cursorIndex];
              const sessionName =
                sessionStore.getSession(repoRoot, targetWt.branch) || targetWt.branch;

              const spec: TabSpec = {
                path: targetWt.path,
                branch: targetWt.branch,
                title: targetWt.branch,
                command: `claude --resume "${sessionName}"`,
              };

              openTabsFn([spec], { newWindow: false, focusMenu: true });

              stdout.write(`\r\x1b[K\x1b[36mLaunched tab for "${targetWt.branch}" in background...\x1b[0m`);
              setTimeout(() => {
                stdout.write('\r\x1b[K');
                rewrite();
              }, 1500);
            }
            break;
          }

          case 'return': {
            if (activeWorktrees.length === 0) break;

            const indicesToLaunch =
              selectedIndices.size > 0
                ? Array.from(selectedIndices)
                : [cursorIndex];

            const managerSpec: TabSpec = {
              path: repoRoot,
              branch: 'manager',
              command: 'claunch manage',
              title: 'manager',
            };

            const specs: TabSpec[] = indicesToLaunch.map((idx) => {
              const wt = activeWorktrees[idx];
              const sessionName = sessionStore.getSession(repoRoot, wt.branch) || wt.branch;
              return {
                path: wt.path,
                branch: wt.branch,
                title: wt.branch,
                command: `claude --resume "${sessionName}"`,
              };
            });

            cleanup();
            openTabsFn([managerSpec, ...specs], { newWindow: true });
            resolve();
            break;
          }

          default:
            if (upperChar === 'Q' || keyName === 'q' || keyName === 'escape') {
              cleanup();
              resolve();
            } else if (upperChar === 'N' || keyName === 'n') {
              // Codebase Feature Scan
              discoveredFeaturesList = discoverFeatures(repoRoot);
              subCursorIndex = 0;
              menuState = 'new_worktree_feature';
              rewrite();
            } else if (upperChar === 'M' || keyName === 'm') {
              // Merge worktree branch
              if (activeWorktrees.length > 0) {
                const wt = activeWorktrees[cursorIndex];
                if (wt.branch !== 'main' && wt.branch !== 'master') {
                  menuState = 'confirm_merge';
                  rewrite();
                }
              }
            } else if (upperChar === 'D' || keyName === 'd') {
              // Delete worktree branch
              if (activeWorktrees.length > 0) {
                const wt = activeWorktrees[cursorIndex];
                if (!wt.isCurrent) {
                  menuState = 'confirm_delete';
                  rewrite();
                }
              }
            } else if (upperChar === 'C' || keyName === 'c') {
              showConfig = !showConfig;
              rewrite();
            }
            break;
        }
      } else if (menuState === 'new_worktree_feature') {
        const totalSubItems = discoveredFeaturesList.length + 1;

        if (/^[0-9]$/.test(char)) {
          const index = parseInt(char, 10);
          if (index < totalSubItems) {
            subCursorIndex = index;
            rewrite();
          }
          return;
        }

        switch (keyName) {
          case 'up':
          case 'k':
            subCursorIndex = (subCursorIndex - 1 + totalSubItems) % totalSubItems;
            rewrite();
            break;

          case 'down':
          case 'j':
            subCursorIndex = (subCursorIndex + 1) % totalSubItems;
            rewrite();
            break;

          case 'return': {
            let branchName = '';
            if (subCursorIndex < discoveredFeaturesList.length) {
              const selectedFeature = discoveredFeaturesList[subCursorIndex];
              const parts = selectedFeature.split('/');
              const folderName = parts[parts.length - 1];
              branchName = `feature/${folderName}`;
            }

            // Temporarily clear raw mode to prompt
            cleanup();

            const finalBranchName = await promptTextInput(
              'Enter branch name for the new worktree',
              branchName,
            );

            const parentDir = dirname(repoRoot);
            const repoName = basename(repoRoot);
            const safeBranch = finalBranchName.replace(/\//g, '-');
            const defaultPath = join(parentDir, `${repoName}-${safeBranch}`);

            const finalPath = await promptTextInput(
              'Enter path for the new worktree',
              defaultPath,
            );

            // Re-hide cursor and restore TUI raw input
            stdout.write('\x1b[?25l');
            if (stdin.isTTY) {
              stdin.setRawMode(true);
            }
            stdin.resume();

            // Run creation command
            try {
              const exists = branchExistsLocally(finalBranchName, repoRoot);
              const gitCmd = exists
                ? `git worktree add "${finalPath}" "${finalBranchName}"`
                : `git worktree add "${finalPath}" -b "${finalBranchName}"`;

              execSync(gitCmd, { cwd: repoRoot, stdio: 'pipe' });

              messageText = `\x1b[32mSuccessfully created worktree "${finalBranchName}" at:\x1b[0m\n${finalPath}`;
            } catch (err: unknown) {
              const error = err as Error & { stdout?: string; stderr?: string };
              const errorMsg = error.stdout || error.stderr || error.message;
              messageText = `\x1b[31mFailed to create worktree:\x1b[0m\n${errorMsg}`;
            }

            // Force cursor recalculation on TUI refresh
            lastLineCount = 0;
            menuState = 'message_pause';
            refreshWorktreesList();
            rewrite();
            break;
          }

          default:
            if (upperChar === 'Q' || keyName === 'q' || keyName === 'escape') {
              menuState = 'main';
              rewrite();
            }
            break;
        }
      } else if (menuState === 'confirm_delete') {
        if (upperChar === 'Y' || keyName === 'y') {
          const wt = activeWorktrees[cursorIndex];
          try {
            execSync(`git worktree remove "${wt.path}"`, { cwd: repoRoot, stdio: 'pipe' });
            try {
              execSync(`git branch -d "${wt.branch}"`, { cwd: repoRoot, stdio: 'pipe' });
            } catch {
              // Force delete if not fully merged
              execSync(`git branch -D "${wt.branch}"`, { cwd: repoRoot, stdio: 'pipe' });
            }
            messageText = `\x1b[32mSuccessfully deleted worktree and branch "${wt.branch}".\x1b[0m`;
          } catch (err: unknown) {
            const error = err as Error & { stdout?: string; stderr?: string };
            const errorMsg = error.stdout || error.stderr || error.message;
            messageText = `\x1b[31mFailed to delete worktree:\x1b[0m\n${errorMsg}`;
          }
          lastLineCount = 0;
          menuState = 'message_pause';
          refreshWorktreesList();
          rewrite();
        } else {
          menuState = 'main';
          rewrite();
        }
      } else if (menuState === 'confirm_merge') {
        if (upperChar === 'Y' || keyName === 'y') {
          const wt = activeWorktrees[cursorIndex];
          const stats = branchStats[wt.branch];
          const parent = stats?.parent || 'main';
          const parentWt = activeWorktrees.find((w) => w.branch === parent);

          if (parentWt) {
            try {
              const mergeOutput = execSync(`git merge "${wt.branch}" --no-edit`, {
                cwd: parentWt.path,
                stdio: 'pipe',
                encoding: 'utf-8',
              });
              messageText = `\x1b[32mMerge successful:\x1b[0m\n${mergeOutput}`;
            } catch (err: unknown) {
              const error = err as Error & { stdout?: string; stderr?: string };
              const errorMsg = error.stdout || error.stderr || error.message;
              messageText = `\x1b[31mMerge failed or has conflicts:\x1b[0m\n${errorMsg}`;
            }
          } else {
            messageText = `\x1b[31mCould not find parent branch "${parent}" checked out in any worktree to run merge.\x1b[0m`;
          }
          lastLineCount = 0;
          menuState = 'message_pause';
          refreshWorktreesList();
          rewrite();
        } else {
          menuState = 'main';
          rewrite();
        }
      } else if (menuState === 'message_pause') {
        menuState = 'main';
        rewrite();
      }
    });
  });
}
