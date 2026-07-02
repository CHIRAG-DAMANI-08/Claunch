import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { startInstanceManager, getActiveProcesses } from '../instanceManager.js';
import { discoverWorktrees } from '../../git/discoverWorktrees.js';
import { exec, execSync } from 'node:child_process';

vi.mock('node:child_process', () => {
  return {
    exec: vi.fn((cmd, cb) => {
      // Default mock implementation
      if (cmd.includes('Get-CimInstance')) {
        cb(null, JSON.stringify([
          { CommandLine: 'node.exe claude.js --resume "main"', ProcessId: 1234 }
        ]), '');
      } else {
        cb(null, '', '');
      }
    }),
    execSync: vi.fn().mockReturnValue(''),
  };
});

vi.mock('../../git/discoverWorktrees.js', () => {
  return {
    discoverWorktrees: vi.fn().mockReturnValue([
      { path: 'C:\\Code\\vaani', branch: 'main', isBare: false, isCurrent: true, head: 'abc' },
      { path: 'C:\\Code\\vaani\\.worktrees\\feat-x', branch: 'feat-x', isBare: false, isCurrent: false, head: 'def' },
    ]),
  };
});

describe('instanceManager', () => {
  let mockSetRawMode: any;
  let mockStdoutWrite: any;
  let mockSessionStore: any;
  let mockOpenTabsFn: any;

  let originalIsTTY: boolean | undefined;
  let originalSetRawMode: any;

  beforeEach(() => {
    vi.resetAllMocks();
    
    vi.mocked(discoverWorktrees).mockReturnValue([
      { path: 'C:\\Code\\vaani', branch: 'main', isBare: false, isCurrent: true, head: 'abc' },
      { path: 'C:\\Code\\vaani\\.worktrees\\feat-x', branch: 'feat-x', isBare: false, isCurrent: false, head: 'def' },
    ]);

    originalIsTTY = process.stdin.isTTY;
    originalSetRawMode = process.stdin.setRawMode;
    
    mockSetRawMode = vi.fn();
    process.stdin.isTTY = true;
    process.stdin.setRawMode = mockSetRawMode;

    mockStdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    
    mockSessionStore = {
      getSession: vi.fn((repo, branch) => branch),
    };
    mockOpenTabsFn = vi.fn();
  });

  afterEach(() => {
    process.stdin.isTTY = originalIsTTY;
    process.stdin.setRawMode = originalSetRawMode;
    mockStdoutWrite.mockRestore();
  });

  it('getActiveProcesses retrieves processes via PowerShell JSON', async () => {
    const mockExec = vi.mocked(exec);
    mockExec.mockImplementationOnce((cmd: string, cb: any) => {
      cb(null, JSON.stringify([
        { CommandLine: 'node.exe claude.js --resume "main"', ProcessId: 100 },
        { CommandLine: 'node.exe other.js', ProcessId: 200 }
      ]), '');
      return {} as any;
    });

    const procs = await getActiveProcesses();
    expect(procs).toHaveLength(2);
    expect(procs[0].ProcessId).toBe(100);
    expect(procs[0].CommandLine).toContain('main');
  });

  it('getActiveProcesses falls back to wmic if PowerShell fails', async () => {
    const mockExec = vi.mocked(exec);
    // 1st call fails
    mockExec.mockImplementationOnce((cmd: string, cb: any) => {
      cb(new Error('PS failed'), '', '');
      return {} as any;
    });
    // 2nd call (wmic) succeeds
    mockExec.mockImplementationOnce((cmd: string, cb: any) => {
      cb(null, 'CommandLine=node.exe --resume "feat-x"\r\nProcessId=200\r\n\r\n', '');
      return {} as any;
    });

    const procs = await getActiveProcesses();
    expect(procs).toHaveLength(1);
    expect(procs[0].ProcessId).toBe(200);
    expect(procs[0].CommandLine).toContain('feat-x');
  });

  it('starts instance manager, displays active worktrees, and exits on q', async () => {
    const mockExec = vi.mocked(exec);
    mockExec.mockImplementation((cmd: string, cb: any) => {
      if (cmd.includes('Get-CimInstance')) {
        cb(null, JSON.stringify([
          { CommandLine: 'node.exe --resume "main"', ProcessId: 500 }
        ]), '');
      } else {
        cb(null, '', '');
      }
      return {} as any;
    });

    let keypressCallback: Function = () => {};
    const mockOn = vi.spyOn(process.stdin, 'on').mockImplementation((event: string, cb: any) => {
      if (event === 'keypress') {
        keypressCallback = cb;
      }
      return process.stdin;
    });

    const promise = startInstanceManager('C:\\Code\\vaani', mockSessionStore, mockOpenTabsFn);

    // Give it a tiny moment to run getActiveProcesses
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(mockStdoutWrite).toHaveBeenCalledWith(expect.stringContaining('ACTIVE (PID: 500)'));
    expect(mockStdoutWrite).toHaveBeenCalledWith(expect.stringContaining('IDLE'));

    // Trigger q to exit
    keypressCallback('', { name: 'q' });

    await promise;

    expect(mockSetRawMode).toHaveBeenLastCalledWith(false);
    mockOn.mockRestore();
  });

  it('extracts session name and matches using -r argument and case-insensitivity', async () => {
    const mockExec = vi.mocked(exec);
    mockExec.mockImplementation((cmd: string, cb: any) => {
      if (cmd.includes('Get-CimInstance')) {
        cb(null, JSON.stringify([
          { CommandLine: 'claude.exe -r "MAIN"', ProcessId: 700 }
        ]), '');
      } else {
        cb(null, '', '');
      }
      return {} as any;
    });

    let keypressCallback: Function = () => {};
    const mockOn = vi.spyOn(process.stdin, 'on').mockImplementation((event: string, cb: any) => {
      if (event === 'keypress') {
        keypressCallback = cb;
      }
      return process.stdin;
    });

    const promise = startInstanceManager('C:\\Code\\vaani', mockSessionStore, mockOpenTabsFn);

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(mockStdoutWrite).toHaveBeenCalledWith(expect.stringContaining('ACTIVE (PID: 700)'));

    keypressCallback('', { name: 'q' });

    await promise;
    mockOn.mockRestore();
  });
});
