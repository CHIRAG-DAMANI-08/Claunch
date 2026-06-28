import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runCli } from '../cli.js';
import { validateEnvironment } from '../utils/environment.js';
import { discoverWorktrees } from '../git/discoverWorktrees.js';
import { SessionStore } from '../claude/sessionStore.js';
import { openWindowsTerminal } from '../terminal/openWindowsTerminal.js';
import { ClaunchError } from '../types/index.js';
import { syncMemoryJunctions } from '../claude/memorySync.js';
import { startInteractiveMenu } from '../terminal/interactiveMenu.js';
import { getSessionLog } from '../claude/sessionLog.js';
import { checkForUpdates } from '../utils/versionCheck.js';

vi.mock('../utils/versionCheck.js', () => ({
  checkForUpdates: vi.fn().mockResolvedValue(undefined),
}));

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

vi.mock('../claude/memorySync.js', () => ({
  syncMemoryJunctions: vi.fn(),
}));

vi.mock('../terminal/interactiveMenu.js', () => ({
  startInteractiveMenu: vi.fn(),
}));

vi.mock('../claude/sessionLog.js', () => ({
  getSessionLog: vi.fn(),
  cleanPathToProjectName: vi.fn(),
}));

const mockValidateEnvironment = vi.mocked(validateEnvironment);
const mockDiscoverWorktrees = vi.mocked(discoverWorktrees);
const mockOpenWindowsTerminal = vi.mocked(openWindowsTerminal);
const mockSyncMemoryJunctions = vi.mocked(syncMemoryJunctions);
const mockStartInteractiveMenu = vi.mocked(startInteractiveMenu);
const mockGetSessionLog = vi.mocked(getSessionLog);

describe('CLI Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = undefined;
  });

  it('runs the full direct orchestration successfully with --all', () => {
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

    runCli(['node', 'cli.js', '--all']);

    expect(mockValidateEnvironment).toHaveBeenCalledTimes(1);
    expect(mockDiscoverWorktrees).toHaveBeenCalledWith(process.cwd());
    expect(mockSyncMemoryJunctions).toHaveBeenCalledTimes(1);
    
    // Fallback logic should set the session for missing key
    expect(setSessionMock).toHaveBeenCalledWith('C:/code/vaani', 'feat/api', 'feat/api');
    
    expect(mockOpenWindowsTerminal).toHaveBeenCalledTimes(1);
    const specs = mockOpenWindowsTerminal.mock.calls[0][0];
    expect(specs).toHaveLength(2);
    expect(specs[0].command).toBe('claude --resume "main"');
    expect(specs[1].command).toBe('claude --resume "feat/api"');
  });

  it('launches the interactive selection menu by default', () => {
    mockValidateEnvironment.mockReturnValue('C:/code/vaani');
    mockDiscoverWorktrees.mockReturnValue([
      { path: 'C:/code/vaani', branch: 'main', head: '123', isBare: false, isCurrent: true },
    ]);

    runCli(['node', 'cli.js']);

    expect(mockSyncMemoryJunctions).toHaveBeenCalledTimes(1);
    expect(mockStartInteractiveMenu).toHaveBeenCalledTimes(1);
  });

  it('runs log subcommand successfully', () => {
    mockValidateEnvironment.mockReturnValue('C:/code/vaani');
    mockGetSessionLog.mockReturnValue('dialogue history text');
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    runCli(['node', 'cli.js', 'log', 'main']);

    expect(mockValidateEnvironment).toHaveBeenCalledTimes(1);
    expect(mockGetSessionLog).toHaveBeenCalledWith('C:/code/vaani', 'main');
    expect(consoleLogSpy).toHaveBeenCalledWith('dialogue history text');
    consoleLogSpy.mockRestore();
  });

  it('exits with error code 1 and writes to stderr on ClaunchError', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockValidateEnvironment.mockImplementationOnce(() => {
      throw new ClaunchError('Git is not installed.', 'GIT_NOT_FOUND');
    });

    runCli(['node', 'cli.js', '--all']);

    expect(process.exitCode).toBe(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Git is not installed.');
    consoleErrorSpy.mockRestore();
  });
});
