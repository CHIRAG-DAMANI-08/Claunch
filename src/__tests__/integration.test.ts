import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runCli } from '../cli.js';
import { validateEnvironment } from '../utils/environment.js';
import { discoverWorktrees } from '../git/discoverWorktrees.js';
import { SessionStore } from '../claude/sessionStore.js';
import { openWindowsTerminal } from '../terminal/openWindowsTerminal.js';
import { ClaunchError } from '../types/index.js';

vi.mock('../utils/environment.js', () => ({
  validateEnvironment: vi.fn(),
}));

vi.mock('../git/discoverWorktrees.js', () => ({
  discoverWorktrees: vi.fn(),
}));

vi.mock('../claude/sessionStore.js', () => {
  const SessionStoreMock = vi.fn();
  SessionStoreMock.prototype.getSession = vi.fn();
  SessionStoreMock.prototype.setSession = vi.fn();
  return { SessionStore: SessionStoreMock };
});

vi.mock('../terminal/openWindowsTerminal.js', () => ({
  openWindowsTerminal: vi.fn(),
}));

const mockValidateEnvironment = vi.mocked(validateEnvironment);
const mockDiscoverWorktrees = vi.mocked(discoverWorktrees);
const mockOpenWindowsTerminal = vi.mocked(openWindowsTerminal);

describe('CLI Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = undefined;
  });

  it('runs the full orchestration successfully', () => {
    mockValidateEnvironment.mockReturnValue('C:/code/vaani');
    mockDiscoverWorktrees.mockReturnValue([
      {
        path: 'C:/code/vaani',
        branch: 'main',
        head: '123',
        isBare: false,
        isCurrent: true,
      },
      {
        path: 'C:/code/vaani-api',
        branch: 'feat/api',
        head: '456',
        isBare: false,
        isCurrent: false,
      },
    ]);

    const getSessionMock = vi.spyOn(SessionStore.prototype, 'getSession');
    const setSessionMock = vi.spyOn(SessionStore.prototype, 'setSession');
    
    getSessionMock.mockReturnValueOnce('main'); // main branch mapping exists
    getSessionMock.mockReturnValueOnce(null);    // api branch mapping missing

    runCli(['node', 'cli.js']);

    expect(mockValidateEnvironment).toHaveBeenCalledTimes(1);
    expect(mockDiscoverWorktrees).toHaveBeenCalledWith(process.cwd());
    
    // Fallback logic should set the session for missing key
    expect(setSessionMock).toHaveBeenCalledWith('C:/code/vaani', 'feat/api', 'feat/api');
    
    expect(mockOpenWindowsTerminal).toHaveBeenCalledTimes(1);
    const specs = mockOpenWindowsTerminal.mock.calls[0][0];
    expect(specs).toHaveLength(2);
    expect(specs[0].command).toBe('claude --resume "main"');
    expect(specs[1].command).toBe('claude --resume "feat/api"');
  });

  it('exits with error code 1 and writes to stderr on ClaunchError', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockValidateEnvironment.mockImplementationOnce(() => {
      throw new ClaunchError('Git is not installed.', 'GIT_NOT_FOUND');
    });

    runCli(['node', 'cli.js']);

    expect(process.exitCode).toBe(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Git is not installed.');
    consoleErrorSpy.mockRestore();
  });
});
