import readline from 'node:readline';
import { Worktree, TabSpec } from '../types/index.js';
import { SessionStore } from '../claude/sessionStore.js';

/**
 * Starts an interactive console-based worktree selection menu.
 * Uses raw terminal keypress events to enable cursor navigation,
 * multi-selection, and immediate focus-retentive tab launching.
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

    function render() {
      let output = '';
      output += '\r\x1b[J'; // Clear screen below
      
      output += '🚀 \x1b[1m\x1b[35mClaunch\x1b[0m \x1b[90m- Interactive Worktree Selector\x1b[0m\n';
      output += '💡 \x1b[37mControls: ↑/↓ Navigate | Space Select | Enter Launch (New Window) | o/L Launch Tab (bg) | q Quit\x1b[0m\n';
      output += '\x1b[90m⚡───────────────────────────────────────────────────────────────────────────────────────────────────\x1b[0m\n';
      
      for (let i = 0; i < worktrees.length; i++) {
        const wt = worktrees[i];
        const isHighlighted = i === cursorIndex;
        const isSelected = selectedIndices.has(i);
        
        const cursor = isHighlighted ? '\x1b[33m ▸ \x1b[0m' : '   ';
        const checkbox = isSelected ? '🟢' : '⚪';
        
        const rawBranch = wt.isCurrent ? `${wt.branch} (current)` : wt.branch;
        const paddedBranch = rawBranch.padEnd(25);
        
        let branchFormatted = '';
        if (wt.isCurrent) {
          branchFormatted = `📌 \x1b[32m\x1b[1m${paddedBranch}\x1b[0m`;
        } else if (isHighlighted) {
          branchFormatted = `   \x1b[36m\x1b[1m${paddedBranch}\x1b[0m`;
        } else {
          branchFormatted = `   \x1b[37m${paddedBranch}\x1b[0m`;
        }
        
        const paddedPath = wt.path.padEnd(50);
        const pathFormatted = `📂 \x1b[90m${paddedPath}\x1b[0m`;
        
        const sessionVal = sessionStore.getSession(repoRoot, wt.branch);
        const sessionFormatted = sessionVal ? `💬 \x1b[33msession: ${sessionVal}\x1b[0m` : '';
        
        const line = `${cursor}${checkbox} ${branchFormatted} ${pathFormatted} ${sessionFormatted}\n`;
        output += line;
      }
      
      stdout.write(output);
    }

    render();

    const linesToMoveUp = worktrees.length + 3;

    function rewrite() {
      stdout.write(`\x1b[${linesToMoveUp}A`);
      render();
    }

    stdin.on('keypress', (str, key) => {
      if (key && key.ctrl && key.name === 'c') {
        cleanup();
        resolve();
        return;
      }

      const keyName = key ? key.name : '';

      switch (keyName) {
        case 'up':
        case 'k':
          cursorIndex = (cursorIndex - 1 + worktrees.length) % worktrees.length;
          rewrite();
          break;
          
        case 'down':
        case 'j':
          cursorIndex = (cursorIndex + 1) % worktrees.length;
          rewrite();
          break;
          
        case 'space':
          if (selectedIndices.has(cursorIndex)) {
            selectedIndices.delete(cursorIndex);
          } else {
            selectedIndices.add(cursorIndex);
          }
          rewrite();
          break;
          
        case 'q':
        case 'escape':
          cleanup();
          resolve();
          break;
          
        case 'o':
        case 'l': {
          const targetWt = worktrees[cursorIndex];
          const sessionName = sessionStore.getSession(repoRoot, targetWt.branch) || targetWt.branch;
          
          const spec: TabSpec = {
            path: targetWt.path,
            title: targetWt.branch,
            command: `claude --resume "${sessionName}"`,
          };
          
          // Open in current window, retaining focus on menu tab (0)
          openTabsFn([spec], { newWindow: false, focusMenu: true });
          
          // Output status feedback without altering row count
          stdout.write(`\r\x1b[K\x1b[36mLaunched tab for "${targetWt.branch}" in background...\x1b[0m`);
          setTimeout(() => {
            stdout.write('\r\x1b[K');
            rewrite();
          }, 1500);
          break;
        }

        case 'return': {
          const indicesToLaunch = selectedIndices.size > 0 
            ? Array.from(selectedIndices) 
            : [cursorIndex];
            
          const specs: TabSpec[] = indicesToLaunch.map((idx) => {
            const wt = worktrees[idx];
            const sessionName = sessionStore.getSession(repoRoot, wt.branch) || wt.branch;
            return {
              path: wt.path,
              title: wt.branch,
              command: `claude --resume "${sessionName}"`,
            };
          });
          
          cleanup();
          openTabsFn(specs, { newWindow: true });
          resolve();
          break;
        }
      }
    });
  });
}
