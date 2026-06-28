import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import { validateEnvironment } from './utils/environment.js';
import { discoverWorktrees } from './git/discoverWorktrees.js';
import { SessionStore } from './claude/sessionStore.js';
import { buildClaudeCommand } from './claude/launchClaude.js';
import { openWindowsTerminal } from './terminal/openWindowsTerminal.js';
import { TabSpec, ClaunchError } from './types/index.js';

export function runCli(argv: string[] = process.argv): void {
  const program = new Command();

  program
    .name('claunch')
    .description(
      'Open Claude Code sessions across Git worktrees in Windows Terminal',
    )
    .version('0.1.0')
    .action(() => {
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

        // 4. Map worktrees to terminal tabs
        const specs: TabSpec[] = worktrees.map((wt) => {
          let session = sessionStore.getSession(repoRoot, wt.branch);
          if (!session) {
            // PRD: "After first successful launch, remember the mapping forever."
            // Fall back to the branch name as session name and save it.
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

        // 5. Open in Windows Terminal
        openWindowsTerminal(specs);
      } catch (error) {
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
