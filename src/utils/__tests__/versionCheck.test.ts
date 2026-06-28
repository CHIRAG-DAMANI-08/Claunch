import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkForUpdates } from '../versionCheck.js';
import { readFileSync } from 'node:fs';

vi.mock('node:fs', () => {
  return {
    readFileSync: vi.fn(),
  };
});

const mockedReadFileSync = vi.mocked(readFileSync);

describe('versionCheck', () => {
  let consoleWarnSpy: any;

  beforeEach(() => {
    vi.resetAllMocks();
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it('prints warning if latest version is newer', async () => {
    mockedReadFileSync.mockReturnValueOnce(JSON.stringify({ version: '0.1.0' }));

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ version: '0.1.1' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await checkForUpdates();

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Update Available! Local: v0.1.0 | Latest: v0.1.1'),
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('npm install -g claude-claunch'),
    );

    vi.unstubAllGlobals();
  });

  it('does not print warning if version is up to date or older', async () => {
    mockedReadFileSync.mockReturnValueOnce(JSON.stringify({ version: '0.1.2' }));

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ version: '0.1.2' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await checkForUpdates();

    expect(consoleWarnSpy).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});
