/**
 * Claude Code CLI command builder.
 */

/**
 * Builds the command string required to launch or resume a Claude Code session.
 *
 * @param worktreePath The absolute path of the target worktree.
 * @param sessionName Optional session identifier to resume.
 * @returns The command string suitable for running inside the worktree console.
 */
export function buildClaudeCommand(
  _worktreePath: string,
  sessionName: string | null,
): string {
  // If we have a sessionName, attempt to resume it, otherwise launch fresh.
  if (sessionName && sessionName.trim().length > 0) {
    return `claude --resume "${sessionName}"`;
  }
  return 'claude';
}
