import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyWebhookSignature } from '@/lib/paystack';
import { activateSubscription } from '@/lib/billing';
import type { PlanId } from '@/lib/plans';

export const dynamic = 'force-dynamic';

/**
 * Paystack posts here on charge.success. The signature is an HMAC-SHA512 of
 * the raw body, so the body must be read as text and never re-serialised
 * before it is checked.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get('x-paystack-signature');

  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
  }

  let event: {
    event?: string;
    data?: {
      reference?: string;
      amount?: number;
      currency?: string;
      metadata?: { userId?: string; plan?: string };
      customer?: { customer_code?: string };
    };
  };

  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  if (event.event !== 'charge.success') {
    return NextResponse.json({ received: true });
  }

  const reference = event.data?.reference;
  if (!reference) {
    return NextResponse.json({ error: 'Missing reference.' }, { status: 400 });
  }

  // The user and plan come from our own record of the checkout, not from the
  // event. Checkout wrote that row before sending anyone to Paystack, so it is
  // the authoritative statement of what was being bought and for how much; the
  // event only confirms that it was paid.
  const payment = await prisma.payment.findUnique({ where: { reference } });
  if (!payment) {
    return NextResponse.json({ error: 'Unknown reference.' }, { status: 404 });
  }

  // Paystack reports minor units, the same as we sent. Anything short of the
  // price is recorded and left unactivated rather than quietly granting access.
  const paid = Number(event.data?.amount ?? 0);
  if (paid < payment.amount) {
    await prisma.payment.update({
      where: { reference },
      data: { status: 'underpaid', rawEvent: raw.slice(0, 8000) },
    });
    console.error(
      `[paystack] ${reference} paid ${paid} against ${payment.amount}; not activating`,
    );
    return NextResponse.json({ received: true });
  }

  await prisma.payment.update({
    where: { reference },
    data: { status: 'success', rawEvent: raw.slice(0, 8000) },
  });

  await activateSubscription({
    userId: payment.userId,
    plan: payment.plan as PlanId,
    reference,
    customerCode: event.data?.customer?.customer_code ?? null,
  });

  return NextResponse.json({ received: true });
}
