/**
 * Details used across the Terms, Privacy Policy and Refund Policy.
 *
 * FOUR VALUES BELOW NEED YOUR INPUT BEFORE YOU TAKE MONEY. They are marked
 * TODO. Paystack asks for a working support address and a named business
 * during account review, and a policy that names no one is not enforceable.
 *
 * Everything else is written to match what the code actually does, so if you
 * change how data is handled, change these pages too.
 */
export const LEGAL = {
  /** TODO: your registered business name, or your own full name if you trade as an individual. */
  legalEntity: 'Joppo',

  /** TODO: a mailbox you actually read. This is published and Paystack will check it. */
  contactEmail: 'support@joppo.app',

  /** TODO: the country whose law governs disputes. Usually where you are resident or registered. */
  jurisdiction: 'the Federal Republic of Nigeria',

  /** TODO: your business address. Optional here, required by most payment processors. */
  address: '',

  productName: 'Joppo',
  siteUrl: 'https://joppo-sand.vercel.app',

  /** Days after payment within which a refund is given without question. */
  refundWindowDays: 7,

  /** Shown on each page, and the date you should bump when you change them. */
  lastUpdated: '8 September 2026',

  /** Third parties that process user data, listed in the privacy policy. */
  processors: [
    { name: 'Vercel', role: 'hosts the website and serves every page', region: 'Frankfurt, Germany' },
    { name: 'Supabase', role: 'stores accounts, search preferences and payment records', region: 'Frankfurt, Germany' },
    { name: 'Google', role: 'verifies your identity when you sign in', region: 'Global' },
    { name: 'Paystack', role: 'takes payment and holds card details', region: 'Nigeria and Global' },
  ],
} as const;
