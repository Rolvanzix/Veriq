import type { Address } from 'viem';

export type UserRole =
  | 'ORG_OWNER'         // Organization Owner
  | 'ORG_ADMIN'         // Organization Administrator
  | 'ISSUER'            // Authorized Issuer Wallet
  | 'VIEWER_AUDITOR'    // Viewer / Auditor
  | 'HOLDER'            // Credential Holder
  | 'PUBLIC_VERIFIER';  // Public Verifier

export type Permission =
  | 'ISSUE_CREDENTIAL'
  | 'REVOKE_CREDENTIAL'
  | 'MANAGE_ORGANIZATION'
  | 'MANAGE_ADMINS'
  | 'MANAGE_ISSUER_WALLETS'
  | 'VIEW_AUDIT_LOGS'
  | 'VIEW_PRIVATE_CREDENTIALS'
  | 'HOLD_CREDENTIALS'
  | 'SHARE_CREDENTIALS'
  | 'VERIFY_CREDENTIALS';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ORG_OWNER: [
    'ISSUE_CREDENTIAL',
    'REVOKE_CREDENTIAL',
    'MANAGE_ORGANIZATION',
    'MANAGE_ADMINS',
    'MANAGE_ISSUER_WALLETS',
    'VIEW_AUDIT_LOGS',
    'VIEW_PRIVATE_CREDENTIALS',
    'HOLD_CREDENTIALS',
    'SHARE_CREDENTIALS',
    'VERIFY_CREDENTIALS',
  ],
  ORG_ADMIN: [
    'ISSUE_CREDENTIAL',
    'REVOKE_CREDENTIAL',
    'MANAGE_ISSUER_WALLETS',
    'VIEW_AUDIT_LOGS',
    'VIEW_PRIVATE_CREDENTIALS',
    'HOLD_CREDENTIALS',
    'SHARE_CREDENTIALS',
    'VERIFY_CREDENTIALS',
  ],
  ISSUER: [
    'ISSUE_CREDENTIAL',
    'REVOKE_CREDENTIAL',
    'VIEW_PRIVATE_CREDENTIALS',
    'HOLD_CREDENTIALS',
    'SHARE_CREDENTIALS',
    'VERIFY_CREDENTIALS',
  ],
  VIEWER_AUDITOR: [
    'VIEW_AUDIT_LOGS',
    'VIEW_PRIVATE_CREDENTIALS',
    'HOLD_CREDENTIALS',
    'VERIFY_CREDENTIALS',
  ],
  HOLDER: [
    'HOLD_CREDENTIALS',
    'SHARE_CREDENTIALS',
    'VERIFY_CREDENTIALS',
  ],
  PUBLIC_VERIFIER: [
    'VERIFY_CREDENTIALS',
  ],
};

export type OrgVerificationStatus =
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'SUSPENDED'
  | 'REJECTED'
  | 'REVOKED';

export type OrganizationType =
  | 'Higher Education / University'
  | 'Government Body / Agency'
  | 'Corporation / Enterprise'
  | 'Financial Institution'
  | 'Healthcare Organization'
  | 'Professional Certification Body'
  | 'Non-Profit / NGO';

export interface AuthorizedRepresentative {
  fullName: string;
  title: string;
  officialEmail: string; // Must match official domain
  walletAddress: Address;
  signature?: `0x${string}`;
  signedAt?: string;
  challengeMessage?: string;
  isVerified: boolean;
}

export interface DomainControlVerification {
  domain: string;
  method: 'WELL_KNOWN_FILE' | 'DNS_TXT';
  challengeToken: string;
  isVerified: boolean;
  verifiedAt?: string;
  lastCheckedAt?: string;
  dnsHostRecord?: string;
  wellKnownEndpoint?: string;
  failureReason?: string;
}

export interface OrganizationInfo {
  id: string;
  name: string;
  orgType: OrganizationType;
  country: string;
  website: string;
  domain: string;
  contactEmail: string;
  description: string;
  logoUrl?: string;
  didUri: string;
  metadataHash: string;
  status: OrgVerificationStatus;
  ownerAddress: Address;
  issuerWalletAddress: Address;
  representative: AuthorizedRepresentative;
  domainVerification: DomainControlVerification;
  credentialCount: number;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
  rejectionReason?: string;
}

export interface AuthorizedWalletRecord {
  id: string;
  orgId: string;
  walletAddress: Address;
  role: 'ISSUER';
  label: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
  approvedBy: Address;
  approvedAt: string;
}

export interface AuthSession {
  userAddress?: Address;
  role: UserRole;
  token?: string;
  organization?: OrganizationInfo;
  isWalletVerified: boolean;
  isAppAuthenticated: boolean;
  adminEmail?: string;
  displayName: string;
  expiresAt: number;
}
