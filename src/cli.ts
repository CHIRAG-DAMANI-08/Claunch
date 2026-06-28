/**
 * CLI entry point for claunch.
 *
 * Currently a minimal Commander.js setup. Full orchestration
 * is wired in Phase 5 (CLI Integration).
 */

import { Command } from 'commander';

const program = new Command();

program
  .name('claunch')
  .description(
    'Open Claude Code sessions across Git worktrees in Windows Terminal',
  )
  .version('0.1.0')
  .action(() => {
    console.log(
      'claunch: Not yet implemented. Run /gsd-execute-phase 5 to wire up.',
    );
  });

program.parse();
