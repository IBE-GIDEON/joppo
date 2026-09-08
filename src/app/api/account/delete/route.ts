import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { currentUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Erase the account.
 *
 * The privacy policy makes two promises that pull against each other: delete
 * personal data on request, and keep payment records for seven years because
 * tax law requires it. A hard delete of the user row would cascade the payments
 * away and break the second promise.
 *
 * So the personal data goes and the financial ledger stays, attached to an
 * account that no longer identifies anyone. Sign-in credentials, sessions,
 * search preferences, bookmarks and saved searches are all destroyed, which
 * means the person cannot sign in again and nothing about them remains.
 */
export async function POST() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  try {
    await prisma.$transaction([
      // Sign-in credentials and live sessions first: this is what actually
      // ends their access.
      prisma.account.deleteMany({ where: { userId } }),
      prisma.session.deleteMany({ where: { userId } }),

      // Everything they created.
      prisma.savedListing.deleteMany({ where: { userId } }),
      prisma.savedSearch.deleteMany({ where: { userId } }),
      prisma.profile.deleteMany({ where: { userId } }),
      prisma.subscription.deleteMany({ where: { userId } }),

      // The row survives only to anchor the payment records, carrying nothing
      // that identifies a person. The email is replaced rather than nulled so
      // the unique constraint still holds if they sign up again later.
      prisma.user.update({
        where: { id: userId },
        data: {
          name: null,
          image: null,
          email: `deleted+${userId}@joppo.invalid`,
          emailVerified: null,
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      message:
        'Your account and personal data have been deleted. Payment records are kept in anonymised form because tax law requires it.',
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message.slice(0, 200) : 'Could not delete the account.' },
      { status: 500 },
    );
  }
}
