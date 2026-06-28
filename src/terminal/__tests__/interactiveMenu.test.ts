import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { startInteractiveMenu } from '../interactiveMenu.js';
import { Worktree } from '../../types/index.js';

describe('interactiveMenu', () => {
  let mockSetRawMode: any;
  let mockStdoutWrite: any;
  let mockSessionStore: any;
  let mockOpenTabsFn: any;
  const worktrees: Worktree[] = [
    { path: 'C:\\Code\\vaani', branch: 'main', isMain: true, isCurrent: true },
    { path: 'C:\\Code\\vaani\\.worktrees\\channels-v2', branch: 'feat/channels-v2', isMain: false, isCurrent: false },
  ];

  let originalIsTTY: boolean | undefined;
  let originalSetRawMode: any;

  beforeEach(() => {
    vi.resetAllMocks();
    
    // Save original process properties
    originalIsTTY = process.stdin.isTTY;
    originalSetRawMode = process.stdin.setRawMode;
    
    mockSetRawMode = vi.fn();
    process.stdin.isTTY = true;
    process.stdin.setRawMode = mockSetRawMode;

    mockStdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    
    mockSessionStore = {
      getSession: vi.fn().mockReturnValue('session-name'),
    };
    mockOpenTabsFn = vi.fn();
  });

  afterEach(() => {
    // Restore original process properties
    process.stdin.isTTY = originalIsTTY;
    process.stdin.setRawMode = originalSetRawMode;
    mockStdoutWrite.mockRestore();
  });

  it('immediately returns if worktree list is empty', async () => {
    const promise = startInteractiveMenu('C:\\Code\\vaani', [], mockSessionStore, mockOpenTabsFn);
    await expect(promise).resolves.toBeUndefined();
  });

  it('starts menu, responds to arrow keys, and resolves on enter', async () => {
    let keypressCallback: Function = () => {};
    const mockOn = vi.spyOn(process.stdin, 'on').mockImplementation((event: string, cb: any) => {
      if (event === 'keypress') {
        keypressCallback = cb;
      }
      return process.stdin;
    });

    const promise = startInteractiveMenu('C:\\Code\\vaani', worktrees, mockSessionStore, mockOpenTabsFn);

    expect(mockStdoutWrite).toHaveBeenCalledWith(expect.stringContaining('\x1b[?25l'));
    expect(mockStdoutWrite).toHaveBeenCalledWith(expect.stringContaining('main'));

    keypressCallback('', { name: 'j' });
    keypressCallback('', { name: 'space' });
    keypressCallback('', { name: 'return' });

    await promise;

    expect(mockOpenTabsFn).toHaveBeenCalledWith(
      [
        {
          path: 'C:\\Code\\vaani\\.worktrees\\channels-v2',
          title: 'feat/channels-v2',
          command: 'claude --resume "session-name"',
        },
      ],
      { newWindow: true },
    );
    expect(mockSetRawMode).toHaveBeenLastCalledWith(false);
    mockOn.mockRestore();
  });

  it('spawns a background tab in the current window when key o is pressed', async () => {
    let keypressCallback: Function = () => {};
    const mockOn = vi.spyOn(process.stdin, 'on').mockImplementation((event: string, cb: any) => {
      if (event === 'keypress') {
        keypressCallback = cb;
      }
      return process.stdin;
    });

    const promise = startInteractiveMenu('C:\\Code\\vaani', worktrees, mockSessionStore, mockOpenTabsFn);

    keypressCallback('', { name: 'o' });
    keypressCallback('', { name: 'q' });

    await promise;

    expect(mockOpenTabsFn).toHaveBeenCalledWith(
      [
        {
          path: 'C:\\Code\\vaani',
          title: 'main',
          command: 'claude --resume "session-name"',
        },
      ],
      { newWindow: false, focusMenu: true },
    );
    mockOn.mockRestore();
  });
});
