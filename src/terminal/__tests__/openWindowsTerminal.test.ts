import { describe, it, expect, vi, beforeEach } from 'vitest';
import { openWindowsTerminal } from '../openWindowsTerminal.js';
import { spawn, execSync } from 'node:child_process';
import { TabSpec } from '../../types/index.js';

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return {
    ...actual,
    spawn: vi.fn().mockReturnValue({ unref: vi.fn() }),
    execSync: vi.fn().mockReturnValue(Buffer.from('C:\\Windows\\System32\\wt.exe')),
  };
});

const mockedSpawn = vi.mocked(spawn);
const mockedExecSync = vi.mocked(execSync);

describe('openWindowsTerminal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedExecSync.mockReturnValue(Buffer.from('C:\\Windows\\System32\\wt.exe'));
  });

  it('does nothing if specs array is empty', () => {
    openWindowsTerminal([]);
    expect(mockedSpawn).not.toHaveBeenCalled();
  });

  it('constructs correct arguments for a single tab', () => {
    const specs: TabSpec[] = [
      {
        path: 'C:/code/vaani',
        branch: 'main',
        command: 'claude --resume "main"',
        title: 'main',
      },
    ];

    openWindowsTerminal(specs);

    expect(mockedSpawn).toHaveBeenCalledTimes(1);
    const [command, args] = mockedSpawn.mock.calls[0];
    
    expect(command).toBe('wt');
    expect(args).toContain('-w');
    expect(args).toContain('-1');
    expect(args).toContain('C:/code/vaani');
    expect(args).toContain('main');
    expect(args).toContain('powershell.exe');
    expect(args).toContain('-NoExit');
    expect(args).toContain('-Command');
    expect(args).toContain('claude --resume "main"');
  });

  it('constructs correct chained arguments for multiple tabs', () => {
    const specs: TabSpec[] = [
      {
        path: 'C:/code/vaani',
        branch: 'main',
        command: 'claude --resume "main"',
        title: 'main',
      },
      {
        path: 'C:/code/vaani-dash',
        branch: 'feat/dashboard',
        command: 'claude',
        title: 'feat/dashboard',
      },
    ];

    openWindowsTerminal(specs);

    expect(mockedSpawn).toHaveBeenCalledTimes(1);
    const args = mockedSpawn.mock.calls[0][1];

    // Chaining assertions
    expect(args).toContain(';');
    expect(args).toContain('new-tab');
    
    // First tab specs
    const firstTabIdx = args.indexOf('C:/code/vaani');
    expect(firstTabIdx).not.toBe(-1);
    expect(args[firstTabIdx + 2]).toBe('main'); // Title flag offset

    // Second tab specs
    const secondTabIdx = args.indexOf('C:/code/vaani-dash');
    expect(secondTabIdx).not.toBe(-1);
    expect(args[secondTabIdx + 2]).toBe('feat/dashboard');
  });
});
