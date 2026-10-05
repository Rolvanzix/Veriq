import { getDb } from './client';
import type { Address } from 'viem';
import type {
  OrganizationInfo,
  AuthorizedWalletRecord,
  OrgVerificationStatus,
  OrganizationType,
  AuthorizedRepresentative,
  DomainControlVerification,
  UserRole,
} from '../../auth/types';

export interface AdminUserRecord {
  id: string;
  orgId: string;
  email: string;
  passwordHash: string; // SHA-256 hash
  fullName: string;
  walletAddress?: Address;
  role: 'ORG_OWNER' | 'ORG_ADMIN' | 'VIEWER_AUDITOR';
  isActive: boolean;
}

// In-Memory store for fast fallback & dev environment
const inMemoryOrganizations = new Map<string, OrganizationInfo>([
  [
    'org_arc_foundation',
    {
      id: 'org_arc_foundation',
      name: 'Arc Foundation & Network Authority',
      orgType: 'Government Body / Agency',
      country: 'Switzerland',
      website: 'https://arc.network',
      domain: 'arc.network',
      contactEmail: 'security@arc.network',
      description: 'Official genesis accreditation authority, core protocol steward, and governance body of Arc Network.',
      logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80',
      didUri: 'did:arc:org_arc_foundation',
      metadataHash: '0x12b5f8e6c4a30e8c8942b083d91f1a4e528b7e2837f6a7d903e1cb72e01f56a8',
      status: 'VERIFIED',
      ownerAddress: '0x28974aA448e8952B9c024d9f6974d08A375c3254',
      issuerWalletAddress: '0x28974aA448e8952B9c024d9f6974d08A375c3254',
      representative: {
        fullName: 'Sarah Chen',
        title: 'Executive Director of Protocol Governance',
        officialEmail: 's.chen@arc.network',
        walletAddress: '0x28974aA448e8952B9c024d9f6974d08A375c3254',
        signature: '0x1a8f902b4e5c6d7e8f901234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1b',
        signedAt: new Date(Date.now() - 90 * 86400000).toISOString(),
        isVerified: true,
      },
      domainVerification: {
        domain: 'arc.network',
        method: 'WELL_KNOWN_FILE',
        challengeToken: 'arc-verify-challenge-org_arc_foundation-9b2f8a10',
        isVerified: true,
        verifiedAt: new Date(Date.now() - 90 * 86400000).toISOString(),
        wellKnownEndpoint: 'https://arc.network/.well-known/arc-verify.json',
      },
      credentialCount: 1420,
      createdAt: new Date(Date.now() - 95 * 86400000).toISOString(),
      reviewedAt: new Date(Date.now() - 90 * 86400000).toISOString(),
      reviewedBy: 'Arc Governance Genesis Multisig',
      reviewNotes: 'Genesis authority verified via legal foundation charter and domain control.',
    },
  ],
  [
    'org_veriid_global',
    {
      id: 'org_veriid_global',
      name: 'VeriID Global KYC Consortium',
      orgType: 'Professional Certification Body',
      country: 'United Kingdom',
      website: 'https://veriid-global.com',
      domain: 'veriid-global.com',
      contactEmail: 'compliance@veriid-global.com',
      description: 'Institutional decentralized identity verification, AML compliance, and biometric proofs provider.',
      logoUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=128&auto=format&fit=crop&q=80',
      didUri: 'did:arc:org_veriid',
      metadataHash: '0x9a8f27801be64816c891630c72ba18561cda58309a473210d24bf4859a6d015c',
      status: 'VERIFIED',
      ownerAddress: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
      issuerWalletAddress: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
      representative: {
        fullName: 'Marcus Vance',
        title: 'Global Compliance Director',
        officialEmail: 'm.vance@veriid-global.com',
        walletAddress: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
        signature: '0x2c6f1a8e932b1f40d58a7e4b901234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678901b',
        signedAt: new Date(Date.now() - 40 * 86400000).toISOString(),
        isVerified: true,
      },
      domainVerification: {
        domain: 'veriid-global.com',
        method: 'DNS_TXT',
        challengeToken: 'arc-verify-challenge-org_veriid_global-4c19a82e',
        isVerified: true,
        verifiedAt: new Date(Date.now() - 40 * 86400000).toISOString(),
        dnsHostRecord: '_arc-verify-challenge.veriid-global.com',
      },
      credentialCount: 319,
      createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
      reviewedAt: new Date(Date.now() - 40 * 86400000).toISOString(),
      reviewedBy: 'Arc Compliance Review Board',
      reviewNotes: 'ISO 27001 accreditation verified with legal entity registry proof.',
    },
  ],
  [
    'org_mit_sandbox',
    {
      id: 'org_mit_sandbox',
      name: 'MIT Decentralized Credentials Lab',
      orgType: 'Higher Education / University',
      country: 'United States',
      website: 'https://mit.edu',
      domain: 'mit.edu',
      contactEmail: 'credentials@mit.edu',
      description: 'University research center issuing verifiable academic transcripts and engineering degree credentials.',
      didUri: 'did:arc:org_mit_sandbox',
      metadataHash: '0x37a1f59de109bb4578b87c42735160912189cdfb016259049c6baeeef099e2da',
      status: 'UNDER_REVIEW',
      ownerAddress: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
      issuerWalletAddress: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
      representative: {
        fullName: 'Prof. David K. Reed',
        title: 'Department Chair & Senior Fellow',
        officialEmail: 'dreed@mit.edu',
        walletAddress: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
        isVerified: true,
      },
      domainVerification: {
        domain: 'mit.edu',
        method: 'WELL_KNOWN_FILE',
        challengeToken: 'arc-verify-challenge-org_mit_sandbox-8f12b7a0',
        isVerified: true,
        verifiedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        wellKnownEndpoint: 'https://mit.edu/.well-known/arc-verify.json',
      },
      credentialCount: 0,
      createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      reviewNotes: 'Domain control verified. Awaiting final institutional accreditation review.',
    },
  ],
  [
    'org_unverified_sample',
    {
      id: 'org_unverified_sample',
      name: 'Apex Horizon Financial Ltd',
      orgType: 'Financial Institution',
      country: 'Singapore',
      website: 'https://apex-horizon.sg',
      domain: 'apex-horizon.sg',
      contactEmail: 'contact@apex-horizon.sg',
      description: 'Commercial wealth advisory firm applying for verified investor attestation rights.',
      didUri: 'did:arc:org_pending_01',
      metadataHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      status: 'PENDING',
      ownerAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
      issuerWalletAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
      representative: {
        fullName: 'Julian Thorne',
        title: 'Managing Director',
        officialEmail: 'julian@apex-horizon.sg',
        walletAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        isVerified: false,
      },
      domainVerification: {
        domain: 'apex-horizon.sg',
        method: 'WELL_KNOWN_FILE',
        challengeToken: 'arc-verify-challenge-org_unverified_sample-3e91c402',
        isVerified: false,
      },
      credentialCount: 0,
      createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
  ],
  [
    'org_rejected_sample',
    {
      id: 'org_rejected_sample',
      name: 'QuickCert Unauthorized Issuer',
      orgType: 'Corporation / Enterprise',
      country: 'Seychelles',
      website: 'https://quickcert-fake.com',
      domain: 'quickcert-fake.com',
      contactEmail: 'ops@quickcert-fake.com',
      description: 'Commercial diploma mill attempting to issue non-accredited certificates.',
      didUri: 'did:arc:org_rejected_sample',
      metadataHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      status: 'REJECTED',
      ownerAddress: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4df',
      issuerWalletAddress: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4df',
      representative: {
        fullName: 'Unknown Actor',
        title: 'Anonymous',
        officialEmail: 'anonymous@quickcert-fake.com',
        walletAddress: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4df',
        isVerified: false,
      },
      domainVerification: {
        domain: 'quickcert-fake.com',
        method: 'WELL_KNOWN_FILE',
        challengeToken: 'arc-verify-challenge-org_rejected_sample-000000',
        isVerified: false,
        failureReason: 'Domain DNS resolution failed and representative identity could not be established.',
      },
      credentialCount: 0,
      createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
      reviewedAt: new Date(Date.now() - 19 * 86400000).toISOString(),
      reviewedBy: 'Arc Compliance Review Board',
      rejectionReason: 'Failed domain control check; unaccredited entity attempting fraudulent issuance.',
    },
  ],
]);

// Authorized Issuer Wallets approved by organizations
const inMemoryAuthorizedWallets = new Map<string, AuthorizedWalletRecord[]>([
  [
    'org_arc_foundation',
    [
      {
        id: 'wal_arc_01',
        orgId: 'org_arc_foundation',
        walletAddress: '0x28974aA448e8952B9c024d9f6974d08A375c3254',
        role: 'ISSUER',
        label: 'Arc Foundation Core Authority Signer',
        status: 'ACTIVE',
        approvedBy: '0x28974aA448e8952B9c024d9f6974d08A375c3254',
        approvedAt: new Date(Date.now() - 90 * 86400000).toISOString(),
      },
      {
        id: 'wal_arc_02',
        orgId: 'org_arc_foundation',
        walletAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        role: 'ISSUER',
        label: 'Arc Academic Accreditation Delegate',
        status: 'ACTIVE',
        approvedBy: '0x28974aA448e8952B9c024d9f6974d08A375c3254',
        approvedAt: new Date(Date.now() - 60 * 86400000).toISOString(),
      },
    ],
  ],
  [
    'org_veriid_global',
    [
      {
        id: 'wal_veriid_01',
        orgId: 'org_veriid_global',
        walletAddress: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
        role: 'ISSUER',
        label: 'VeriID Production Biometric Gateway Signer',
        status: 'ACTIVE',
        approvedBy: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
        approvedAt: new Date(Date.now() - 40 * 86400000).toISOString(),
      },
    ],
  ],
  [
    'org_mit_sandbox',
    [
      {
        id: 'wal_mit_01',
        orgId: 'org_mit_sandbox',
        walletAddress: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
        role: 'ISSUER',
        label: 'MIT Credential Lab Primary Key',
        status: 'ACTIVE',
        approvedBy: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
        approvedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      },
    ],
  ],
  [
    'org_unverified_sample',
    [
      {
        id: 'wal_unverified_01',
        orgId: 'org_unverified_sample',
        walletAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        role: 'ISSUER',
        label: 'Candidate Issuer Wallet',
        status: 'ACTIVE',
        approvedBy: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        approvedAt: new Date().toISOString(),
      },
    ],
  ],
]);

// Pre-seeded Organization Administrators with application passwords (stored as SHA-256)
const inMemoryAdmins = new Map<string, AdminUserRecord>([
  [
    'admin@arc.network',
    {
      id: 'adm_01',
      orgId: 'org_arc_foundation',
      email: 'admin@arc.network',
      passwordHash: '424269d06d4e830e0ee093f48a609d5eb45adff37803a08d251d72ee4c6df7c0',
      fullName: 'Sarah Chen (Arc Network Lead)',
      walletAddress: '0x28974aA448e8952B9c024d9f6974d08A375c3254',
      role: 'ORG_OWNER',
      isActive: true,
    },
  ],
  [
    'compliance@veriid-global.com',
    {
      id: 'adm_02',
      orgId: 'org_veriid_global',
      email: 'compliance@veriid-global.com',
      passwordHash: 'e69b0222f7b19b88cf14594c7760eb8ce38db67d018b14dbbbfeeb07f43372c0',
      fullName: 'Marcus Vance (Compliance Director)',
      walletAddress: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
      role: 'ORG_ADMIN',
      isActive: true,
    },
  ],
]);

export const organizationRepository = {
  async getAll(): Promise<OrganizationInfo[]> {
    return Array.from(inMemoryOrganizations.values());
  },

  async getById(id: string): Promise<OrganizationInfo | null> {
    return inMemoryOrganizations.get(id) || null;
  },

  async getByOwnerAddress(ownerAddress: string): Promise<OrganizationInfo | null> {
    const normalized = ownerAddress.toLowerCase();
    for (const org of inMemoryOrganizations.values()) {
      if (org.ownerAddress.toLowerCase() === normalized) {
        return org;
      }
    }
    return null;
  },

  async getAuthorizedWallets(orgId: string): Promise<AuthorizedWalletRecord[]> {
    return inMemoryAuthorizedWallets.get(orgId) || [];
  },

  async isWalletAuthorizedForOrg(
    orgId: string,
    walletAddress: string
  ): Promise<{ authorized: boolean; record?: AuthorizedWalletRecord; org?: OrganizationInfo }> {
    const org = await this.getById(orgId);
    if (!org) return { authorized: false };

    const wallets = await this.getAuthorizedWallets(orgId);
    const normalized = walletAddress.toLowerCase();
    const found = wallets.find(
      (w) => w.walletAddress.toLowerCase() === normalized && w.status === 'ACTIVE'
    );

    return {
      authorized: Boolean(found),
      record: found,
      org,
    };
  },

  async findOrgByAuthorizedWallet(
    walletAddress: string
  ): Promise<{ org: OrganizationInfo; record: AuthorizedWalletRecord; role: UserRole } | null> {
    const normalized = walletAddress.toLowerCase();

    for (const [orgId, wallets] of inMemoryAuthorizedWallets.entries()) {
      const match = wallets.find(
        (w) => w.walletAddress.toLowerCase() === normalized && w.status === 'ACTIVE'
      );
      if (match) {
        const org = inMemoryOrganizations.get(orgId);
        if (org) {
          const isOwner = org.ownerAddress.toLowerCase() === normalized;
          return {
            org,
            record: match,
            role: isOwner ? 'ORG_OWNER' : 'ISSUER',
          };
        }
      }
    }

    // Check if owner
    for (const org of inMemoryOrganizations.values()) {
      if (org.ownerAddress.toLowerCase() === normalized) {
        return {
          org,
          record: {
            id: `owner_${org.id}`,
            orgId: org.id,
            walletAddress: org.ownerAddress,
            role: 'ISSUER',
            label: 'Organization Owner Master Wallet',
            status: 'ACTIVE',
            approvedBy: org.ownerAddress,
            approvedAt: new Date().toISOString(),
          },
          role: 'ORG_OWNER',
        };
      }
    }

    return null;
  },

  async registerOrganization(params: {
    name: string;
    orgType: OrganizationType;
    country: string;
    website: string;
    domain: string;
    contactEmail: string;
    description: string;
    logoUrl?: string;
    ownerAddress: Address;
    issuerWalletAddress: Address;
    representative: AuthorizedRepresentative;
    domainVerification: DomainControlVerification;
  }): Promise<OrganizationInfo> {
    const cleanDomain = params.domain.toLowerCase().trim();
    const id = `org_${cleanDomain.replace(/[^a-z0-9]/g, '_')}_${Math.random().toString(36).slice(2, 6)}`;

    const newOrg: OrganizationInfo = {
      id,
      name: params.name.trim(),
      orgType: params.orgType,
      country: params.country,
      website: params.website,
      domain: cleanDomain,
      contactEmail: params.contactEmail,
      description: params.description,
      logoUrl: params.logoUrl,
      didUri: `did:arc:org_${cleanDomain.replace(/[^a-z0-9]/g, '_')}`,
      metadataHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      status: 'PENDING', // Initial state is strictly PENDING
      ownerAddress: params.ownerAddress,
      issuerWalletAddress: params.issuerWalletAddress,
      representative: params.representative,
      domainVerification: params.domainVerification,
      credentialCount: 0,
      createdAt: new Date().toISOString(),
    };

    inMemoryOrganizations.set(id, newOrg);

    // Bind primary issuer wallet to the organization in PENDING state
    await this.authorizeWallet(
      id,
      params.issuerWalletAddress,
      'Designated Primary Issuer Wallet',
      params.ownerAddress
    );

    return newOrg;
  },

  async updateDomainVerification(
    orgId: string,
    isVerified: boolean,
    details?: string
  ): Promise<OrganizationInfo | null> {
    const org = inMemoryOrganizations.get(orgId);
    if (!org) return null;

    org.domainVerification.isVerified = isVerified;
    org.domainVerification.lastCheckedAt = new Date().toISOString();
    if (isVerified) {
      org.domainVerification.verifiedAt = new Date().toISOString();
      if (org.status === 'PENDING') {
        org.status = 'UNDER_REVIEW'; // Progresses to Under Review once domain verified
      }
    } else {
      org.domainVerification.failureReason = details;
    }

    return org;
  },

  async updateRepresentativeVerification(
    orgId: string,
    representative: AuthorizedRepresentative
  ): Promise<OrganizationInfo | null> {
    const org = inMemoryOrganizations.get(orgId);
    if (!org) return null;

    org.representative = representative;
    return org;
  },

  async updateInstitutionalStatus(
    orgId: string,
    status: OrgVerificationStatus,
    reviewedBy: string,
    reviewNotes?: string,
    rejectionReason?: string
  ): Promise<OrganizationInfo | null> {
    const org = inMemoryOrganizations.get(orgId);
    if (!org) return null;

    org.status = status;
    org.reviewedAt = new Date().toISOString();
    org.reviewedBy = reviewedBy;
    if (reviewNotes) org.reviewNotes = reviewNotes;
    if (rejectionReason) org.rejectionReason = rejectionReason;

    return org;
  },

  async authorizeWallet(
    orgId: string,
    walletAddress: Address,
    label: string,
    approvedBy: Address
  ): Promise<AuthorizedWalletRecord> {
    const wallets = inMemoryAuthorizedWallets.get(orgId) || [];
    const normalized = walletAddress.toLowerCase();

    const existingIndex = wallets.findIndex((w) => w.walletAddress.toLowerCase() === normalized);
    const newRecord: AuthorizedWalletRecord = {
      id: `wal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      orgId,
      walletAddress,
      role: 'ISSUER',
      label: label.trim(),
      status: 'ACTIVE',
      approvedBy,
      approvedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      wallets[existingIndex] = newRecord;
    } else {
      wallets.push(newRecord);
    }
    inMemoryAuthorizedWallets.set(orgId, wallets);

    return newRecord;
  },

  async revokeWalletAuthorization(orgId: string, walletAddress: string): Promise<boolean> {
    const wallets = inMemoryAuthorizedWallets.get(orgId);
    if (!wallets) return false;

    const normalized = walletAddress.toLowerCase();
    const target = wallets.find((w) => w.walletAddress.toLowerCase() === normalized);
    if (target) {
      target.status = 'REVOKED';
      return true;
    }
    return false;
  },

  async getAdminByEmail(email: string): Promise<AdminUserRecord | null> {
    return inMemoryAdmins.get(email.toLowerCase().trim()) || null;
  },
};
