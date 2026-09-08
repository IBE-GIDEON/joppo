import { prisma } from '@/lib/db';

export interface Entitlement {
  userId: string | null;
  signedIn: boolean;
  onboarded: boolean;
  subscribed: boolean;
  plan: string | null;
  expiresAt: Date | null;
}

export const ANONYMOUS: Entitlement = {
  userId: null,
  signedIn: false,
  onboarded: false,
  subscribed: false,
  plan: null,
  expiresAt: null,
};

/**
 * Joppo has no free tier. Access to listing detail requires an active
 * subscription; everything else in the funnel exists only to get there.
 */
export async function getEntitlement(userId: string | null): Promise<Entitlement> {
  if (!userId) return ANONYMOUS;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      profile: { select: { completedAt: true } },
      subscription: { select: { plan: true, status: true, currentPeriodEnd: true } },
    },
  });

  if (!user) return ANONYMOUS;

  const sub = user.subscription;
  const active =
    !!sub &&
    sub.status === 'active' &&
    !!sub.currentPeriodEnd &&
    sub.currentPeriodEnd.getTime() > Date.now();

  return {
    userId: user.id,
    signedIn: true,
    onboarded: !!user.profile?.completedAt,
    subscribed: active,
    plan: active ? sub!.plan : null,
    expiresAt: active ? sub!.currentPeriodEnd! : null,
  };
}

/** Where a user belongs right now, given how far through the funnel they are. */
export function nextStep(e: Entitlement): '/login' | '/onboarding' | '/unlock' | '/search' {
  if (!e.signedIn) return '/login';
  if (!e.onboarded) return '/onboarding';
  if (!e.subscribed) return '/unlock';
  return '/search';
}
