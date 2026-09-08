import { prisma } from '@/lib/db';
import { PLANS, type PlanId } from '@/lib/plans';
import { periodEnd } from '@/lib/paystack';

/**
 * Grant or extend access. Called from the Paystack webhook and from the
 * redirect callback, so it must be safe to run twice for one payment.
 */
export async function activateSubscription(args: {
  userId: string;
  plan: PlanId;
  reference: string;
  customerCode?: string | null;
}): Promise<void> {
  const plan = PLANS[args.plan];
  if (!plan) throw new Error(`Unknown plan ${args.plan}`);

  const existing = await prisma.subscription.findUnique({ where: { userId: args.userId } });

  // Already applied this exact payment: do nothing rather than extend twice.
  if (existing?.paystackRef === args.reference && existing.status === 'active') return;

  // Stack onto remaining time if the user renews early.
  const base =
    existing?.currentPeriodEnd && existing.currentPeriodEnd.getTime() > Date.now()
      ? existing.currentPeriodEnd
      : new Date();

  const ends = periodEnd(plan.days, base);

  await prisma.subscription.upsert({
    where: { userId: args.userId },
    create: {
      userId: args.userId,
      plan: args.plan,
      status: 'active',
      currentPeriodEnd: ends,
      paystackRef: args.reference,
      paystackCustomer: args.customerCode ?? null,
    },
    update: {
      plan: args.plan,
      status: 'active',
      currentPeriodEnd: ends,
      paystackRef: args.reference,
      ...(args.customerCode ? { paystackCustomer: args.customerCode } : {}),
    },
  });
}
