export type UserRole = 'super_admin' | 'org_admin' | 'unit_admin' | 'participant' | 'viewer';
export type StakeholderGroup = 'academic' | 'administrative' | 'student' | 'external' | 'alumni';
export type AuthMethod = 'email_password' | 'magic_link' | 'sso_saml' | 'sso_oidc';

export interface JwtPayload {
  sub: string;
  org: string;
  role: UserRole;
  stakeholder: StakeholderGroup;
  iat: number;
  exp: number;
}

export interface AuthTokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginRequest {
  email: string;
  password: string;
  otpCode?: string;
}

export interface MagicLinkRequest {
  email: string;
  recaptchaToken: string;
}
