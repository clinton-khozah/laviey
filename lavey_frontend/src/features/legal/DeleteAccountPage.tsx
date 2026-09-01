import { useEffect } from 'react';
import { APP_IMAGES } from '@/constants/images';
import './DeleteAccountPage.css';

const SUPPORT_EMAIL = 'support@lavey.co.za';

export function DeleteAccountPage() {
  useEffect(() => {
    document.documentElement.classList.add('legal-document');
    document.body.classList.add('legal-document');
    return () => {
      document.documentElement.classList.remove('legal-document');
      document.body.classList.remove('legal-document');
    };
  }, []);

  return (
    <main className="delete-account-page">
      <header className="delete-account-page__header">
        <a href="/" className="delete-account-page__brand">
          <img src={APP_IMAGES.logo} alt="Lavey" />
          <span>Lavey</span>
        </a>
        <a href="/" className="delete-account-page__back">
          Back to home
        </a>
      </header>

      <article className="delete-account-page__card">
        <header className="delete-account-page__intro">
          <span className="delete-account-page__eyebrow">Account</span>
          <h1>Delete your Lavey account</h1>
          <p>Request permanent deletion of your account and associated personal data.</p>
        </header>

        <div className="delete-account-page__body">
          <p>
            You can delete your Lavey account at any time. When you delete your account, we remove your
            profile and associated personal data from our active systems, subject to limited retention
            described below.
          </p>

          <h2>Option 1 — Delete in the Lavey app (fastest)</h2>
          <ol>
            <li>Open the <strong>Lavey</strong> app and sign in.</li>
            <li>Go to the <strong>You</strong> tab.</li>
            <li>Open <strong>Settings</strong> (gear icon).</li>
            <li>Tap <strong>Safety, privacy &amp; take a break</strong>.</li>
            <li>Scroll down and tap <strong>Delete my account permanently</strong>.</li>
            <li>Confirm when prompted. Deletion starts immediately and cannot be undone.</li>
          </ol>

          <h2>Option 2 — Request deletion by email</h2>
          <p>
            If you cannot access the app, email us from the address linked to your Lavey account:
          </p>
          <p>
            <a href={`mailto:${SUPPORT_EMAIL}?subject=Account%20deletion%20request`}>{SUPPORT_EMAIL}</a>
          </p>
          <p>Include:</p>
          <ul>
            <li>Subject line: <strong>Account deletion request</strong></li>
            <li>The email address registered on your Lavey account</li>
            <li>Your display name (optional, helps us locate your account)</li>
          </ul>
          <p>
            We may ask for a short verification step to protect your account. We aim to complete verified
            requests within <strong>30 days</strong>.
          </p>

          <h2>What we delete</h2>
          <p>When your account is deleted, we remove active copies of data such as:</p>
          <ul>
            <li>Your profile (photos, bio, interests, theme song, and preferences)</li>
            <li>Matches, likes, and discovery visibility</li>
            <li>Messages and conversation history tied to your account</li>
            <li>Push notification tokens and in-app settings</li>
            <li>Verification submissions linked to your account</li>
          </ul>

          <h2>What we may keep (limited)</h2>
          <p>
            We may retain certain information for a limited period where required by law, for fraud
            prevention, dispute resolution, safety investigations, or billing records (for example,
            subscription or payment references from app stores). Where retention is required, data is
            restricted and not used for marketing.
          </p>

          <h2>Download your data first (optional)</h2>
          <p>
            Before deleting, you can export a copy of your data in the app under{' '}
            <strong>Safety, privacy &amp; take a break → Download my data</strong>.
          </p>

          <h2>Questions</h2>
          <p>
            For privacy or deletion questions, contact{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. See also our{' '}
            <a href="/privacy-policy">Privacy Policy</a>.
          </p>
        </div>

        <footer className="delete-account-page__footer">
          <p>Operated by Brainstak · Registration no. 2026/492377/07</p>
          <a href="/privacy-policy">Privacy Policy</a>
        </footer>
      </article>
    </main>
  );
}
