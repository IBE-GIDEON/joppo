import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyTransaction } from '@/lib/paystack';
import { activateSubscription } from '@/lib/billing';
import type { PlanId } from '@/lib/plans';

export const dynamic = 'force-dynamic';

/**
 * Where Paystack sends the browser after checkout. The webhook is the source
 * of truth, but the user arrives here first, so verify directly rather than
 * show a locked page to somebody who has just paid.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const reference = url.searchParams.get('reference') || url.searchParams.get('trxref');
  const origin = process.env.NEXTAUTH_URL || url.origin;

  if (!reference) {
    return NextResponse.redirect(`${origin}/unlock?error=missing_reference`);
  }

  try {
    const result = await verifyTransaction(reference);

    if (!result.success || !result.userId || !result.plan) {
      await prisma.payment.updateMany({ where: { reference }, data: { status: 'failed' } });
      return NextResponse.redirect(`${origin}/unlock?error=payment_failed`);
    }

    await prisma.payment.updateMany({
      where: { reference },
      data: { status: 'success', rawEvent: JSON.stringify(result.raw).slice(0, 8000) },
    });

    await activateSubscription({
      userId: result.userId,
      plan: result.plan as PlanId,
      reference,
      customerCode: result.customerCode,
    });

    return NextResponse.redirect(`${origin}/search?unlocked=1`);
  } catch {
    return NextResponse.redirect(`${origin}/unlock?error=verification_failed`);
  }
}
