export type TrustInfoVariant = 'guidelines' | 'terms';

export interface TrustInfoSection {
  title: string;
  body: string[];
}

export interface TrustInfoContent {
  title: string;
  intro: string;
  safetyNote: string;
  sections: TrustInfoSection[];
  footer: string;
}

export const TRUST_INFO: Record<TrustInfoVariant, TrustInfoContent> = {
  guidelines: {
    title: 'Community guidelines',
    intro:
      'Lavey is built for real connections. These rules keep the community respectful, safe, and fun for everyone.',
    safetyNote:
      'We use automated and human review to enforce these guidelines. Reports are confidential — the person you report will not be told who filed it.',
    sections: [
      {
        title: 'Be yourself',
        body: [
          'Use recent photos that clearly show you.',
          'Do not impersonate others or use misleading profile information.',
          'One account per person.',
        ],
      },
      {
        title: 'Be respectful',
        body: [
          'No harassment, hate speech, threats, or bullying.',
          'Take “no” gracefully — unmatched or blocked means stop contacting that person.',
          'Keep conversations appropriate for a dating community.',
        ],
      },
      {
        title: 'Stay safe',
        body: [
          'Never share passwords, banking details, or send money to matches.',
          'Meet in public places and tell a friend when meeting someone new.',
          'Use in-app reporting if something feels wrong.',
        ],
      },
      {
        title: 'Not allowed',
        body: [
          'Sexual content involving minors, exploitation, or non-consensual material.',
          'Spam, scams, multi-level marketing, or off-platform payment requests.',
          'Violence, illegal activity, or weapons in profile content.',
        ],
      },
    ],
    footer: 'Breaking these guidelines may result in warnings, restrictions, or a permanent ban.',
  },
  terms: {
    title: 'Terms of service',
    intro:
      'By using Lavey you agree to these terms. Please read them so you know how the app works and how we protect you.',
    safetyNote:
      'Your data is encrypted in transit, stored securely, and never sold to third-party advertisers. You control what appears on your profile and who can see you in Discover.',
    sections: [
      {
        title: 'Your account',
        body: [
          'You must be 18 or older to use Lavey.',
          'You are responsible for activity on your account and keeping your login secure.',
          'You may delete your account at any time from Safety & privacy.',
        ],
      },
      {
        title: 'Your content',
        body: [
          'You own the photos and messages you post; you grant Lavey a license to display them in the app.',
          'We may remove content that violates our Community Guidelines.',
          'AI-assisted features (e.g. match suggestions) are provided as-is and may be updated over time.',
        ],
      },
      {
        title: 'Privacy & data',
        body: [
          'We collect only what we need to run the service: profile info, messages, and usage to improve safety.',
          'Location is used for Nearby and distance filters — you can limit visibility in Safety & privacy.',
          'Contact support anytime to request a copy of your data or ask privacy questions.',
        ],
      },
      {
        title: 'Subscriptions',
        body: [
          'Platinum and other paid features are billed through your app store account.',
          'Refunds follow the store’s policies; contact support if you need help.',
        ],
      },
    ],
    footer: 'We may update these terms. Continued use after changes means you accept the updated terms.',
  },
};
