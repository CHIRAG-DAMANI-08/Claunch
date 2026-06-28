import { describe, it, expect } from 'vitest';
import { buildClaudeCommand } from '../launchClaude.js';

describe('buildClaudeCommand', () => {
  it('returns plain claude command when sessionName is null', () => {
    const cmd = buildClaudeCommand('C:/my/path', null);
    expect(cmd).toBe('claude');
  });

  it('returns plain claude command when sessionName is empty', () => {
    const cmd = buildClaudeCommand('C:/my/path', '  ');
    expect(cmd).toBe('claude');
  });

  it('returns claude --resume command when sessionName is provided', () => {
    const cmd = buildClaudeCommand('C:/my/path', 'feat/dashboard');
    expect(cmd).toBe('claude --resume "feat/dashboard"');
  });
});
