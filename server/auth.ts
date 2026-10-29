import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

const SESSION_SECRET = process.env.SESSION_SECRET || 'plancraft-cryptographic-auth-secret-key-2026';

export interface AuthenticatedUser {
  id: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

/**
 * Creates a cryptographically signed HMAC-SHA256 session token.
 * Format: <base64url(userId)>.<expiresAt>.<hmacSignature>
 */
export function createSessionToken(
  userId: string,
  expiresInMs = 30 * 24 * 60 * 60 * 1000 // 30 days
): string {
  const expiresAt = Date.now() + expiresInMs;
  const encodedId = Buffer.from(userId, 'utf-8').toString('base64url');
  const payload = `${encodedId}.${expiresAt}`;
  const hmac = crypto.createHmac('sha256', SESSION_SECRET);
  hmac.update(payload);
  const signature = hmac.digest('base64url');
  return `${payload}.${signature}`;
}

/**
 * Verifies the cryptographic signature and expiration of a session token.
 * Returns { userId } if valid, null otherwise.
 */
export function verifySessionToken(token: string): { userId: string } | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.trim().split('.');
  if (parts.length !== 3) return null;

  const [encodedId, expiresAtStr, signature] = parts;
  const expiresAt = Number(expiresAtStr);
  if (isNaN(expiresAt) || Date.now() > expiresAt) {
    return null;
  }

  const payload = `${encodedId}.${expiresAtStr}`;
  const hmac = crypto.createHmac('sha256', SESSION_SECRET);
  hmac.update(payload);
  const expectedSig = hmac.digest('base64url');

  try {
    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const userId = Buffer.from(encodedId, 'base64url').toString('utf-8');
    if (!userId) return null;
    return { userId };
  } catch {
    return null;
  }
}

/**
 * Express middleware to authenticate session tokens.
 * Extracts authenticated userId and attaches to req.user.
 * Rejects unauthenticated, tampered, or spoofed requests with 401 Unauthorized.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  let token: string | undefined;

  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (typeof req.headers['x-session-token'] === 'string') {
    token = (req.headers['x-session-token'] as string).trim();
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Missing Bearer session token.',
    });
  }

  const session = verifySessionToken(token);
  if (!session) {
    return res.status(401).json({
      success: false,
      error: 'Authentication failed. Invalid, tampered, or expired session token.',
    });
  }

  // Attach verified user identity. Never trust raw unverified headers!
  (req as any).user = { id: session.userId };
  next();
}
