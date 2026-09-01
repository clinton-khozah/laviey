import { useEffect } from 'react';
import { APP_IMAGES } from '@/constants/images';
import './PrivacyPolicyPage.css';

const EFFECTIVE_DATE = '1 September 2026';
const SUPPORT_EMAIL = 'support@lavey.co.za';

export function PrivacyPolicyPage() {
  useEffect(() => {
    document.documentElement.classList.add('legal-document');
    document.body.classList.add('legal-document');
    return () => {
      document.documentElement.classList.remove('legal-document');
      document.body.classList.remove('legal-document');
    };
  }, []);

  return (
    <main className="privacy-policy-page">
      <header className="privacy-policy-page__header">
        <a href="/" className="privacy-policy-page__brand">
          <img src={APP_IMAGES.logo} alt="Lavey" />
          <span>Lavey</span>
        </a>
        <a href="/" className="privacy-policy-page__back">
          Back to home
        </a>
      </header>

      <article className="privacy-policy-page__card">
        <header className="privacy-policy-page__intro">
          <span className="privacy-policy-page__eyebrow">Legal</span>
          <h1>Privacy Policy</h1>
          <p>Effective {EFFECTIVE_DATE}</p>
        </header>

        <div className="privacy-policy-page__body">
          <p>
            This Privacy Policy explains how Lavey (&quot;Lavey&quot;, &quot;we&quot;, &quot;us&quot; or
            &quot;our&quot;) collects, uses, shares and protects personal information when you use the
            Lavey website, Android application and related services. Lavey is operated and developed by
            Brainstak, registration number 2026/492377/07.
          </p>
          <p>
            By using Lavey, you agree to this Privacy Policy. If you do not agree, please do not use the
            service.
          </p>

          <h2>1. Who this policy applies to</h2>
          <p>
            This policy applies to visitors to our website, people who download the Lavey Android app, and
            registered members who create a Lavey account. Lavey is intended only for adults aged 18 and
            older.
          </p>

          <h2>2. Information we collect</h2>
          <p>Depending on how you use Lavey, we may collect:</p>
          <ul>
            <li>
              <strong>Account information:</strong> name, email address, password (stored in hashed form),
              date of birth, gender, orientation, language and onboarding preferences.
            </li>
            <li>
              <strong>Profile information:</strong> photos, bio, interests, theme song, pronouns, city,
              country and other details you choose to add to your profile.
            </li>
            <li>
              <strong>Location information:</strong> approximate or precise location when you grant
              permission, used to show people nearby and distance on profiles.
            </li>
            <li>
              <strong>Communications:</strong> messages, likes, matches, meetup activity, support requests
              and reports you send through the app.
            </li>
            <li>
              <strong>Verification data:</strong> reference photos and live selfies submitted for identity
              verification review.
            </li>
            <li>
              <strong>Device and usage data:</strong> device type, operating system, app version, IP
              address, push notification tokens, log data, crash information and how you interact with
              features.
            </li>
            <li>
              <strong>Payment-related data:</strong> subscription status and transaction references from
              payment providers. We do not store full card numbers on our servers.
            </li>
            <li>
              <strong>Website analytics:</strong> page views, download events, referral activity and a
              randomly generated browser identifier on our marketing site.
            </li>
          </ul>

          <h2>3. How we use your information</h2>
          <p>We use personal information to:</p>
          <ul>
            <li>create and manage your account;</li>
            <li>show profiles, matches, messages and discovery features;</li>
            <li>estimate distance and surface people near you;</li>
            <li>operate identity verification and trust features;</li>
            <li>send service, safety and account-related notifications;</li>
            <li>process subscriptions and in-app purchases;</li>
            <li>moderate content, investigate reports and protect members;</li>
            <li>improve performance, security and product quality;</li>
            <li>comply with law and respond to lawful requests.</li>
          </ul>

          <h2>4. Legal basis (South Africa)</h2>
          <p>
            We process personal information in accordance with the Protection of Personal Information Act,
            2013 (POPIA) and other applicable laws. Depending on the activity, we rely on your consent,
            performance of a contract with you, our legitimate interests in operating a safe dating
            platform, and compliance with legal obligations.
          </p>

          <h2>5. How we share information</h2>
          <p>We do not sell your personal information. We may share information with:</p>
          <ul>
            <li>
              <strong>Other members:</strong> information you place on your profile or send in messages is
              visible according to your settings and app functionality.
            </li>
            <li>
              <strong>Service providers:</strong> hosting, database, authentication, email, analytics,
              push notifications, payment processing, content moderation and customer support tools that
              help us run Lavey.
            </li>
            <li>
              <strong>Authorities:</strong> where required by law, court order or to protect the safety of
              members or the public.
            </li>
            <li>
              <strong>Business transfers:</strong> if our business is reorganised, merged or sold, subject
              to appropriate safeguards.
            </li>
          </ul>

          <h2>6. Location data</h2>
          <p>
            Location helps power nearby discovery and distance display. You can control location
            permissions through your device settings. If location is disabled, some features may not work
            as intended. Location may be approximate and is not a guarantee of a person&apos;s real-time
            whereabouts.
          </p>

          <h2>7. Photos, verification and moderation</h2>
          <p>
            Photos and verification submissions are stored securely and reviewed only as needed for account
            operation, trust, safety and legal compliance. We may use automated and human review to detect
            abuse, spam, impersonation or policy violations.
          </p>

          <h2>8. Messages and confidentiality</h2>
          <p>
            Private messages are generally visible only to participants in the conversation. However,
            messages may be reviewed where reasonably necessary to respond to reports, enforce community
            rules, prevent harm, investigate abuse or comply with law.
          </p>

          <h2>9. Cookies and analytics</h2>
          <p>
            Our website may use cookies and similar technologies, including Google Analytics, to understand
            traffic, measure downloads and improve the marketing site. You can control cookies through your
            browser settings where supported.
          </p>

          <h2>10. Push notifications</h2>
          <p>
            If you enable notifications, we use device tokens to send alerts about matches, messages,
            verification updates and other service events. You can disable notifications in your device or
            app settings.
          </p>

          <h2>11. Data retention</h2>
          <p>
            We keep personal information only for as long as needed to provide the service, resolve
            disputes, enforce agreements, maintain security and meet legal obligations. When you delete
            your account, we delete or anonymise information within a reasonable period, except where
            retention is required by law or for legitimate safety purposes.
          </p>

          <h2>12. Your rights</h2>
          <p>Subject to applicable law, you may have the right to:</p>
          <ul>
            <li>access the personal information we hold about you;</li>
            <li>request correction of inaccurate information;</li>
            <li>request deletion of your account and associated data;</li>
            <li>object to or restrict certain processing;</li>
            <li>withdraw consent where processing is based on consent;</li>
            <li>lodge a complaint with the Information Regulator (South Africa).</li>
          </ul>
          <p>
            You can update many profile and privacy settings in the app. For other requests, contact us at{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
          </p>

          <h2>13. Children&apos;s privacy</h2>
          <p>
            Lavey is not for anyone under 18. We do not knowingly collect personal information from
            minors. If you believe a minor is using Lavey, contact us so we can take appropriate action.
          </p>

          <h2>14. International transfers</h2>
          <p>
            Your information may be processed in South Africa and in other countries where our service
            providers operate. Where information is transferred across borders, we take reasonable steps to
            protect it in line with applicable law.
          </p>

          <h2>15. Security</h2>
          <p>
            We use technical and organisational measures designed to protect personal information,
            including encryption in transit, access controls and monitoring. No method of transmission or
            storage is completely secure, so we cannot guarantee absolute security.
          </p>

          <h2>16. Changes to this policy</h2>
          <p>
            We may update this Privacy Policy from time to time. If we make material changes, we will post
            the updated policy on this page and update the effective date. Continued use of Lavey after
            changes take effect means you accept the updated policy.
          </p>

          <h2>17. Contact us</h2>
          <p>
            For privacy questions, data requests or complaints, contact:
            <br />
            <strong>Brainstak / Lavey Privacy</strong>
            <br />
            Email: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            <br />
            Registration no. 2026/492377/07
          </p>
        </div>

        <footer className="privacy-policy-page__footer">
          <p>© {new Date().getFullYear()} Lavey. All rights reserved.</p>
          <a href="/">Return to lavey.co.za</a>
        </footer>
      </article>
    </main>
  );
}
