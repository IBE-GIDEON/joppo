import type { NextAuthOptions } from 'next-auth';
import { getServerSession } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import EmailProvider from 'next-auth/providers/email';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/db';

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

// Magic link. With no SMTP configured the link is printed to the terminal so
// the whole flow is testable locally without a mail provider.
providers.push(
  EmailProvider({
    server: process.env.EMAIL_SERVER || undefined,
    from: process.env.EMAIL_FROM || 'Joppo <login@joppo.app>',
    maxAge: 15 * 60,
    async sendVerificationRequest({ identifier, url, provider }) {
      if (!process.env.EMAIL_SERVER) {
        // eslint-disable-next-line no-console
        console.log(
          [
            '',
            '  ┌────────────────────────────────────────────────────────────',
            '  │  Joppo magic link (no SMTP configured, printed instead)',
            `  │  to: ${identifier}`,
            `  │  ${url}`,
            '  └────────────────────────────────────────────────────────────',
            '',
          ].join('\n'),
        );
        return;
      }
      const nodemailer = await import('nodemailer');
      const transport = nodemailer.createTransport(provider.server as any);
      await transport.sendMail({
        to: identifier,
        from: provider.from,
        subject: 'Your Joppo sign-in link',
        text: `Sign in to Joppo:\n${url}\n\nThis link expires in 15 minutes.`,
        html: `
          <div style="background:#07070B;padding:40px;font-family:Inter,Helvetica,Arial,sans-serif">
            <div style="max-width:440px;margin:0 auto;background:#0E0E17;border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:32px">
              <p style="color:#8A8A9E;font-size:12px;letter-spacing:.12em;text-transform:uppercase;margin:0 0 18px">Joppo</p>
              <h1 style="color:#fff;font-size:24px;margin:0 0 12px">Sign in</h1>
              <p style="color:#8A8A9E;font-size:14px;line-height:1.6;margin:0 0 24px">
                Tap the button below to open Joppo. The link works once and expires in 15 minutes.
              </p>
              <a href="${url}" style="display:inline-block;background:#6039F5;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-size:14px;font-weight:600">Open Joppo</a>
            </div>
          </div>`,
      });
    },
  }),
);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions['adapter'],
  providers,
  session: { strategy: 'database', maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: '/login', verifyRequest: '/login?sent=1', error: '/login' },
  callbacks: {
    async session({ session, user }) {
      if (session.user) (session.user as { id?: string }).id = user.id;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export function auth() {
  return getServerSession(authOptions);
}

/** The signed-in user id, or null. */
export async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return (session?.user as { id?: string } | undefined)?.id ?? null;
}
