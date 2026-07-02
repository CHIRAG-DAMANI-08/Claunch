import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getLocalBranches, findParentBranch, getDiffStats, discoverFeatures } from '../gitStats.js';
import { execSync } from 'node:child_process';
import { statSync, readdirSync } from 'node:fs';

vi.mock('node:child_process', () => {
  return {
    execSync: vi.fn(),
  };
});

vi.mock('node:fs', () => {
  return {
    statSync: vi.fn(),
    readdirSync: vi.fn(),
  };
});

describe('gitStats', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('getLocalBranches parses branches correctly', () => {
    const mockExec = vi.mocked(execSync);
    mockExec.mockReturnValueOnce(`  main 1234abcd\n  feat-x 5678efgh\n`);

    const branches = getLocalBranches('C:\\Code');
    expect(branches).toHaveLength(2);
    expect(branches[0].name).toBe('main');
    expect(branches[1].name).toBe('feat-x');
  });

  it('findParentBranch determines parent correctly based on merge base date', () => {
    const mockExec = vi.mocked(execSync);
    // 1st call: merge-base main with O (say, main) - won't happen because loop skips O.name === branch
    // Loop over feat-x: merge base B and feat-x is B head (skipped in loop)
    // Loop over main: merge-base is commit1
    mockExec.mockReturnValueOnce('commit1'); // merge base
    mockExec.mockReturnValueOnce('1000000000'); // timestamp

    const branches = [
      { name: 'main', head: '1234' },
      { name: 'feat-x', head: '5678' },
    ];

    const parent = findParentBranch('feat-x', branches, 'C:\\Code');
    expect(parent).toBe('main');
  });

  it('getDiffStats parses git diff stats correctly', () => {
    const mockExec = vi.mocked(execSync);
    mockExec.mockReturnValueOnce('10\t5\tsrc/index.ts\n2\t1\tREADME.md\n');

    const stats = getDiffStats('main', 'feat-x', 'C:\\Code');
    expect(stats).toEqual({ insertions: 12, deletions: 6 });
  });

  it('discoverFeatures scans standard directories', () => {
    const mockStat = vi.mocked(statSync);
    const mockReaddir = vi.mocked(readdirSync);

    // mock statSync to return isDirectory true for src
    mockStat.mockImplementation((p: any) => {
      if (p.includes('src')) {
        return { isDirectory: () => true } as any;
      }
      throw new Error('Not found');
    });

    mockReaddir.mockReturnValueOnce([
      { isDirectory: () => true, name: 'claude' },
      { isDirectory: () => true, name: 'git' },
    ] as any);

    const features = discoverFeatures('C:\\Code');
    expect(features).toContain('src/claude');
    expect(features).toContain('src/git');
  });
});
