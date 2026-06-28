import { describe, it, expect, vi, beforeEach } from 'vitest';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { cleanPathToProjectName, getSessionLog } from '../sessionLog.js';
import { ClaunchError } from '../../types/index.js';

vi.mock('node:fs', () => {
  return {
    readdirSync: vi.fn(),
    statSync: vi.fn(),
    readFileSync: vi.fn(),
  };
});

vi.mock('node:os', () => {
  return {
    homedir: vi.fn(() => 'C:\\Users\\test'),
  };
});

import { readdirSync, statSync, readFileSync } from 'node:fs';

const mockedReaddirSync = vi.mocked(readdirSync);
const mockedStatSync = vi.mocked(statSync);
const mockedReadFileSync = vi.mocked(readFileSync);

describe('sessionLog parsing', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('cleanPathToProjectName', () => {
    it('replaces non-alphanumeric characters with dashes', () => {
      expect(cleanPathToProjectName('C:\\Code\\vaani')).toBe('C--Code-vaani');
      expect(cleanPathToProjectName('C:\\Code\\vaani\\.worktrees\\channels-v2')).toBe(
        'C--Code-vaani--worktrees-channels-v2',
      );
    });
  });

  describe('getSessionLog', () => {
    const repoRoot = 'C:\\Code\\vaani';
    const projectsDir = 'C:\\Users\\test\\.claude\\projects';

    it('throws CLAUDE_DIR_NOT_FOUND when projects dir does not exist', () => {
      mockedStatSync.mockImplementationOnce(() => {
        throw new Error('Not found');
      });

      expect(() => getSessionLog(repoRoot, 'main')).toThrow(
        new ClaunchError('Claude project directory not found.', 'CLAUDE_DIR_NOT_FOUND'),
      );
    });

    it('throws NO_SESSIONS_FOUND when no matching repo projects folder exists', () => {
      mockedStatSync.mockReturnValueOnce({ isDirectory: () => true } as any);
      mockedReaddirSync.mockReturnValueOnce([
        'C--Users-Chirag--claude' as any, // non-matching
      ]);

      expect(() => getSessionLog(repoRoot, 'main')).toThrow(
        new ClaunchError('No Claude sessions found for this repository.', 'NO_SESSIONS_FOUND'),
      );
    });

    it('throws SESSION_NOT_FOUND when branch query is not matched in logs', () => {
      mockedStatSync.mockReturnValue({ isDirectory: () => true } as any);
      mockedReaddirSync
        .mockReturnValueOnce(['C--Code-vaani'] as any) // first call in getSessionLog
        .mockReturnValueOnce(['session-12345.jsonl'] as any); // second call inside loop
      mockedReadFileSync.mockReturnValueOnce(
        JSON.stringify({ gitBranch: 'feature-abc' }), // first peek line
      );

      expect(() => getSessionLog(repoRoot, 'main')).toThrow(
        new ClaunchError('No session log found matching branch or session ID "main".', 'SESSION_NOT_FOUND'),
      );
    });

    it('parses and formats logs correctly for a matching branch', () => {
      mockedStatSync.mockReturnValue({ isDirectory: () => true, mtimeMs: 1000 } as any);
      mockedReaddirSync
        .mockReturnValueOnce(['C--Code-vaani'] as any)
        .mockReturnValueOnce(['session-12345.jsonl'] as any);
      
      const logLines = [
        JSON.stringify({ gitBranch: 'main', type: 'info' }),
        JSON.stringify({
          type: 'user',
          message: { role: 'user', content: 'hello' },
        }),
        JSON.stringify({
          type: 'user',
          message: { role: 'user', content: '<local-command-caveat>Ignore stdout</local-command-caveat>' },
        }),
        JSON.stringify({
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: 'Hi! How can I help you?' }],
          },
        }),
      ].join('\n');

      mockedReadFileSync.mockReturnValue(logLines);

      const result = getSessionLog(repoRoot, 'main');
      expect(result).toContain('# Claude Session Log: main (session-12345)');
      expect(result).toContain('### **User**:\nhello');
      expect(result).toContain('### **Claude**:\nHi! How can I help you?');
      expect(result).not.toContain('Ignore stdout');
    });

    it('allows searching by session ID (uuid)', () => {
      mockedStatSync.mockReturnValue({ isDirectory: () => true, mtimeMs: 1000 } as any);
      mockedReaddirSync
        .mockReturnValueOnce(['C--Code-vaani'] as any)
        .mockReturnValueOnce(['session-uuid-999.jsonl'] as any);
      
      const logLines = [
        JSON.stringify({ gitBranch: 'main' }),
        JSON.stringify({
          type: 'user',
          message: { role: 'user', content: 'uuid test' },
        }),
      ].join('\n');

      mockedReadFileSync.mockReturnValue(logLines);

      const result = getSessionLog(repoRoot, 'session-uuid-999');
      expect(result).toContain('# Claude Session Log: main (session-uuid-999)');
      expect(result).toContain('### **User**:\nuuid test');
    });
  });
});
