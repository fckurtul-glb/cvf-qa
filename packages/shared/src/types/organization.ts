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

export type ReportCode = 'INSTITUTIONAL' | 'DEPARTMENT' | 'INDIVIDUAL_360' | 'YOKAK_EVIDENCE' | 'COMPARATIVE';

export interface OrgCapabilities {
  allowedModules: import('./survey').ModuleCode[];
  features: {
    assessment360: boolean;
    gapAnalysis: boolean;
    descriptiveAnalytics: boolean;
    departmentComparison: boolean;
    stakeholderComparison: boolean;
  };
  allowedReports: ReportCode[];
  limits: {
    maxUsers: number;                  // -1 = unlimited
    maxCampaigns: number;              // -1 = unlimited
    maxParticipantsPerCampaign: number;
  };
}

export interface OrgSettings {
  allowedModules: import('./survey').ModuleCode[];
  maxParticipants: number;
  ssoEnabled: boolean;
  ssoProvider?: 'saml' | 'oidc';
  logoUrl?: string;
  primaryColor?: string;
  capabilities?: Partial<OrgCapabilities>;
}

export interface Department {
  id: string;
  orgId: string;
  name: string;
  parentDepartmentId: string | null;
  headUserId: string | null;
}
