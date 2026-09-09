import Link from 'next/link';
import { LegalPage, Section } from '@/components/legal/legal-page';
import { SupportLink } from '@/components/legal/support-link';
import { LEGAL } from '@/lib/legal';
import { PLAN_LIST } from '@/lib/plans';

export const metadata = {
  title: 'Terms of Service',
  description: 'The agreement between you and Joppo.',
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      summary={`The agreement between you and ${LEGAL.legalEntity} when you use ${LEGAL.productName}.`}
    >
      <Section n={1} title="Who we are and what this covers">
        <p>
          {LEGAL.productName} is operated by {LEGAL.legalEntity}. These terms apply whenever
          you visit the site or hold an account. If you do not accept them, please do not
          use the service.
        </p>
        <p>
          You must be at least 16 years old to hold an account, and old enough to enter a
          contract where you live.
        </p>
      </Section>

      <Section n={2} title="What the service actually is">
        <p>
          {LEGAL.productName} is a <strong>search engine over publicly published
          opportunities</strong>. We read job boards operated by employers, government
          funding portals and partner pages, then index what they publish and link you back
          to the original page.
        </p>
        <p>Being clear about what that means:</p>
        <ul>
          <li>
            We are <strong>not</strong> an employer, recruiter, agency or funding body, and
            we take no part in hiring or awarding decisions.
          </li>
          <li>
            Every listing belongs to the organisation that published it. You apply on their
            page, under their terms, not ours.
          </li>
          <li>
            We do not promise you a job, a grant, an interview, a reply, or any outcome at
            all. You are paying for access to the index, nothing more.
          </li>
        </ul>
      </Section>

      <Section n={3} title="Accuracy of listings">
        <p>
          Listings are gathered automatically from sources we do not control. They may be
          out of date, filled, altered or withdrawn between our reading them and your
          seeing them. Details such as salary, location and closing date are reproduced as
          published and may be wrong at source.
        </p>
        <p>
          <strong>Always check the original page before acting.</strong> We remove listings
          that disappear from their source, but there is a delay.
        </p>
      </Section>

      <Section n={4} title="Your account">
        <p>
          You sign in through Google. Keep control of that account, because anyone with
          access to it has access to yours. Tell us at <SupportLink /> if you think
          someone else has got in.
        </p>
        <p>
          One account is for one person. Do not share, sell or transfer access.
        </p>
      </Section>

      <Section n={5} title="Paying for access">
        <p>
          Full access requires payment. Prices are shown on the site and are currently{' '}
          {PLAN_LIST.map((p) => `$${p.price} ${p.name.toLowerCase()}`).join(', ')}.
        </p>
        <p>
          <strong>These are one-off payments, not subscriptions.</strong> You are charged
          once. Access runs for the period you bought and then stops. Nothing renews
          automatically and there is nothing to cancel. If you want to keep using{' '}
          {LEGAL.productName}, you buy again.
        </p>
        <p>
          Payment is handled by Paystack. We never see or hold your card details. Prices may
          change, but a change never affects a period you have already paid for.
        </p>
        <p>
          Refunds are covered by our{' '}
          <Link href="/refunds">Refund Policy</Link>.
        </p>
      </Section>

      <Section n={6} title="What you may not do">
        <p>You agree not to:</p>
        <ul>
          <li>
            Scrape, bulk-download, resell or redistribute the index, or use it to build a
            competing product.
          </li>
          <li>Share your account, or use one account for several people.</li>
          <li>
            Attempt to reach paid data without paying, including through our interfaces or
            by circumventing access controls.
          </li>
          <li>Place unreasonable automated load on the service.</li>
          <li>Use the service unlawfully, or to harass anyone.</li>
        </ul>
        <p>
          We may suspend or close an account that does these things. Where the breach is
          serious, we may do so without notice and without a refund.
        </p>
      </Section>

      <Section n={7} title="Our content and theirs">
        <p>
          The site, its design and its software belong to {LEGAL.legalEntity}. The listings
          belong to the organisations that published them, and we index them as factual
          information about publicly advertised opportunities.
        </p>
        <p>
          If you publish a listing and want it removed from the index, email{' '}
          <SupportLink /> and we will remove it.
        </p>
      </Section>

      <Section n={8} title="Availability">
        <p>
          We aim to keep {LEGAL.productName} running but do not guarantee it. It may be
          unavailable for maintenance, or because something we depend on has failed. We may
          change or withdraw features.
        </p>
        <p>
          If we withdraw the service permanently while you hold paid access, we will refund
          the unused part of what you paid.
        </p>
      </Section>

      <Section n={9} title="Limits on our liability">
        <p>
          The service is provided as it is. To the extent the law allows, we exclude implied
          warranties, including that listings are accurate or that the service fits your
          purpose.
        </p>
        <p>
          We are not liable for indirect or consequential loss, including lost earnings or
          lost opportunities, arising from your use of {LEGAL.productName}.{' '}
          <strong>
            Our total liability to you is limited to the amount you paid us in the twelve
            months before the claim.
          </strong>
        </p>
        <p>
          Nothing here excludes liability that cannot lawfully be excluded, including for
          fraud, or for death or personal injury caused by negligence.
        </p>
      </Section>

      <Section n={10} title="Ending the agreement">
        <p>
          You may stop using the service and ask us to delete your account at any time, by
          emailing <SupportLink />. Because access is a one-off purchase, stopping does
          not require you to cancel anything.
        </p>
        <p>
          We may close your account if you breach these terms. Where the breach was not
          your fault or was minor, we will refund the unused part of your access.
        </p>
      </Section>

      <Section n={11} title="Changes to these terms">
        <p>
          We may update these terms. The date at the top shows when they last changed. If a
          change materially reduces your rights, we will tell account holders by email
          before it takes effect. Continuing to use the service after that means you accept
          the new terms.
        </p>
      </Section>

      <Section n={12} title="Governing law">
        <p>
          These terms are governed by the laws of {LEGAL.jurisdiction}, and its courts have
          jurisdiction over any dispute. If you are a consumer elsewhere, this does not
          remove protections you have under your own local law.
        </p>
      </Section>

      <Section n={13} title="Contact">
        <p>
          Questions about these terms go to{' '}
          <SupportLink showAddress />.
          {LEGAL.address ? ` Our address is ${LEGAL.address}.` : ''}
        </p>
      </Section>
    </LegalPage>
  );
}
