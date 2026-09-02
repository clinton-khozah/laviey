import { useEffect } from 'react';
import { APP_IMAGES } from '@/constants/images';
import './ChildSafetyStandardsPage.css';

const EFFECTIVE_DATE = '2 September 2026';
const SAFETY_EMAIL = 'support@lavey.co.za';

export function ChildSafetyStandardsPage() {
  useEffect(() => {
    document.documentElement.classList.add('legal-document');
    document.body.classList.add('legal-document');
    return () => {
      document.documentElement.classList.remove('legal-document');
      document.body.classList.remove('legal-document');
    };
  }, []);

  return (
    <main className="child-safety-page">
      <header className="child-safety-page__header">
        <a href="/" className="child-safety-page__brand">
          <img src={APP_IMAGES.logo} alt="Lavey" />
          <span>Lavey</span>
        </a>
        <a href="/" className="child-safety-page__back">
          Back to home
        </a>
      </header>

      <article className="child-safety-page__card">
        <header className="child-safety-page__intro">
          <span className="child-safety-page__eyebrow">Trust &amp; Safety</span>
          <h1>Child Safety Standards</h1>
          <p>Effective {EFFECTIVE_DATE}</p>
        </header>

        <div className="child-safety-page__body">
          <h2>1. Zero-tolerance policy</h2>
          <p>
            Lavey (operated by Brainstak, registration number 2026/492377/07) has zero tolerance for child
            sexual abuse and exploitation (CSAE) material and activity of any kind. Lavey is intended solely
            for adults aged 18 and older, and any account found to involve a minor, or to facilitate the
            abuse, endangerment, or sexualization of a minor, is permanently removed.
          </p>

          <h2>2. Age eligibility and verification</h2>
          <p>
            Users must confirm they are at least 18 years old to create an account. Accounts we identify or
            reasonably suspect belong to a minor, or that misrepresent a user&apos;s age, are suspended and
            removed.
          </p>

          <h2>3. Reporting inside the app</h2>
          <p>
            Every profile, chat, and meetup in Lavey includes a built-in <strong>Report</strong> option that
            lets any user flag another account, message, or piece of content directly to our safety team for
            review, including concerns related to child sexual abuse or exploitation.
          </p>

          <h2>4. How we respond to reports</h2>
          <p>When a report involving suspected CSAE is received, we:</p>
          <ul>
            <li>Review the report and the associated account as a priority</li>
            <li>Remove violating content and permanently ban the account involved</li>
            <li>Preserve relevant records to support law enforcement investigations</li>
            <li>
              Report apparent child sexual abuse material to the relevant national and regional authorities
              and organizations responsible for receiving such reports (for example, NCMEC in the United
              States), as required by applicable law
            </li>
          </ul>

          <h2>5. Designated point of contact</h2>
          <p>
            Our designated point of contact for CSAE prevention, questions from platforms, researchers, and
            law enforcement, and reports that cannot be submitted through in-app reporting is:
          </p>
          <p>
            <a href={`mailto:${SAFETY_EMAIL}`}>{SAFETY_EMAIL}</a>
          </p>

          <h2>6. Related policies</h2>
          <p>
            See also our <a href="/privacy-policy">Privacy Policy</a> for how we collect, use, and protect
            personal information.
          </p>
        </div>

        <footer className="child-safety-page__footer">
          <p>Operated by Brainstak · Registration no. 2026/492377/07</p>
          <a href="/privacy-policy">Privacy Policy</a>
        </footer>
      </article>
    </main>
  );
}
