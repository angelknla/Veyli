// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { issueToken, verifyAdminHeader, verifyToken } from './token';

const secret = 'a-long-server-only-test-secret-that-is-never-deployed';
describe('anonymous cookie integrity', () => {
  it('issues unpredictable identities and validates a keyed digest', () => {
    const a = issueToken(secret);
    const b = issueToken(secret);
    expect(a).not.toBe(b);
    expect(verifyToken(a, secret)).toMatch(/^[a-f0-9]{64}$/);
    expect(verifyToken(a, secret)).not.toContain(a.split('.')[0]);
  });
  it('rejects tampering, arbitrary identifiers and malformed payloads', () => {
    const token = issueToken(secret);
    expect(verifyToken(token.replace(/^./, token[0] === 'a' ? 'b' : 'a'), secret)).toBeNull();
    for (const invalid of [
      '',
      undefined,
      '123e4567-e89b-12d3-a456-426614174000',
      `${token}.extra`,
      'x'.repeat(1000),
    ])
      expect(verifyToken(invalid, secret)).toBeNull();
  });
  it('rejects expired cookies and invalidates cookies on secret rotation', () => {
    const now = Date.now();
    const token = issueToken(secret, now);
    expect(verifyToken(token, secret, now + 366 * 86400000)).toBeNull();
    expect(verifyToken(token, `${secret}changed`, now)).toBeNull();
  });
  it('keeps administration separate from anonymous player tokens', () => {
    const header = `Basic ${Buffer.from(`admin:${secret}`).toString('base64')}`;
    expect(verifyAdminHeader(header, secret)).toBe(true);
    expect(verifyAdminHeader(`Bearer ${issueToken(secret)}`, secret)).toBe(false);
    expect(
      verifyAdminHeader(`Basic ${Buffer.from('admin:wrong').toString('base64')}`, secret)
    ).toBe(false);
    expect(verifyAdminHeader(header, undefined)).toBe(false);
  });
});
