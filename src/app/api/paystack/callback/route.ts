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

    // As in the webhook: what was bought and for how much comes from the row
    // checkout wrote, and Paystack is asked only whether it was paid. The
    // reference here arrives in a query string, so it is not trusted to
    // describe itself.
    const payment = await prisma.payment.findUnique({ where: { reference } });
    if (!payment) {
      return NextResponse.redirect(`${origin}/unlock?error=unknown_reference`);
    }

    if (!result.success) {
      await prisma.payment.update({ where: { reference }, data: { status: 'failed' } });
      return NextResponse.redirect(`${origin}/unlock?error=payment_failed`);
    }

    if (result.amount < payment.amount) {
      await prisma.payment.update({ where: { reference }, data: { status: 'underpaid' } });
      return NextResponse.redirect(`${origin}/unlock?error=amount_mismatch`);
    }

    await prisma.payment.update({
      where: { reference },
      data: { status: 'success', rawEvent: JSON.stringify(result.raw).slice(0, 8000) },
    });

    await activateSubscription({
      userId: payment.userId,
      plan: payment.plan as PlanId,
      reference,
      customerCode: result.customerCode,
    });

    return NextResponse.redirect(`${origin}/search?unlocked=1`);
  } catch {
    return NextResponse.redirect(`${origin}/unlock?error=verification_failed`);
  }
}
