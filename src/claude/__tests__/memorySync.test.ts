import { describe, it, expect, vi, beforeEach } from 'vitest';
import { join } from 'node:path';
import { syncMemoryJunctions } from '../memorySync.js';
import { Worktree } from '../../types/index.js';

vi.mock('node:fs', () => {
  return {
    readdirSync: vi.fn(),
    lstatSync: vi.fn(),
    mkdirSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    rmSync: vi.fn(),
    symlinkSync: vi.fn(),
  };
});

vi.mock('node:os', () => {
  return {
    homedir: vi.fn(() => 'C:\\Users\\test'),
  };
});

import {
  readdirSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
  symlinkSync,
} from 'node:fs';

const mockedReaddirSync = vi.mocked(readdirSync);
const mockedLstatSync = vi.mocked(lstatSync);
const mockedMkdirSync = vi.mocked(mkdirSync);
const mockedReadFileSync = vi.mocked(readFileSync);
const mockedWriteFileSync = vi.mocked(writeFileSync);
const mockedRmSync = vi.mocked(rmSync);
const mockedSymlinkSync = vi.mocked(symlinkSync);

describe('memorySync junctions', () => {
  const repoRoot = 'C:\\Code\\vaani';
  const worktrees: Worktree[] = [
    { path: 'C:\\Code\\vaani', branch: 'main', isMain: true, isCurrent: false },
    { path: 'C:\\Code\\vaani\\.worktrees\\channels-v2', branch: 'feat/channels-v2', isMain: false, isCurrent: true },
  ];

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('creates directory junctions when the worktree memory folder does not exist', () => {
    // Mock that main directories exist, but worktree memory folder throws (does not exist)
    mockedLstatSync.mockImplementation((p: any) => {
      if (p.toString().endsWith('channels-v2\\memory')) {
        throw new Error('Not found');
      }
      return { isSymbolicLink: () => false } as any;
    });

    syncMemoryJunctions(repoRoot, worktrees);

    expect(mockedSymlinkSync).toHaveBeenCalledWith(
      'C:\\Users\\test\\.claude\\projects\\C--Code-vaani\\memory',
      'C:\\Users\\test\\.claude\\projects\\C--Code-vaani--worktrees-channels-v2\\memory',
      'junction',
    );
  });

  it('skips creation if the worktree memory folder is already a junction', () => {
    // Mock that worktree memory folder exists and is a symlink
    mockedLstatSync.mockImplementation((p: any) => {
      if (p.toString().endsWith('channels-v2\\memory')) {
        return { isSymbolicLink: () => true } as any;
      }
      return { isSymbolicLink: () => false } as any;
    });

    syncMemoryJunctions(repoRoot, worktrees);

    expect(mockedSymlinkSync).not.toHaveBeenCalled();
  });

  it('migrates files and creates a junction when the folder exists as a normal folder', () => {
    // Mock that files exist in worktree memory folder
    mockedLstatSync.mockImplementation((p: any) => {
      const pathStr = p.toString();
      if (pathStr.includes('C--Code-vaani\\memory') && pathStr.endsWith('MEMORY.md')) {
        throw new Error('Not found in destination'); // force copy
      }
      return { isSymbolicLink: () => false, mtimeMs: 100 } as any;
    });
    mockedReaddirSync.mockReturnValueOnce(['MEMORY.md' as any]);
    mockedReadFileSync.mockReturnValueOnce(Buffer.from('learnings'));

    syncMemoryJunctions(repoRoot, worktrees);

    // Should migrate files
    expect(mockedWriteFileSync).toHaveBeenCalledWith(
      'C:\\Users\\test\\.claude\\projects\\C--Code-vaani\\memory\\MEMORY.md',
      Buffer.from('learnings'),
    );
    // Should remove the normal folder
    expect(mockedRmSync).toHaveBeenCalledWith(
      'C:\\Users\\test\\.claude\\projects\\C--Code-vaani--worktrees-channels-v2\\memory',
      { recursive: true, force: true },
    );
    // Should create directory junction
    expect(mockedSymlinkSync).toHaveBeenCalledWith(
      'C:\\Users\\test\\.claude\\projects\\C--Code-vaani\\memory',
      'C:\\Users\\test\\.claude\\projects\\C--Code-vaani--worktrees-channels-v2\\memory',
      'junction',
    );
  });
});
