import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { clientIp } from '@/lib/rate-limit';
import { ADMIN_COOKIE, adminEnabled, issueToken, passwordMatches } from '@/lib/admin';

export const dynamic = 'force-dynamic';

/** A single password with no lockout is a password worth guessing. */
const MAX_ATTEMPTS_PER_HOUR = 8;

function notFound() {
  // Deliberately a 404, not a 403. An unconfigured or wrong-guessed admin area
  // should look like an area that does not exist.
  return new NextResponse('Not found', { status: 404 });
}

async function tooManyAttempts(req: Request): Promise<boolean> {
  const key = `admin:${clientIp(req)}`;
  const window = new Date().toISOString().slice(0, 13);
  try {
    const row = await prisma.usage.upsert({
      where: { key_window: { key, window } },
      create: { key, window, count: 1, expiresAt: new Date(Date.now() + 3_600_000) },
      update: { count: { increment: 1 } },
    });
    return row.count > MAX_ATTEMPTS_PER_HOUR;
  } catch {
    // If the counter cannot be read the password check still stands on its own.
    return false;
  }
}

export async function POST(req: Request) {
  if (!adminEnabled()) return notFound();

  if (await tooManyAttempts(req)) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again in an hour.' },
      { status: 429 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as { password?: string };
  if (typeof body.password !== 'string' || !passwordMatches(body.password)) {
    return NextResponse.json({ error: 'Wrong password.' }, { status: 401 });
  }

  const token = issueToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token.value, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: token.maxAge,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}
