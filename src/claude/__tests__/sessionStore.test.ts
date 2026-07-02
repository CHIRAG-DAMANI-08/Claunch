import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { SessionStore } from '../sessionStore.js';

const TEST_DIR = join(import.meta.dirname, 'temp_test_store');
const TEST_FILE = join(TEST_DIR, 'sessions.json');

describe('SessionStore', () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it('initializes with empty state if file does not exist', () => {
    const store = new SessionStore(TEST_FILE);
    expect(store.getSession('C:/my/repo', 'main')).toBeNull();
  });

  it('sets and gets session values', () => {
    const store = new SessionStore(TEST_FILE);
    store.setSession('C:/my/repo', 'main', 'main-session');
    expect(store.getSession('C:/my/repo', 'main')).toBe('main-session');
    
    // Verifies persistence on disk
    expect(existsSync(TEST_FILE)).toBe(true);
    const content = JSON.parse(readFileSync(TEST_FILE, 'utf-8'));
    expect(content['c:/my/repo']['main']).toBe('main-session');
  });

  it('normalizes repository path case and slash styling', () => {
    const store = new SessionStore(TEST_FILE);
    store.setSession('C:\\My\\Repo', 'feat/api', 'api-session');
    
    // Matching resolved lowercased forward-slashed keys
    expect(store.getSession('c:/my/repo', 'feat/api')).toBe('api-session');
  });

  it('gracefully falls back on corrupt JSON files', () => {
    // Write corrupt JSON
    const dir = join(TEST_FILE, '..');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(TEST_FILE, 'invalid { json: ...', 'utf-8');

    const store = new SessionStore(TEST_FILE);
    expect(store.getSession('C:/my/repo', 'main')).toBeNull();
    
    // Can still write successfully
    store.setSession('C:/my/repo', 'main', 'ok');
    expect(store.getSession('C:/my/repo', 'main')).toBe('ok');
  });

  it('retrieves all sessions for a repository', () => {
    const store = new SessionStore(TEST_FILE);
    store.setSession('C:/my/repo', 'main', 'main-session');
    store.setSession('C:/my/repo', 'feat/x', 'x-session');
    
    const sessions = store.getSessionsForRepo('C:/my/repo');
    expect(sessions).toEqual({
      'main': 'main-session',
      'feat/x': 'x-session'
    });
  });
});
