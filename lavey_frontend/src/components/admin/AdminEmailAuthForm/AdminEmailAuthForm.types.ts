export type AdminEmailAuthMode = 'sign-in' | 'sign-up';

export interface AdminEmailAuthFormProps {
  mode: AdminEmailAuthMode;
  onModeChange: (mode: AdminEmailAuthMode) => void;
  onSignIn: (email: string, password: string) => void;
  onSignUp: (email: string, password: string, displayName: string, inviteCode: string) => void;
  disabled?: boolean;
  showInviteCode?: boolean;
  requiresInviteCode?: boolean;
  initialEmail?: string;
}
