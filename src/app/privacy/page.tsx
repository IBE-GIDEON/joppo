import { LegalPage, Section } from '@/components/legal/legal-page';
import { LEGAL } from '@/lib/legal';

export const metadata = {
  title: 'Privacy Policy',
  description: 'What Joppo collects, why, and what you can ask us to do with it.',
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      summary="What we collect, why we collect it, and what you can ask us to do with it."
    >
      <Section n={1} title="The short version">
        <p>
          We collect the least we can get away with. We do not sell your data, we do not
          advertise to you, and we do not build a profile to share with anyone. Employers
          are not told that you looked at their listing.
        </p>
        <p>
          {LEGAL.legalEntity} is the data controller. Reach us at {LEGAL.contactEmail}.
        </p>
      </Section>

      <Section n={2} title="What we collect">
        <p>
          <strong>When you sign in.</strong> Google gives us your name, email address and
          profile picture. Nothing else. We never see your Google password and cannot read
          anything else in your Google account.
        </p>
        <p>
          <strong>Your answers during setup.</strong> Which categories interest you, the
          roles or sectors you name, your experience level, the places you want to work,
          whether you want remote only, and how you described your current situation. This
          exists to filter your results.
        </p>
        <p>
          <strong>What you save.</strong> Listings you bookmark and searches you name and
          store.
        </p>
        <p>
          <strong>Payments.</strong> A reference, the amount, the plan and whether it
          succeeded. <strong>Card details never reach us.</strong> They go directly to
          Paystack.
        </p>
        <p>
          <strong>Technical data.</strong> Standard server logs kept by our host, including
          IP address and browser, used to keep the service running and secure.
        </p>
        <p>
          We do not use advertising or analytics trackers, and we set no marketing cookies.
          The only cookie we set is the one that keeps you signed in.
        </p>
      </Section>

      <Section n={3} title="Why we are allowed to hold it">
        <ul>
          <li>
            <strong>To provide what you asked for.</strong> Your account, your filters and
            your access exist to deliver the service you signed up to.
          </li>
          <li>
            <strong>Because the law requires it.</strong> Payment records must be kept for
            tax and accounting.
          </li>
          <li>
            <strong>Because we have a legitimate interest.</strong> Keeping the service
            secure and working, and preventing abuse.
          </li>
        </ul>
      </Section>

      <Section n={4} title="Who else touches it">
        <p>
          We use a small number of providers. Each only receives what it needs to do its
          job, and none of them may use your data for their own purposes.
        </p>
        <ul>
          {LEGAL.processors.map((p) => (
            <li key={p.name}>
              <strong>{p.name}</strong> — {p.role}. Held in {p.region}.
            </li>
          ))}
        </ul>
        <p>
          That is the entire list. We do not sell or rent your data, and we share nothing
          with employers or advertisers.
        </p>
      </Section>

      <Section n={5} title="Where it lives">
        <p>
          Your account and preferences are stored in Frankfurt, Germany. Some providers,
          notably Google and Paystack, operate internationally, so data may be processed
          outside your country under the safeguards those providers maintain.
        </p>
      </Section>

      <Section n={6} title="How long we keep it">
        <ul>
          <li>
            <strong>Account and preferences.</strong> Until you ask us to delete them.
          </li>
          <li>
            <strong>Payment records.</strong> Up to seven years, because tax law requires
            it, even after your account is deleted.
          </li>
          <li>
            <strong>Server logs.</strong> A short period set by our host, then discarded.
          </li>
        </ul>
      </Section>

      <Section n={7} title="What you can ask for">
        <p>You can ask us to:</p>
        <ul>
          <li>Show you a copy of everything we hold about you.</li>
          <li>Correct anything wrong.</li>
          <li>Delete your account and personal data.</li>
          <li>Stop a particular use of your data.</li>
          <li>Send your data to you in a portable format.</li>
        </ul>
        <p>
          Email <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a> and we
          will act within 30 days. It costs nothing. If you think we have handled your data
          badly, you may complain to your local data protection authority.
        </p>
      </Section>

      <Section n={8} title="Security">
        <p>
          Traffic is encrypted in transit. We never store passwords, because sign-in is
          handled by Google. Access to the database is restricted, and paid listing details
          are withheld at the database query itself rather than merely hidden in the page,
          so unpaid accounts are never sent data they have not paid for.
        </p>
        <p>
          No system is perfectly secure. If a breach affects you, we will tell you and the
          relevant authority without undue delay.
        </p>
      </Section>

      <Section n={9} title="Children">
        <p>
          {LEGAL.productName} is not intended for under-16s and we do not knowingly collect
          their data. If you believe a child has an account, tell us and we will remove it.
        </p>
      </Section>

      <Section n={10} title="Changes">
        <p>
          If this policy changes materially, we will email account holders before it takes
          effect. The date at the top always shows the current version.
        </p>
      </Section>
    </LegalPage>
  );
}
