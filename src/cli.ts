import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import { validateEnvironment } from './utils/environment.js';
import { discoverWorktrees } from './git/discoverWorktrees.js';
import { SessionStore } from './claude/sessionStore.js';
import { buildClaudeCommand } from './claude/launchClaude.js';
import { openWindowsTerminal } from './terminal/openWindowsTerminal.js';
import { TabSpec, ClaunchError } from './types/index.js';
import { getSessionLog } from './claude/sessionLog.js';
import { syncMemoryJunctions } from './claude/memorySync.js';
import { startInteractiveMenu } from './terminal/interactiveMenu.js';

function handleError(error: unknown): void {
  if (error instanceof ClaunchError) {
    console.error(error.message);
    process.exitCode = 1;
  } else {
    console.error(
      `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  }
}

export function runCli(argv: string[] = process.argv): void {
  const program = new Command();

  program
    .name('claunch')
    .description(
      'Open Claude Code sessions across Git worktrees in Windows Terminal',
    )
    .version('0.1.0')
    .option('-m, --menu', 'Launch the interactive worktree selector menu (default)')
    .option('-a, --all', 'Launch all worktrees immediately in a new window')
    .action(async (options) => {
      try {
        // 1. Verify environment and discover repo root
        const repoRoot = validateEnvironment();

        // 2. Discover active worktrees
        const worktrees = discoverWorktrees(process.cwd());
        if (worktrees.length === 0) {
          console.log('No active worktrees found.');
          return;
        }

        // 3. Load/Init session store
        const sessionStore = new SessionStore();

        // 4. Always sync memory directories across worktrees
        syncMemoryJunctions(repoRoot, worktrees);

        if (options.all) {
          // Map worktrees to terminal tabs
          const specs: TabSpec[] = worktrees.map((wt) => {
            let session = sessionStore.getSession(repoRoot, wt.branch);
            if (!session) {
              session = wt.branch;
              sessionStore.setSession(repoRoot, wt.branch, session);
            }

            const command = buildClaudeCommand(wt.path, session);

            return {
              path: wt.path,
              branch: wt.branch,
              command,
              title: wt.branch,
            };
          });

          // Open in Windows Terminal
          openWindowsTerminal(specs);
        } else {
          // Default: open interactive selection menu
          await startInteractiveMenu(repoRoot, worktrees, sessionStore, openWindowsTerminal);
        }
      } catch (error) {
        handleError(error);
      }
    });

  program
    .command('log')
    .alias('session-log')
    .argument('<branch>', 'The branch name or session UUID to read')
    .description('Print a clean dialogue log of a Claude Code session')
    .action((branch) => {
      try {
        const repoRoot = validateEnvironment();
        const logText = getSessionLog(repoRoot, branch);
        console.log(logText);
      } catch (error) {
        handleError(error);
      }
    });

  program.parse(argv);
}

try {
  const entryPath = process.argv[1] ? realpathSync(process.argv[1]) : '';
  const currentPath = fileURLToPath(import.meta.url);
  
  if (entryPath && realpathSync(currentPath) === entryPath) {
    runCli();
  }
} catch {
  // If resolution fails (e.g. process.argv[1] is undefined/invalid), do not run
}
