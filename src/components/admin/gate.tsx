'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * The password prompt.
 *
 * Nothing about the dashboard is rendered behind this on the server, so a
 * failed login never has the numbers sitting in the page it returns.
 */
export function Gate() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.refresh();
        return;
      }

      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? 'That did not work.');
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form onSubmit={submit} className="w-full max-w-[320px]">
        <h1 className="text-[15px] font-medium tracking-tightest text-white">Joppo monitor</h1>
        <p className="mt-1 text-[13px] text-white/35">Private. Password required.</p>

        <input
          type="password"
          value={password}
          autoFocus
          autoComplete="current-password"
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="mt-5 h-10 w-full rounded-[6px] border border-white/[0.10] bg-white/[0.03] px-3 text-[14px] text-white outline-none transition-colors placeholder:text-white/25 focus:border-white/25 focus:bg-white/[0.05]"
        />

        <button
          type="submit"
          disabled={busy || password.length === 0}
          className="mt-3 h-10 w-full rounded-[6px] bg-iris-600 text-[14px] font-medium text-white shadow-[0_0_28px_-6px_rgba(124,92,255,0.75)] transition-colors hover:bg-iris-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          {busy ? 'Checking…' : 'Open'}
        </button>

        {error ? <p className="mt-3 text-[12.5px] text-rose-300">{error}</p> : null}
      </form>
    </main>
  );
}

export function SignOut() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await fetch('/api/admin/session', { method: 'DELETE' });
        router.refresh();
      }}
      className="rounded-[5px] border border-white/[0.09] px-2.5 py-1.5 text-[12px] text-white/45 transition-colors hover:border-white/20 hover:text-white/85"
    >
      Lock
    </button>
  );
}
