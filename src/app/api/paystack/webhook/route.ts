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
  const userId = event.data?.metadata?.userId;
  const plan = event.data?.metadata?.plan;

  if (!reference || !userId || !plan) {
    return NextResponse.json({ error: 'Missing metadata.' }, { status: 400 });
  }

  await prisma.payment.updateMany({
    where: { reference },
    data: { status: 'success', rawEvent: raw.slice(0, 8000) },
  });

  await activateSubscription({
    userId,
    plan: plan as PlanId,
    reference,
    customerCode: event.data?.customer?.customer_code ?? null,
  });

  return NextResponse.json({ received: true });
}
