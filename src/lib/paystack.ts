import crypto from 'node:crypto';
import type { Plan } from '@/lib/plans';

const API = 'https://api.paystack.co';

export function paystackConfigured(): boolean {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

export function devBypassEnabled(): boolean {
  return process.env.BILLING_DEV_BYPASS === '1' && !paystackConfigured();
}

export function newReference(userId: string): string {
  return `joppo_${userId.slice(0, 8)}_${Date.now().toString(36)}_${crypto
    .randomBytes(4)
    .toString('hex')}`;
}

/** Paystack takes minor units: cents for USD, kobo for NGN. */
export function minorUnits(plan: Plan): number {
  return Math.round(plan.price * 100);
}

interface InitResult {
  authorizationUrl: string;
  reference: string;
}

export async function initializeTransaction(args: {
  email: string;
  plan: Plan;
  reference: string;
  callbackUrl: string;
  userId: string;
}): Promise<InitResult> {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new Error('PAYSTACK_SECRET_KEY is not set');

  const res = await fetch(`${API}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: args.email,
      amount: minorUnits(args.plan),
      currency: process.env.PAYSTACK_CURRENCY || 'USD',
      reference: args.reference,
      callback_url: args.callbackUrl,
      metadata: {
        userId: args.userId,
        plan: args.plan.id,
        cancel_action: args.callbackUrl,
        custom_fields: [
          { display_name: 'Plan', variable_name: 'plan', value: args.plan.name },
        ],
      },
    }),
  });

  const body = (await res.json()) as {
    status?: boolean;
    message?: string;
    data?: { authorization_url?: string; reference?: string };
  };

  if (!res.ok || !body.status || !body.data?.authorization_url) {
    throw new Error(body.message || `Paystack initialize failed (${res.status})`);
  }

  return {
    authorizationUrl: body.data.authorization_url,
    reference: body.data.reference || args.reference,
  };
}

export async function verifyTransaction(reference: string): Promise<{
  success: boolean;
  amount: number;
  currency: string;
  plan?: string;
  userId?: string;
  customerCode?: string;
  raw: unknown;
}> {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new Error('PAYSTACK_SECRET_KEY is not set');

  const res = await fetch(`${API}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret}` },
    cache: 'no-store',
  });
  const body = (await res.json()) as any;

  return {
    success: Boolean(body?.status && body?.data?.status === 'success'),
    amount: Number(body?.data?.amount ?? 0),
    currency: String(body?.data?.currency ?? 'USD'),
    plan: body?.data?.metadata?.plan,
    userId: body?.data?.metadata?.userId,
    customerCode: body?.data?.customer?.customer_code,
    raw: body,
  };
}

/**
 * Paystack signs webhooks with HMAC-SHA512 over the raw body using the secret
 * key. Compare in constant time and always against the untouched raw string.
 */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha512', secret).update(rawBody, 'utf8').digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function periodEnd(days: number, from = new Date()): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}
