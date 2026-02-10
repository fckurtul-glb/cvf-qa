export type PackageTier = 'starter' | 'professional' | 'enterprise';

export interface Organization {
  id: string;
  name: string;
  domain: string;
  packageTier: PackageTier;
  isActive: boolean;
  createdAt: Date;
  settings: OrgSettings;
}

export interface OrgSettings {
  allowedModules: import('./survey').ModuleCode[];
  maxParticipants: number;
  ssoEnabled: boolean;
  ssoProvider?: 'saml' | 'oidc';
  logoUrl?: string;
  primaryColor?: string;
}

export interface Department {
  id: string;
  orgId: string;
  name: string;
  parentDepartmentId: string | null;
  headUserId: string | null;
}
