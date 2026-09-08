import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth, currentUserId } from '@/lib/auth';
import { planFrom } from '@/lib/plans';
import {
  initializeTransaction,
  newReference,
  minorUnits,
  paystackConfigured,
  devBypassEnabled,
} from '@/lib/paystack';
import { activateSubscription } from '@/lib/billing';
import type { PlanId } from '@/lib/plans';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const session = await auth();
  const userId = await currentUserId();
  const email = session?.user?.email;

  if (!userId || !email) {
    return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { plan?: string };
  const plan = planFrom(body.plan);
  if (!plan) return NextResponse.json({ error: 'Unknown plan.' }, { status: 400 });

  const reference = newReference(userId);
  const origin = process.env.NEXTAUTH_URL || new URL(req.url).origin;
  const callbackUrl = `${origin}/api/paystack/callback`;

  await prisma.payment.create({
    data: {
      userId,
      reference,
      plan: plan.id,
      amount: minorUnits(plan),
      currency: process.env.PAYSTACK_CURRENCY || 'USD',
      status: 'pending',
    },
  });

  // Local testing path, so the whole funnel can be walked without a
  // Paystack account. Disabled automatically once real keys are present.
  if (devBypassEnabled()) {
    await activateSubscription({ userId, plan: plan.id as PlanId, reference });
    await prisma.payment.update({ where: { reference }, data: { status: 'success' } });
    return NextResponse.json({
      authorizationUrl: `${origin}/search?unlocked=1`,
      devBypass: true,
    });
  }

  if (!paystackConfigured()) {
    return NextResponse.json(
      {
        error:
          'Payments are not configured. Add PAYSTACK_SECRET_KEY to .env, or set BILLING_DEV_BYPASS=1 to test the flow locally.',
      },
      { status: 503 },
    );
  }

  try {
    const result = await initializeTransaction({
      email,
      plan,
      reference,
      callbackUrl,
      userId,
    });
    return NextResponse.json({ authorizationUrl: result.authorizationUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not start checkout.';
    await prisma.payment.update({ where: { reference }, data: { status: 'failed' } });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
