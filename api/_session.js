// Stateless session cookie: the cookie value is { userId, username } signed
// with HMAC-SHA256 using SESSION_SECRET, so no separate sessions table is
// needed. Set SESSION_SECRET in Vercel's project env vars (a long random
// string - e.g. `openssl rand -hex 32`).
import crypto from 'crypto';
import { serialize, parse } from 'cookie';

const COOKIE_NAME = 'session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function sign(payload) {
  const secret = process.env.SESSION_SECRET;
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const hmac = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${hmac}`;
}

function verify(token) {
  const secret = process.env.SESSION_SECRET;
  const [data, hmac] = token.split('.');
  if (!data || !hmac) return null;
  const expected = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  const a = Buffer.from(hmac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

const isProd = process.env.NODE_ENV === 'production';

export function createSessionCookie(user) {
  const token = sign({ userId: user.id, username: user.username });
  return serialize(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS
  });
}

export function clearSessionCookie() {
  return serialize(COOKIE_NAME, '', {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  });
}

export function getSessionFromReq(req) {
  const cookies = parse(req.headers.cookie || '');
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  return verify(token);
}
