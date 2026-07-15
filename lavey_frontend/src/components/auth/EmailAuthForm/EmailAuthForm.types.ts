export type EmailAuthMode = 'sign-in' | 'sign-up';

export interface EmailAuthFormProps {
  mode: EmailAuthMode;
  onModeChange: (mode: EmailAuthMode) => void;
  onSignIn: (email: string, password: string) => void;
  onSignUp: (email: string, password: string, displayName: string) => void;
  disabled?: boolean;
}
