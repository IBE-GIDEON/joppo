'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LoginForm({
  googleEnabled,
  plan,
}: {
  googleEnabled: boolean;
  plan?: string;
}) {
  const [busy, setBusy] = useState(false);

  const callbackUrl = plan ? `/onboarding?plan=${encodeURIComponent(plan)}` : '/onboarding';

  if (!googleEnabled) {
    return (
      <p className="mt-7 rounded-[6px] border border-amber-400/20 bg-amber-400/[0.07] p-3.5 text-[12.5px] leading-relaxed text-amber-200/80">
        Sign-in is not configured on this deployment. Set GOOGLE_CLIENT_ID and
        GOOGLE_CLIENT_SECRET in the environment.
      </p>
    );
  }

  return (
    <div className="mt-7">
      <Button
        size="lg"
        className="w-full"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          void signIn('google', { callbackUrl });
        }}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <GoogleGlyph />}
        Continue with Google
      </Button>

      <p className="mt-3.5 text-center text-[11.5px] leading-relaxed text-white/25">
        We only ever read your name and email address.
      </p>
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.26-2.09 3.56-5.17 3.56-8.87Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.87-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.28v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.28a12 12 0 0 0 0 10.76l3.99-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.62l3.99 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}
