import readline from 'node:readline';
import { exec, execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname, basename, normalize } from 'node:path';
import { TabSpec } from '../types/index.js';
import { SessionStore } from '../claude/sessionStore.js';
import { discoverWorktrees } from '../git/discoverWorktrees.js';

interface ProcessInfo {
  CommandLine: string;
  ProcessId: number;
}

/**
 * Queries active node processes running Claude sessions.
 * Resiliently tries PowerShell first, falling back to wmic if needed.
 */
export function getActiveProcesses(): Promise<ProcessInfo[]> {
  return new Promise((resolve) => {
    const cmd = `powershell.exe -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name='node.exe'\\" | Select-Object -Property CommandLine, ProcessId | ConvertTo-Json"`;
    
    exec(cmd, (err, stdout) => {
      if (err || !stdout || stdout.trim() === '') {
        // Fall back to wmic
        const fallbackCmd = 'wmic process where "name=\'node.exe\'" get commandline,processid /format:list';
        exec(fallbackCmd, (fallbackErr, fallbackStdout) => {
          if (fallbackErr || !fallbackStdout) {
            resolve([]);
            return;
          }
          resolve(parseWmicListOutput(fallbackStdout));
        });
        return;
      }
      
      try {
        const parsed = JSON.parse(stdout.trim());
        const list = Array.isArray(parsed) ? parsed : [parsed];
        const results = list
          .filter((p): p is { CommandLine: string; ProcessId: number } => 
            p && typeof p.CommandLine === 'string' && typeof p.ProcessId === 'number'
          )
          .map(p => ({ CommandLine: p.CommandLine, ProcessId: p.ProcessId }));
        resolve(results);
      } catch {
        resolve([]);
      }
    });
  });
}

function parseWmicListOutput(output: string): ProcessInfo[] {
  const results: ProcessInfo[] = [];
  const blocks = output.split(/(?:\r?\n){2,}/);
  for (const block of blocks) {
    let commandLine = '';
    let processId: number | null = null;
    const lines = block.split(/\r?\n/);
    for (const line of lines) {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        if (key === 'CommandLine') {
          commandLine = value;
        } else if (key === 'ProcessId') {
          processId = parseInt(value, 10);
        }
      }
    }
    if (commandLine && processId !== null && !isNaN(processId)) {
      results.push({ CommandLine: commandLine, ProcessId: processId });
    }
  }
  return results;
}

function extractSessionName(commandLine: string): string | null {
  // Matches: --resume "sessionName", --resume 'sessionName', --resume sessionName
  const match = commandLine.match(/--resume\s+(?:"([^"]+)"|'([^']+)'|(\S+))/i);
  if (match) {
    return match[1] || match[2] || match[3] || null;
  }
  return null;
}

function branchExists(branch: string, cwd: string): boolean {
  try {
    execSync(`git show-ref --quiet refs/heads/${branch}`, { cwd, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Starts the live refreshing Instance Manager TUI.
 */
export function startInstanceManager(
  repoRoot: string,
  sessionStore: SessionStore,
  openTabsFn: (specs: TabSpec[], options?: { newWindow?: boolean; focusMenu?: boolean }) => void,
): Promise<void> {
  return new Promise((resolve) => {
    let worktrees = discoverWorktrees(repoRoot);
    let cursorIndex = 0;
    let activePids: Record<string, number> = {}; // branch name -> PID
    let hasDetectedActiveSessions = false;
    let exitCountdown: number | null = null;
    let countdownInterval: NodeJS.Timeout | null = null;
    let refreshTimeout: NodeJS.Timeout | null = null;
    let currentMessage = '';
    let messageTimeout: NodeJS.Timeout | null = null;
    let isPrompting = false;

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
      if (countdownInterval) clearInterval(countdownInterval);
      if (refreshTimeout) clearTimeout(refreshTimeout);
      if (messageTimeout) clearTimeout(messageTimeout);
      stdout.write('\x1b[?25h'); // Show cursor
      if (stdin.isTTY) {
        stdin.setRawMode(false);
      }
      stdin.pause();
      stdin.removeAllListeners('keypress');
    }

    function setMessage(msg: string, duration = 3000) {
      currentMessage = msg;
      if (messageTimeout) clearTimeout(messageTimeout);
      messageTimeout = setTimeout(() => {
        currentMessage = '';
        triggerRewrite();
      }, duration);
      triggerRewrite();
    }

    async function promptInput(question: string): Promise<string> {
      isPrompting = true;
      stdout.write('\x1b[?25h'); // Show cursor
      if (stdin.isTTY) {
        stdin.setRawMode(false);
      }
      stdin.pause();

      const rl = readline.createInterface({
        input: stdin,
        output: stdout,
      });

      return new Promise((resolvePrompt) => {
        rl.question(question, (answer) => {
          rl.close();
          if (stdin.isTTY) {
            stdin.setRawMode(true);
          }
          stdin.resume();
          stdout.write('\x1b[?25l'); // Hide cursor
          isPrompting = false;
          resolvePrompt(answer.trim());
        });
      });
    }

    async function handleAddWorktree() {
      // Temporarily clear screen area below
      stdout.write('\r\x1b[J');
      const branchName = await promptInput('\x1b[36mEnter new or existing branch name:\x1b[0m ');
      if (!branchName) {
        setMessage('❌ Worktree creation cancelled.');
        triggerRewrite();
        return;
      }

      const parentDir = dirname(repoRoot);
      const repoName = basename(repoRoot);
      const suggestedPath = join(parentDir, `${repoName}-${branchName}`);

      const pathInput = await promptInput(`\x1b[36mEnter worktree path (default: ${suggestedPath}):\x1b[0m `);
      const targetPath = pathInput ? normalize(pathInput) : suggestedPath;

      if (existsSync(targetPath)) {
        setMessage(`❌ Path already exists: ${targetPath}`);
        triggerRewrite();
        return;
      }

      setMessage(`⚙️ Adding worktree for "${branchName}"...`);
      try {
        const localExists = branchExists(branchName, repoRoot);
        const gitCmd = localExists
          ? `git worktree add "${targetPath}" "${branchName}"`
          : `git worktree add "${targetPath}" -b "${branchName}"`;

        execSync(gitCmd, { cwd: repoRoot, stdio: 'ignore' });
        
        // Refresh worktree list
        worktrees = discoverWorktrees(repoRoot);
        cursorIndex = Math.min(cursorIndex, worktrees.length - 1);
        setMessage(`🟢 Worktree added successfully at ${targetPath}`);
      } catch (error: unknown) {
        setMessage(`❌ Git Error: ${error instanceof Error ? error.message : String(error)}`);
      }
      triggerRewrite();
    }

    function launchWorktree(index: number) {
      if (index >= worktrees.length) return;
      const wt = worktrees[index];
      const sessionName = sessionStore.getSession(repoRoot, wt.branch) || wt.branch;
      
      const spec: TabSpec = {
        path: wt.path,
        title: wt.branch,
        command: `claude --resume "${sessionName}"`,
      };

      openTabsFn([spec], { newWindow: false, focusMenu: false });
      setMessage(`🚀 Spawning Claude tab for "${wt.branch}" in the background...`);
    }

    function render() {
      let output = '';
      output += '\r\x1b[J'; // Clear screen below
      
      output += '🖥️  \x1b[1m\x1b[35mClaunch\x1b[0m \x1b[90m- Instance Manager\x1b[0m\n';
      output += '💡 \x1b[37mControls: ↑/↓ Navigate | Enter/l Launch Tab (bg) | a Add Worktree | q Quit\x1b[0m\n';
      output += '\x1b[90m⚡───────────────────────────────────────────────────────────────────────────────────────────────────\x1b[0m\n';
      
      for (let i = 0; i < worktrees.length; i++) {
        const wt = worktrees[i];
        const isHighlighted = i === cursorIndex;
        const cursor = isHighlighted ? '\x1b[33m ▸ \x1b[0m' : '   ';
        
        const pid = activePids[wt.branch];
        const isActive = pid !== undefined;
        
        let statusStr = '';
        if (isActive) {
          statusStr = `\x1b[32m🟢 ACTIVE (PID: ${pid})\x1b[0m`;
        } else {
          statusStr = `\x1b[90m⚪ IDLE\x1b[0m`;
        }
        
        const rawBranch = wt.isCurrent ? `${wt.branch} (current)` : wt.branch;
        const branchFormatted = isHighlighted
          ? `\x1b[36m\x1b[1m${rawBranch.padEnd(25)}\x1b[0m`
          : `\x1b[37m${rawBranch.padEnd(25)}\x1b[0m`;
          
        const pathFormatted = `📂 \x1b[90m${wt.path}\x1b[0m`;
        
        output += `${cursor}${statusStr.padEnd(25)} ${branchFormatted} ${pathFormatted}\n`;
      }
      
      output += '\x1b[90m────────────────────────────────────────────────────────────────────────────────────────────────────\x1b[0m\n';
      
      if (currentMessage) {
        output += `  ${currentMessage}\n`;
      } else if (exitCountdown !== null) {
        output += `  \x1b[33m⚠️  All Claude sessions exited. Closing in ${exitCountdown} seconds... (Press 'l' or Enter to relaunch)\x1b[0m\n`;
      } else {
        output += `  \x1b[90mMonitoring active sessions... Refreshing every 2s\x1b[0m\n`;
      }

      stdout.write(output);
    }

    const linesToMoveUp = () => worktrees.length + 5;

    function triggerRewrite() {
      if (isPrompting) return;
      stdout.write(`\x1b[${linesToMoveUp()}A`);
      render();
    }

    async function updateProcessStatuses() {
      if (isPrompting) return;
      
      const processes = await getActiveProcesses();
      const newPids: Record<string, number> = {};
      
      for (const p of processes) {
        const sessionName = extractSessionName(p.CommandLine);
        if (sessionName) {
          // Find if this session matches a worktree
          for (const wt of worktrees) {
            const mapped = sessionStore.getSession(repoRoot, wt.branch) || wt.branch;
            if (mapped === sessionName || wt.branch === sessionName) {
              newPids[wt.branch] = p.ProcessId;
            }
          }
        }
      }

      activePids = newPids;
      const activeCount = Object.keys(activePids).length;

      if (activeCount > 0) {
        hasDetectedActiveSessions = true;
        if (exitCountdown !== null) {
          exitCountdown = null;
          if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
          }
        }
      } else if (hasDetectedActiveSessions && exitCountdown === null) {
        // Drop to 0 active sessions after having some
        exitCountdown = 5;
        countdownInterval = setInterval(() => {
          if (exitCountdown !== null) {
            exitCountdown--;
            if (exitCountdown <= 0) {
              cleanup();
              resolve();
            } else {
              triggerRewrite();
            }
          }
        }, 1000);
      }

      triggerRewrite();
      
      // Schedule next check
      refreshTimeout = setTimeout(updateProcessStatuses, 2000);
    }

    // Initial render and refresh loop
    render();
    updateProcessStatuses();

    // Key handling
    stdin.on('keypress', (str, key) => {
      if (isPrompting) return;

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
          triggerRewrite();
          break;
          
        case 'down':
        case 'j':
          cursorIndex = (cursorIndex + 1) % worktrees.length;
          triggerRewrite();
          break;

        case 'q':
        case 'escape':
          cleanup();
          resolve();
          break;

        case 'a':
          handleAddWorktree();
          break;

        case 'l':
        case 'return':
          if (cursorIndex < worktrees.length) {
            launchWorktree(cursorIndex);
          }
          break;
      }
    });
  });
}
