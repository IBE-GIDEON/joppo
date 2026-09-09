import { LegalPage, Section } from '@/components/legal/legal-page';
import { SupportLink } from '@/components/legal/support-link';
import { LEGAL } from '@/lib/legal';

export const metadata = {
  title: 'Refund Policy',
  description: 'When you get your money back from Joppo, and how to ask.',
};

export default function RefundsPage() {
  return (
    <LegalPage
      title="Refund Policy"
      summary="When you get your money back, and how to ask for it."
    >
      <Section n={1} title="The promise">
        <p>
          <strong>
            Ask within {LEGAL.refundWindowDays} days of paying and you get your money back
            in full.
          </strong>{' '}
          No form, no reason required, no attempt to talk you out of it.
        </p>
        <p>
          One email to <SupportLink showAddress /> is
          enough. Send it from the address on your account and we will process it.
        </p>
      </Section>

      <Section n={2} title="Why we can offer that">
        <p>
          {LEGAL.productName} costs a few dollars and either helps you or does not, which
          you will know within a day. We would rather refund someone quickly than keep money
          from a person who found nothing useful.
        </p>
        <p>
          Using the service in that window does not disqualify you. Searching, saving and
          applying are exactly how you find out whether it works for you.
        </p>
      </Section>

      <Section n={3} title="After the window">
        <p>
          Past {LEGAL.refundWindowDays} days we do not normally refund, because access has
          been delivered and largely used. Two exceptions:
        </p>
        <ul>
          <li>
            <strong>We broke it.</strong> If the service was unavailable or unusable for a
            meaningful stretch of your paid period, tell us and we will refund that part or
            extend your access, whichever you prefer.
          </li>
          <li>
            <strong>We shut down.</strong> If we stop operating while you hold paid access,
            we refund the unused portion without you having to ask.
          </li>
        </ul>
      </Section>

      <Section n={4} title="How the money comes back">
        <p>
          Refunds go through Paystack to the card or account you paid from. We cannot send
          it anywhere else.
        </p>
        <p>
          We start it within two working days of your email. Your bank then takes its own
          time, usually 5 to 10 working days. That part is outside our control.
        </p>
      </Section>

      <Section n={5} title="Nothing renews, so nothing needs cancelling">
        <p>
          Payments on {LEGAL.productName} are <strong>one-off</strong>. You are charged
          once, access runs for the period you bought, then it stops. There is no
          subscription, no recurring charge and no cancellation to remember.
        </p>
        <p>
          If you ever see a charge you did not expect, email us immediately and we will
          refund it whatever the date.
        </p>
      </Section>

      <Section n={6} title="Abuse">
        <p>
          If someone repeatedly buys and refunds, we may decline further refunds or stop
          selling to that account. This is aimed at deliberate abuse, not at anyone who
          genuinely changed their mind.
        </p>
      </Section>

      <Section n={7} title="Your statutory rights">
        <p>
          This policy adds to your legal rights, it does not replace them. Where consumer
          law in your country gives you a stronger right to a refund, that right applies.
        </p>
      </Section>
    </LegalPage>
  );
}
