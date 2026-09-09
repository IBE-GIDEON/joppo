import crypto from 'node:crypto';
import { cookies } from 'next/headers';

/**
 * Access control for /admin.
 *
 * One password, one cookie, no database table and no second user system. The
 * dashboard is read-only, so the only thing worth protecting is the reading.
 *
 * If ADMIN_PASSWORD is unset the whole area returns a 404 rather than a login
 * form. A deployment that was never configured therefore exposes nothing, and
 * does not advertise that there is anything to find.
 */
const COOKIE = 'joppo_admin';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export function adminEnabled(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD && signingKey());
}

/**
 * The cookie is signed with NEXTAUTH_SECRET rather than the password itself,
 * so changing the password does not have to invalidate anything, and the
 * password never takes part in a value that is sent to the browser.
 */
function signingKey(): string | undefined {
  return process.env.NEXTAUTH_SECRET;
}

function sign(payload: string): string {
  const key = signingKey();
  if (!key) throw new Error('NEXTAUTH_SECRET is not set');
  return crypto.createHmac('sha256', key).update(payload).digest('hex');
}

/** Length-independent, so a wrong password cannot be measured for its length. */
function constantTimeEquals(a: string, b: string): boolean {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function passwordMatches(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return constantTimeEquals(candidate, expected);
}

export function issueToken(): { value: string; maxAge: number } {
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = String(expiresAt);
  return { value: `${payload}.${sign(payload)}`, maxAge: MAX_AGE_SECONDS };
}

function tokenValid(token: string | undefined): boolean {
  if (!token) return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;

  let expected: string;
  try {
    expected = sign(payload);
  } catch {
    return false;
  }
  if (!constantTimeEquals(signature, expected)) return false;

  const expiresAt = Number(payload);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

/** Whether the current request carries a valid, unexpired admin cookie. */
export async function isAdmin(): Promise<boolean> {
  if (!adminEnabled()) return false;
  const jar = await cookies();
  return tokenValid(jar.get(COOKIE)?.value);
}

export const ADMIN_COOKIE = COOKIE;
