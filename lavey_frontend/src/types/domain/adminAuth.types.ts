export interface AdminAccount {
  id: string;
  email: string;
  displayName: string;
}

export interface AdminAuthSession {
  token: string;
  admin: AdminAccount;
}

export interface AdminRegisterRequest {
  email: string;
  password: string;
  displayName: string;
  inviteCode?: string;
}

export interface AdminSignInRequest {
  email: string;
  password: string;
}
