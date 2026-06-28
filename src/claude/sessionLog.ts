import { join } from 'node:path';
import { homedir } from 'node:os';
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { ClaunchError } from '../types/index.js';

/**
 * Normalizes a path to the Claude project directory name format.
 * Replaces all non-alphanumeric characters with a dash.
 */
export function cleanPathToProjectName(filePath: string): string {
  return filePath.replace(/[^a-zA-Z0-9]/g, '-');
}

interface ParsedSession {
  filePath: string;
  mtime: number;
  gitBranch?: string;
  sessionId: string;
}

/**
 * Locates and parses the dialogue history for a given branch or session ID.
 * Scans ~/.claude/projects/ directories corresponding to the repository.
 */
export function getSessionLog(repoRoot: string, query: string): string {
  const projectsDir = join(homedir(), '.claude', 'projects');
  
  let exists = false;
  try {
    const stats = statSync(projectsDir);
    exists = stats.isDirectory();
  } catch {
    // Dir doesn't exist
  }

  if (!exists) {
    throw new ClaunchError('Claude project directory not found.', 'CLAUDE_DIR_NOT_FOUND');
  }

  const cleanedRepoRoot = cleanPathToProjectName(repoRoot);
  
  // Find all folders starting with the cleaned repo root prefix
  let projectFolders: string[] = [];
  try {
    projectFolders = readdirSync(projectsDir)
      .filter((name) => name.startsWith(cleanedRepoRoot))
      .map((name) => join(projectsDir, name));
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    throw new ClaunchError(`Failed to read Claude projects directory: ${errorMsg}`, 'READ_ERROR');
  }

  if (projectFolders.length === 0) {
    throw new ClaunchError('No Claude sessions found for this repository.', 'NO_SESSIONS_FOUND');
  }

  // Scan all project folders for .jsonl files
  const sessions: ParsedSession[] = [];
  for (const folder of projectFolders) {
    try {
      const files = readdirSync(folder);
      for (const file of files) {
        if (file.endsWith('.jsonl')) {
          const filePath = join(folder, file);
          const stat = statSync(filePath);
          const sessionId = file.slice(0, -6);
          
          // Peek the file to extract gitBranch
          let gitBranch: string | undefined;
          try {
            const content = readFileSync(filePath, 'utf8');
            const lines = content.split('\n').filter((l) => l.trim().length > 0);
            // Search for gitBranch in any of the lines (usually in the first message line)
            for (const line of lines) {
              try {
                const parsed = JSON.parse(line);
                if (parsed.gitBranch) {
                  gitBranch = parsed.gitBranch;
                  break;
                }
              } catch {
                // Ignore parse error on partial lines
              }
            }
          } catch {
            // Ignore read errors
          }

          sessions.push({
            filePath,
            mtime: stat.mtimeMs,
            gitBranch,
            sessionId,
          });
        }
      }
    } catch {
      // Ignore folder read errors
    }
  }

  if (sessions.length === 0) {
    throw new ClaunchError('No Claude session logs found.', 'NO_LOGS_FOUND');
  }

  // Search by query: matches session ID or gitBranch name
  let targetSession = sessions.find((s) => s.sessionId === query);
  if (!targetSession) {
    // Try matching branch name (case-insensitive)
    const matchingSessions = sessions.filter(
      (s) => s.gitBranch && s.gitBranch.toLowerCase() === query.toLowerCase(),
    );
    if (matchingSessions.length > 0) {
      // Pick the latest one by mtime
      matchingSessions.sort((a, b) => b.mtime - a.mtime);
      targetSession = matchingSessions[0];
    }
  }

  if (!targetSession) {
    throw new ClaunchError(`No session log found matching branch or session ID "${query}".`, 'SESSION_NOT_FOUND');
  }

  // Parse the selected session log and format dialogue
  try {
    const fileContent = readFileSync(targetSession.filePath, 'utf8');
    const lines = fileContent.split('\n').filter((l) => l.trim().length > 0);
    const dialog: string[] = [];
    
    dialog.push(`# Claude Session Log: ${targetSession.gitBranch || 'Unknown Branch'} (${targetSession.sessionId})`);
    dialog.push(`Last Active: ${new Date(targetSession.mtime).toLocaleString()}\n`);

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.type === 'user' && parsed.message && parsed.message.content) {
          const content = parsed.message.content;
          // Ignore command execution stdout and local metadata caveats
          if (
            content.includes('<local-command-stdout>') ||
            content.includes('<local-command-caveat>') ||
            content.includes('<command-name>')
          ) {
            continue;
          }
          dialog.push(`### **User**:\n${content.trim()}\n`);
        } else if (parsed.type === 'assistant' && parsed.message && Array.isArray(parsed.message.content)) {
          interface ContentBlock {
            type: string;
            text?: string;
          }
          const textBlocks = (parsed.message.content as ContentBlock[])
            .filter((block) => block.type === 'text')
            .map((block) => block.text || '')
            .join('\n');
          if (textBlocks.trim().length > 0) {
            dialog.push(`### **Claude**:\n${textBlocks.trim()}\n`);
          }
        }
      } catch {
        // Skip malformed lines
      }
    }

    if (dialog.length <= 2) {
      return `${dialog.join('\n')}\n*(No dialogue found in this session. Session may contain only file backups or tool calls.)*`;
    }

    return dialog.join('\n');
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    throw new ClaunchError(`Failed to parse session log file: ${errorMsg}`, 'PARSE_ERROR');
  }
}
