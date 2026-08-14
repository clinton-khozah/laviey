import './LandingPage.css';
import './LandingDevice.css';
import { useEffect, useState } from 'react';
import './LandingLegal.css';
import './LandingLegalOverrides.css';
import './LandingMarketing.css';
import { marketingService, APK_DOWNLOAD_FILENAME, APK_DOWNLOAD_URL } from '@/services/marketing/marketingService';
import { trackMarketingEvent } from '@/utils/analytics/googleAnalytics';

function compactDownloadCount(count: number): string {
  if (count < 1_000) return `${count}+`;
  return `${Math.floor(count / 1_000)}K+`;
}

function PlayMark() {
  return <svg viewBox="0 0 48 52" aria-hidden="true"><path fill="#00d7fe" d="M4 3.7a5 5 0 0 0-1 3v38.6c0 1 .3 2 .9 2.8l22-22Z"/><path fill="#00ef77" d="m6.8 2.3 26.5 15.2-7.4 8.6-22-22c.8-1.2 1.8-2 2.9-1.8Z"/><path fill="#ffdf00" d="m33.3 17.5 8.8 5.1c2.6 1.5 2.6 3.9 0 5.4l-9.3 5.3-6.9-7.2Z"/><path fill="#ff3a44" d="m32.8 33.3-26 14.9c-1 .5-2-.1-2.9-1.1l22-21Z"/></svg>;
}

export function LandingPage() {
  const [showTerms, setShowTerms] = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  const [downloadCount, setDownloadCount] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);
  useEffect(() => {
    document.documentElement.classList.add('landing-document');
    document.body.classList.add('landing-document');
    return () => {
      document.documentElement.classList.remove('landing-document');
      document.body.classList.remove('landing-document');
    };
  }, []);

  useEffect(() => {
    void marketingService.recordVisit().catch(() => undefined);
    void marketingService.getStats().then((value) => setDownloadCount(value.downloadCount)).catch(() => undefined);
    const referralCode = new URLSearchParams(location.search).get('ref');
    if (referralCode) trackMarketingEvent('referral_visit', { referral_code: referralCode });
  }, []);

  const requestDownload = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (downloading) return;

    setDownloading(true);
    trackMarketingEvent('apk_download', { source: 'landing_page', referred: Boolean(new URLSearchParams(location.search).get('ref')) });
    void marketingService.recordDownload()
      .then((result) => setDownloadCount(result.downloadCount))
      .catch(() => undefined);

    window.location.assign(APK_DOWNLOAD_URL);
    window.setTimeout(() => setDownloading(false), 4000);
  };

  const navDownloadLabel = downloading ? 'Starting download…' : 'Get the App';
  const heroDownloadLabel = downloading ? 'Preparing Lavey.apk…' : 'Download Lavey';
  const stickyDownloadLabel = downloading ? 'Starting…' : 'Download';

  return <main className="landing">
    <nav className="landing__nav">
      <a className="landing__brand" href="#top" aria-label="Lavey home"><img src="/images/logo.png" alt=""/><span>Lavey</span></a>
      <a
        className={`landing__nav-download${downloading ? ' landing__nav-download--busy' : ''}`}
        href={APK_DOWNLOAD_URL}
        onClick={requestDownload}
        aria-busy={downloading}
      >
        {navDownloadLabel}
      </a>
    </nav>

    <section className="landing__hero" id="top">
      <div className="landing__copy">
        <span className="landing__eyebrow">Dating, with a little more feeling</span>
        <h1>Feel the vibe<br/>before you match.</h1>
        <p>Lavey is a free dating social app for meeting people nearby or connecting with someone anywhere in the world. Share your music, express your vibe and start conversations that feel easy from the first hello—no subscription needed.</p>
        <div className="landing__actions">
          <a
            className={`landing__download${downloading ? ' landing__download--busy' : ''}`}
            href={APK_DOWNLOAD_URL}
            onClick={requestDownload}
            aria-busy={downloading}
          >
            <span>{heroDownloadLabel}</span>
            <small>{downloading ? 'Check your downloads folder' : 'Android APK · Free'}</small>
          </a>
          <div className="landing__play"><PlayMark/><span><small>Coming soon on</small><strong>Google Play</strong></span></div>
          <div className="landing__ios"><img className="landing__apple-mark" src="/images/apple-logo.svg" alt="Apple"/><span><small>Coming soon on the</small><strong>App Store</strong></span></div>
        </div>
        {downloadCount !== null ? <div className="landing__download-count"><strong>{compactDownloadCount(downloadCount)}</strong><span className="landing__download-trend" aria-label="Growing">↗</span> app downloads</div> : null}
        <div className="landing__proof"><span>Nearby & worldwide</span><i/><span>Real conversations</span><i/><span>Your music, your vibe</span></div>
      </div>

      <div className="landing__visual" aria-label="Lavey mobile app preview">
        <div className="landing__orbit landing__orbit--one"/><div className="landing__orbit landing__orbit--two"/>
        <img className="landing__device-image" src="/images/wesite-profile.png" alt="Lavey app shown on two mobile phones" />
      </div>
      <div className="landing__mobile-stores">
        <div className="landing__play"><PlayMark/><span><small>Coming soon on</small><strong>Google Play</strong></span></div>
        <div className="landing__ios"><img className="landing__apple-mark" src="/images/apple-logo.svg" alt="Apple"/><span><small>Coming soon on the</small><strong>App Store</strong></span></div>
      </div>
    </section>

    <footer className="landing__how">
      <p>Made for better first conversations</p>
      <div><article><figure className="landing__couple-visual"><img src="/images/couple.png" alt="Two people holding phones with the Lavey app open" /></figure><b>01</b><h2>Show your vibe</h2><span>Add your interests, photos and the song that says something about you.</span></article><article><b>02</b><h2>Meet near or far</h2><span>Find people close to you or explore connections from around the world.</span></article><article><figure className="landing__single-visual"><img src="/images/single123.png" alt="A Lavey member holding a phone with the messages screen open" /></figure><b>03</b><h2>Talk naturally</h2><span>Match, say hello and see where a good conversation takes you.</span></article></div>
      <div className="landing__footer-meta"><span className="landing__footer-brand"><img src="/images/logo.png" alt=""/>© {new Date().getFullYear()} Lavey. All rights reserved.</span><span className="landing__legal-links"><button type="button" onClick={() => setShowTerms(true)}>Terms & Conditions</button><a href="mailto:support@lavey.co.za">support@lavey.co.za</a><button type="button" onClick={() => { trackMarketingEvent('referral_opened'); setShowReferral(true); }}>Refer a friend &amp; earn</button></span><span>Powered and developed by <strong>Brainstak</strong> · Registration no. 2026/492377/07</span></div>
    </footer>

    <aside className="landing__sticky-download" aria-label="Download Lavey for Android">
      <img src="/images/logo.png" alt=""/>
      <div><strong>Get Lavey</strong><small>Free Android download</small></div>
      <a
        className={downloading ? 'landing__sticky-download-btn--busy' : undefined}
        href={APK_DOWNLOAD_URL}
        onClick={requestDownload}
        aria-busy={downloading}
      >
        {stickyDownloadLabel}
      </a>
    </aside>
    {downloading ? (
      <div className="landing-apk-download" role="status" aria-live="polite">
        <div className="landing-apk-download__spinner" aria-hidden />
        <div className="landing-apk-download__copy">
          <strong>Downloading {APK_DOWNLOAD_FILENAME}</strong>
          <small>Your install file should appear in your downloads any second now.</small>
        </div>
      </div>
    ) : null}
    {showReferral ? <ReferralDialog onClose={() => setShowReferral(false)} /> : null}
    {showTerms ? <TermsDialog onClose={() => setShowTerms(false)} /> : null}
  </main>;
}

function ReferralDialog({ onClose }: { onClose(): void }) {
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [data, setData] = useState<{ code: string; displayName: string; referrals: number; rewardUsd: number; nextRewardAt: number } | null>(null); const [error, setError] = useState(''); const [copied, setCopied] = useState(false); const [busy, setBusy] = useState(false);
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const loadReferral = async () => { if (name.trim().length < 2 || !validEmail) return; setBusy(true); setError(''); try { const result = await marketingService.getReferral(name.trim(), email.trim()); setData(result); trackMarketingEvent('referral_link_created', { referral_code: result.code }); } catch { setError('Could not create your referral link. Please try again.'); } finally { setBusy(false); } };
  const link = data ? `${location.origin}/?ref=${encodeURIComponent(data.code)}` : '';
  const copy = async () => { await navigator.clipboard.writeText(link); trackMarketingEvent('referral_link_copied', { referral_code: data?.code ?? '' }); setCopied(true); window.setTimeout(() => setCopied(false), 1800); };
  return <div className="landing-download-dialog" role="dialog" aria-modal="true" aria-labelledby="referral-title"><section className="landing-referral"><img className="landing-download-dialog__mark" src="/images/logo.png" alt=""/><h2 id="referral-title">Refer friends &amp; earn</h2><p>Share your personal link. Referral attribution stays active for 24 hours after a friend opens it. Each unique friend who downloads Lavey counts once. Every 30 referrals earns $5.</p>{!data ? <div className="landing-referral__fields"><label>Your name<input value={name} maxLength={50} autoFocus onChange={(event) => setName(event.target.value)} /></label><label>Your email<input type="email" value={email} maxLength={254} onChange={(event) => setEmail(event.target.value)} /></label><small>We use this email to identify you and contact you about referral rewards.</small></div> : null}{error ? <><p className="landing-download-dialog__error">{error}</p><button className="landing-referral__retry" type="button" onClick={() => void loadReferral()}>Try again</button></> : data ? <><div className="landing-referral__progress"><strong>{data.referrals}</strong><span>{data.displayName} · ${data.rewardUsd} earned</span><progress value={data.referrals % 30} max={30}/><small>{30 - (data.referrals % 30 || 30) === 0 ? 30 : 30 - (data.referrals % 30)} more until your next $5</small></div><label>Your referral link<input readOnly value={link} onFocus={(event) => event.currentTarget.select()}/></label></> : null}<div className="landing-download-dialog__actions"><button type="button" onClick={onClose}>Close</button>{data ? <button type="button" onClick={() => void copy()}>{copied ? 'Copied!' : 'Copy link'}</button> : <button type="button" disabled={busy || name.trim().length < 2 || !validEmail} onClick={() => void loadReferral()}>{busy ? 'Creating…' : 'Create link'}</button>}</div></section></div>;
}

function TermsDialog({ onClose }: { onClose(): void }) {
  return <div className="landing-terms" role="dialog" aria-modal="true" aria-labelledby="terms-title"><section><header><div><span>Legal</span><h2 id="terms-title">Lavey Terms & Conditions</h2><p>Effective 11 August 2026</p></div><button type="button" onClick={onClose} aria-label="Close terms">×</button></header><div className="landing-terms__body">
    <p>These Terms govern access to the Lavey website, Android application and related services (“Lavey”). Lavey is operated and developed by Brainstak, registration number 2026/492377/07 (“we”, “us” or “our”). By accessing, downloading, registering for or using Lavey, you agree to these Terms. If you do not agree, do not use the service.</p>
    <h3>1. Adults only</h3><p>You must be at least 18 years old and legally able to enter into a binding agreement. Minors may not access, download, register for or use Lavey. We may request age or identity verification and suspend or remove accounts where age is uncertain or misrepresented. Report suspected underage users immediately.</p>
    <h3>2. Account responsibility</h3><p>You must provide accurate information, use recent photos that belong to you, maintain one personal account, protect your login details and notify us of unauthorised access. You may not impersonate another person, create deceptive profiles or transfer your account.</p>
    <h3>3. Dating and personal safety</h3><p>Lavey helps people discover and communicate; we do not guarantee identity, intentions, compatibility, conduct, background or safety. Use judgment, keep financial and sensitive information private, meet in public, tell someone you trust and arrange your own transport. Never send money to another member. In an emergency, contact local emergency services.</p>
    <h3>4. Acceptable use</h3><p>You may not use Lavey for harassment, hate, threats, stalking, exploitation, trafficking, scams, spam, illegal activity, commercial solicitation or non-consensual sexual conduct. Content involving minors, intimate content shared without consent, violence or unlawful goods is prohibited. Respect blocks, rejections and requests to stop contact.</p>
    <h3>5. Your content</h3><p>You retain ownership of content you submit. You grant us a worldwide, non-exclusive, royalty-free licence to host, store, reproduce, adapt and display it only as needed to operate, secure, moderate and improve Lavey. You confirm that you have all required rights and consents. We may remove content that violates these Terms or the law.</p>
    <h3>6. Location and discovery</h3><p>Nearby features use location and profile data to estimate distance; results may be approximate or outdated. Worldwide discovery may show members outside your area. Do not rely on distance, online status or profile information as proof of a person’s real-time location or identity.</p>
    <h3>7. AI features and companions</h3><p>Profiles operated as AI companions are visibly labelled. AI-generated replies may be inaccurate or inappropriate and are not professional advice. Do not provide AI companions with passwords, banking information or highly sensitive personal data. We may review automated interactions for safety, quality and abuse prevention as permitted by law.</p>
    <h3>8. Purchases and paid features</h3><p>Prices, billing periods and included features are shown before purchase. App-store purchases, cancellations and refunds are also governed by the relevant store’s rules. Except where law requires otherwise, consumed digital credits and completed digital services are non-refundable. We may change future pricing with notice.</p>
    <h3>9. Privacy and communications</h3><p>We process profile, location, device, usage, safety and communication data to provide and protect the service, subject to applicable privacy law including POPIA. Website visits, downloads and referrals are counted using a randomly generated browser identifier; no email address is required for an APK download. We also use Google Analytics to understand traffic sources, page activity, downloads and referral interactions. In-app messages are not guaranteed to be confidential where review is reasonably required for reports, safety, legal compliance or service operation. Marketing communications may be opted out of; essential service and safety notices may still be sent.</p>
    <h3>10. Moderation and termination</h3><p>We may investigate reports and restrict, suspend or terminate access, remove content, preserve evidence or report conduct to authorities where reasonably necessary. We do not undertake to monitor every interaction. You may delete your account through the available account controls, subject to legally required retention.</p>
    <h3>11. Intellectual property</h3><p>Lavey’s software, design, brand, logos and platform content—excluding member content—belong to us or our licensors. You may not copy, scrape, reverse engineer, resell, automate access to or commercially exploit the service except where law expressly permits.</p>
    <h3>12. Service availability and disclaimers</h3><p>Lavey is provided on an “as available” basis. We do not promise uninterrupted operation, particular matches, responses, dates, relationships, earnings or outcomes. To the fullest extent allowed by law, we exclude implied warranties that may lawfully be excluded. Nothing in these Terms removes rights that cannot legally be waived.</p>
    <h3>13. Governing law and disputes</h3><p>These Terms are governed by the laws of the Republic of South Africa. The parties submit to the jurisdiction of a competent South African court. Before filing a claim, please contact support and allow a reasonable opportunity to resolve the dispute informally.</p>
    <h3>14. Changes and contact</h3><p>We may update these Terms for legal, safety or service changes. Material changes will be communicated where reasonably practical. Continued use after the effective date constitutes acceptance. Questions, legal notices and safety concerns may be sent to support@lavey.co.za.</p>
  </div><footer><p>This age gate is a declaration, not a substitute for identity verification.</p><button type="button" onClick={onClose}>Close</button></footer></section></div>;
}
