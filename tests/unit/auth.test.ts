import { describe, it, expect } from 'vitest';
import { createSessionToken, verifySessionToken } from '../../server/auth.js';

describe('Cryptographic Session Authentication', () => {
  const userId = 'tenant-alice-123';

  it('generates a valid signed session token matching format', () => {
    const token = createSessionToken(userId);
    expect(typeof token).toBe('string');
    const parts = token.split('.');
    expect(parts).toHaveLength(3);
    const [encodedId, expiresAtStr, signature] = parts;
    expect(encodedId).toBeDefined();
    expect(Number(expiresAtStr)).toBeGreaterThan(Date.now());
    expect(signature.length).toBeGreaterThan(10);
  });

  it('verifies a valid session token and extracts authentic userId', () => {
    const token = createSessionToken(userId);
    const verified = verifySessionToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe(userId);
  });

  it('rejects tampered token payload where attacker modifies userId', () => {
    const token = createSessionToken(userId);
    const [encodedId, expiresAtStr, signature] = token.split('.');
    // Attacker alters payload to victim id
    const tamperedEncodedId = Buffer.from('victim-bob-456').toString('base64url');
    const tamperedToken = `${tamperedEncodedId}.${expiresAtStr}.${signature}`;

    const verified = verifySessionToken(tamperedToken);
    expect(verified).toBeNull();
  });

  it('rejects tampered signature', () => {
    const token = createSessionToken(userId);
    const [encodedId, expiresAtStr] = token.split('.');
    const fakeSignature = 'maliciousSignatureABC123';
    const tamperedToken = `${encodedId}.${expiresAtStr}.${fakeSignature}`;

    const verified = verifySessionToken(tamperedToken);
    expect(verified).toBeNull();
  });

  it('rejects expired token', () => {
    // Generate token that expired 10 seconds ago
    const expiredToken = createSessionToken(userId, -10000);
    const verified = verifySessionToken(expiredToken);
    expect(verified).toBeNull();
  });

  it('rejects malformed token strings and null inputs', () => {
    expect(verifySessionToken('')).toBeNull();
    expect(verifySessionToken('not-a-token')).toBeNull();
    expect(verifySessionToken('one.two')).toBeNull();
    expect(verifySessionToken(null as any)).toBeNull();
  });
});
