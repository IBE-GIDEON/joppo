import type { NextAuthOptions } from 'next-auth';
import { getServerSession } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/db';

/**
 * Google is the only sign-in method.
 *
 * Magic links were removed deliberately. They require an SMTP server, and
 * without one the app tells the user to check an inbox that will never receive
 * anything, which is worse than not offering the option at all. If email
 * sign-in comes back later, it needs a real mail provider configured first.
 */
const providers: NextAuthOptions['providers'] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

export const googleEnabled = providers.length > 0;

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions['adapter'],
  providers,
  session: { strategy: 'database', maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: '/login', error: '/login' },
  callbacks: {
    async session({ session, user }) {
      if (session.user) (session.user as { id?: string }).id = user.id;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,

  // NextAuth swallows provider errors and redirects with a generic code, which
  // on a serverless host means the real cause never reaches you. Surfacing it
  // in the platform log costs nothing and leaks nothing: codes and messages
  // only, never tokens.
  logger: {
    error(code, metadata) {
      const detail =
        metadata instanceof Error
          ? `${metadata.name}: ${metadata.message}`
          : JSON.stringify(metadata)?.slice(0, 600);
      console.error(`[next-auth] ${code} :: ${detail}`);
    },
    warn(code) {
      console.warn(`[next-auth] warn ${code}`);
    },
    debug() {},
  },
};

export function auth() {
  return getServerSession(authOptions);
}

/** The signed-in user id, or null. */
export async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return (session?.user as { id?: string } | undefined)?.id ?? null;
}
