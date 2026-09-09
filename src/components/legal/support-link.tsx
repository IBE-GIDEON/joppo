import { LEGAL } from '@/lib/legal';

/**
 * Support contact. Renders the friendly label with the real address behind the
 * mailto, so the page reads as Joppo rather than as a personal inbox.
 * Pass showAddress where the literal address has to be visible.
 */
export function SupportLink({ showAddress = false }: { showAddress?: boolean }) {
  return (
    <a href={`mailto:${LEGAL.contactEmail}`}>
      {showAddress ? LEGAL.contactEmail : LEGAL.contactLabel}
    </a>
  );
}
