'use client';

/**
 * Last resort. This replaces the root layout entirely, so it cannot use any of
 * the app's fonts or CSS and has to carry its own styles inline. It only fires
 * when the layout itself throws, which error.tsx cannot catch.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#07070B',
          color: 'rgba(255,255,255,0.85)',
          fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
          padding: '24px',
        }}
      >
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <p
            style={{
              fontSize: 11,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'rgba(180,168,255,0.7)',
              margin: '0 0 14px',
            }}
          >
            Joppo
          </p>
          <h1 style={{ fontSize: 21, fontWeight: 600, margin: '0 0 12px' }}>
            The site failed to load.
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'rgba(255,255,255,0.45)', margin: 0 }}>
            Something broke before the page could render. Reloading usually fixes it.
          </p>
          {error.digest ? (
            <p
              style={{
                marginTop: 20,
                fontFamily: 'ui-monospace, monospace',
                fontSize: 11.5,
                color: 'rgba(255,255,255,0.4)',
              }}
            >
              {error.digest}
            </p>
          ) : null}
          <button
            onClick={reset}
            style={{
              marginTop: 24,
              background: '#6039F5',
              color: '#fff',
              border: 0,
              borderRadius: 6,
              padding: '11px 22px',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
