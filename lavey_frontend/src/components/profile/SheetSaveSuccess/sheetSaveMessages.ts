export type SheetSaveAction =
  | 'profile'
  | 'photo'
  | 'settings'
  | 'bank'
  | 'withdraw'
  | 'safety'
  | 'contacts-import'
  | 'verify'
  | 'platinum'
  | 'post'
  | 'meetup-delete';

export interface SheetSaveCopy {
  title: string;
  message: string;
}

export function getSheetSaveCopy(action: SheetSaveAction, detail?: string): SheetSaveCopy {
  switch (action) {
    case 'profile':
      return {
        title: 'Profile saved',
        message: 'Your name, bio, and interests are live for matches to discover.',
      };
    case 'photo':
      return {
        title: 'Photo added',
        message: 'Your gallery just got a fresh look on your profile and discover card.',
      };
    case 'settings':
      return {
        title: 'Preferences saved',
        message: 'Theme, language, typing style, and notifications are set your way.',
      };
    case 'bank':
      return {
        title: 'Bank details secured',
        message: 'Your payout info is saved — you’re ready to withdraw gift earnings.',
      };
    case 'withdraw':
      return {
        title: 'Withdrawal started',
        message: detail ?? 'Funds typically arrive in 3–5 business days.',
      };
    case 'safety':
      return {
        title: 'Privacy updated',
        message: detail ?? 'Your visibility, messaging, and safety choices are saved to your account.',
      };
    case 'contacts-import':
      return {
        title: 'Contacts imported',
        message: detail ?? 'We’ll let you know when friends from your list join Lavey.',
      };
    case 'verify':
      return {
        title: 'You\'re verified',
        message: 'Your verified badge is live on your profile — matches can trust it\'s really you.',
      };
    case 'platinum':
      return {
        title: 'Welcome to Platinum',
        message: 'Every perk is unlocked. Stand out, match faster, and see who’s into you.',
      };
    case 'post':
      return {
        title: 'Pic is live',
        message: 'Your photo is on your profile and ready to spark new connections.',
      };
    case 'meetup-delete':
      return {
        title: 'Meetup deleted',
        message: detail
          ? `"${detail}" was removed.`
          : 'Your meetup was removed.',
      };
    default:
      return {
        title: 'Saved',
        message: 'Your changes are all set.',
      };
  }
}
