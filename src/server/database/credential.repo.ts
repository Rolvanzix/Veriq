import { getDb } from './client';
import type { ArcVerifiableCredential } from '../../verification/types';
import { CANONICAL_CREDENTIAL_TYPES } from '../../verification/credential-types';
import { computeCanonicalClaimsDigest } from '../../verification/canonical';
import { computeCredentialHash } from '../../blockchain/eip712';
import { ARC_CONTRACTS } from '../../blockchain/contracts';
import type { Address, Hash } from 'viem';

// Helper to seed a realistic verifiable credential
function buildSeedCredential(config: {
  id: string;
  typeId: string;
  issuerAddress: Address;
  issuerName: string;
  issuerDid: string;
  subjectAddress: Address;
  subjectDid: string;
  issuanceDaysAgo: number;
  validDays: number;
  claims: Record<string, unknown>;
  evidence?: {
    id: string;
    type: string[];
    description: string;
    documentUrl?: string;
    documentHash?: string;
    verifier?: string;
  };
  revocationNonce?: number;
  blockNumber: number;
  status?: 'ANCHORED' | 'PENDING' | 'REVOKED' | 'EXPIRED' | 'SUSPENDED';
}): ArcVerifiableCredential {
  const typeDef = CANONICAL_CREDENTIAL_TYPES.find((t) => t.typeId === config.typeId)!;
  const issuanceDate = new Date(Date.now() - config.issuanceDaysAgo * 86400000).toISOString();
  const expirationDate = config.validDays > 0
    ? new Date(new Date(issuanceDate).getTime() + config.validDays * 86400000).toISOString()
    : undefined;

  const { claimsDigest, claimHashes, salts } = computeCanonicalClaimsDigest(config.claims);

  const validFromBigInt = BigInt(Math.floor(new Date(issuanceDate).getTime() / 1000));
  const validUntilBigInt = expirationDate
    ? BigInt(Math.floor(new Date(expirationDate).getTime() / 1000))
    : 0n;

  const credentialHash = computeCredentialHash({
    credentialId: config.id,
    schemaId: typeDef.schemaId,
    issuer: config.issuerAddress,
    subject: config.subjectAddress,
    claimsDigest,
    validFrom: validFromBigInt,
    validUntil: validUntilBigInt,
    revocationNonce: BigInt(config.revocationNonce || 0),
  });

  const anchorTxHash = `0x${credentialHash.slice(2, 34)}${config.id.slice(-32)}` as Hash;

  return {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://schema.arc.network/v1/context.jsonld',
    ],
    id: config.id,
    type: ['VerifiableCredential', typeDef.vcType],
    issuer: {
      id: config.issuerDid,
      name: config.issuerName,
      address: config.issuerAddress,
      verifiedOnArc: true,
    },
    issuanceDate,
    expirationDate,
    credentialSubject: {
      id: config.subjectDid,
      address: config.subjectAddress,
      claims: config.claims,
    },
    credentialSchema: {
      id: `https://schema.arc.network/v1/schemas/${typeDef.schemaKey}.json`,
      type: 'JsonSchemaValidator2018',
      schemaId: typeDef.schemaId,
      name: typeDef.name,
    },
    schemaId: typeDef.schemaId,
    schemaName: typeDef.name,
    evidence: config.evidence ? [config.evidence] : undefined,
    credentialStatus: {
      id: `https://registry.arc.network/status/${credentialHash}#revocation`,
      type: 'ArcOnChainRevocationRegistry2024',
      statusPurpose: 'revocation',
      contractAddress: ARC_CONTRACTS.CREDENTIAL_REGISTRY,
      credentialHash,
      revocationNonce: config.revocationNonce || 0,
    },
    blockchainRecord: {
      network: 'Arc Mainnet',
      chainId: 42424,
      contractAddress: ARC_CONTRACTS.CREDENTIAL_REGISTRY,
      credentialHash,
      anchorTxHash,
      blockNumber: config.blockNumber,
      anchoredAt: issuanceDate,
      status: config.status || 'ANCHORED',
    },
    proof: {
      type: 'ArcEip712Signature2024',
      created: issuanceDate,
      verificationMethod: `${config.issuerDid}#key-1`,
      proofPurpose: 'assertionMethod',
      proofValue: `0x7b3f9c8d1e2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1c` as `0x${string}`,
      claimsDigest,
      credentialHash,
      anchorTxHash,
      arcBlockNumber: config.blockNumber,
      chainId: 42424,
      disclosureCommitment: {
        algorithm: 'Keccak256-Salted-Blinding',
        claimHashes,
        salts,
      },
    },
    revocationNonce: config.revocationNonce || 0,
  };
}

// Sample holder addresses
const SAMPLE_HOLDER_1: Address = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'; // Primary Demo Holder
const SAMPLE_HOLDER_2: Address = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'; // Academic Holder

const SEED_CREDENTIALS: ArcVerifiableCredential[] = [
  // 1. Certificate
  buildSeedCredential({
    id: 'urn:arc:credential:cert-2026-8819',
    typeId: 'certificate',
    issuerAddress: '0x28974aA448e8952B9c024d9f6974d08A375c3254',
    issuerName: 'Arc Institute of Technology (AIT)',
    issuerDid: 'did:arc:org_ait',
    subjectAddress: SAMPLE_HOLDER_1,
    subjectDid: `did:pkh:eip155:42424:${SAMPLE_HOLDER_1}`,
    issuanceDaysAgo: 45,
    validDays: 730,
    claims: {
      recipientName: 'Alex Vance',
      certificateTitle: 'Certified Arc Protocol Security Auditor',
      issuingAuthority: 'Arc Institute of Technology',
      gradeOrScore: 'Distinction (98/100)',
      accreditationStandard: 'ISO/IEC 27001 & Smart Contract Security Level 3',
      certificateNumber: 'ARC-CERT-2026-8819',
    },
    evidence: {
      id: 'urn:arc:evidence:cert-audit-8819',
      type: ['InstitutionalAccreditationRecord', 'DocumentVerification'],
      description: 'Official academic board transcript and cryptographic examination audit hash.',
      documentUrl: 'https://credentials.arc.network/transcripts/8819.pdf',
      documentHash: '0x8f3c7d6a5e4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9876',
      verifier: 'Arc Academic Senate Review Committee',
    },
    blockNumber: 1241900,
  }),

  // 2. Course Completion
  buildSeedCredential({
    id: 'urn:arc:credential:course-evm-120',
    typeId: 'course_completion',
    issuerAddress: '0x28974aA448e8952B9c024d9f6974d08A375c3254',
    issuerName: 'Arc Institute of Technology (AIT)',
    issuerDid: 'did:arc:org_ait',
    subjectAddress: SAMPLE_HOLDER_1,
    subjectDid: `did:pkh:eip155:42424:${SAMPLE_HOLDER_1}`,
    issuanceDaysAgo: 30,
    validDays: 0,
    claims: {
      studentName: 'Alex Vance',
      courseName: 'Distributed Systems & EVM Layer-1 Engineering',
      instructor: 'Dr. Sarah Chen, Ph.D.',
      durationHours: 120,
      completionDate: '2026-09-01',
      finalCapstoneProject: 'Sub-Second Cross-Chain Teleport Engine on Arc',
      grade: 'A+',
    },
    evidence: {
      id: 'urn:arc:evidence:course-course-120',
      type: ['CourseAttendanceLog', 'CapstoneEvaluation'],
      description: 'Course completion ledger signed by lead lecturer and student repo commit log.',
      documentUrl: 'https://academy.arc.network/courses/evm-l1/capstones/alex-vance',
      documentHash: '0x5b4c3d2e1f0a9b876543210fedcba9876543210abcdef0123456789abcdef01',
      verifier: 'Dean of Computer Science, AIT',
    },
    blockNumber: 1243105,
  }),

  // 3. Event Attendance
  buildSeedCredential({
    id: 'urn:arc:credential:event-summit-4091',
    typeId: 'event_attendance',
    issuerAddress: '0x28974aA448e8952B9c024d9f6974d08A375c3254',
    issuerName: 'Arc Foundation & Network Authority',
    issuerDid: 'did:arc:org_arc_foundation',
    subjectAddress: SAMPLE_HOLDER_1,
    subjectDid: `did:pkh:eip155:42424:${SAMPLE_HOLDER_1}`,
    issuanceDaysAgo: 20,
    validDays: 0,
    claims: {
      attendeeName: 'Alex Vance',
      eventName: 'Arc Global Genesis Summit 2026',
      eventLocation: 'Zurich Convention Center & Arc Virtual Campus',
      attendanceType: 'In-Person VIP Delegate',
      eventDate: '2026-09-12',
      badgeId: 'DELEGATE-ARC-4091',
    },
    evidence: {
      id: 'urn:arc:evidence:event-checkin-4091',
      type: ['NfcBadgeCheckinRecord', 'BiometricEntranceProof'],
      description: 'Cryptographic NFC badge tap record at keynote hall ingress gate.',
      documentUrl: 'https://events.arc.network/summit2026/checkin/4091',
      documentHash: '0x3a2b1c0d9e8f7a6b5c4d3e2f1a0b9876543210abcdef1234567890abcdef1234',
      verifier: 'Arc Event Operations Gate 3 Validator',
    },
    blockNumber: 1244500,
  }),

  // 4. Membership
  buildSeedCredential({
    id: 'urn:arc:credential:membership-gov-100',
    typeId: 'membership',
    issuerAddress: '0x28974aA448e8952B9c024d9f6974d08A375c3254',
    issuerName: 'Arc Network Governance Consortium',
    issuerDid: 'did:arc:org_arc_foundation',
    subjectAddress: SAMPLE_HOLDER_1,
    subjectDid: `did:pkh:eip155:42424:${SAMPLE_HOLDER_1}`,
    issuanceDaysAgo: 60,
    validDays: 365,
    claims: {
      memberName: 'Alex Vance',
      organizationName: 'Arc Network Governance Consortium',
      membershipTier: 'Senior Protocol Fellow',
      votingPowerWeight: 1000,
      memberSince: '2025-01-10',
      goodStandingConfirmed: true,
    },
    evidence: {
      id: 'urn:arc:evidence:membership-registry-v1',
      type: ['ConsortiumCharterRegistration', 'KycVerificationAudit'],
      description: 'Governance charter signatory record verified by consortium legal counsel.',
      documentUrl: 'https://consortium.arc.network/members/alex-vance',
      documentHash: '0x7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9876543210abcdef0123456789ab',
      verifier: 'Consortium Membership Secretariat',
    },
    blockNumber: 1240120,
  }),

  // 5. Contribution
  buildSeedCredential({
    id: 'urn:arc:credential:contrib-core-14',
    typeId: 'contribution',
    issuerAddress: '0x28974aA448e8952B9c024d9f6974d08A375c3254',
    issuerName: 'Arc Foundation & Network Authority',
    issuerDid: 'did:arc:org_arc_foundation',
    subjectAddress: SAMPLE_HOLDER_1,
    subjectDid: `did:pkh:eip155:42424:${SAMPLE_HOLDER_1}`,
    issuanceDaysAgo: 15,
    validDays: 0,
    claims: {
      contributorName: 'Alex Vance',
      repository: 'arc-network/core-consensus-engine',
      contributionType: 'Core Protocol Optimization & EIP-712 Engine',
      mergedPullRequestCount: 14,
      totalLinesChanged: 4820,
      grantAwardedUsd: 25000,
      reviewerApproval: 'Consensus Engineering WG Lead',
    },
    evidence: {
      id: 'urn:arc:evidence:git-contribution-pr14',
      type: ['GitCommitHashChain', 'PeerReviewAudit'],
      description: 'Signed Git commit hashes verified on GitHub and mirrored on Arweave.',
      documentUrl: 'https://github.com/arc-network/core-consensus/commits?author=alexvance',
      documentHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      verifier: 'Arc Foundation Core Developer Review Board',
    },
    blockNumber: 1245100,
  }),

  // 6. Achievement
  buildSeedCredential({
    id: 'urn:arc:credential:ach-genesis-01',
    typeId: 'achievement',
    issuerAddress: '0x28974aA448e8952B9c024d9f6974d08A375c3254',
    issuerName: 'Arc Foundation & Network Authority',
    issuerDid: 'did:arc:org_arc_foundation',
    subjectAddress: SAMPLE_HOLDER_1,
    subjectDid: `did:pkh:eip155:42424:${SAMPLE_HOLDER_1}`,
    issuanceDaysAgo: 10,
    validDays: 0,
    claims: {
      recipientName: 'Alex Vance',
      achievementTitle: 'Genesis Protocol Architect Milestone',
      issuerAuthority: 'Arc Foundation & Network Authority',
      criteria: 'Designed and deployed sub-second deterministic credential anchoring system on Arc',
      milestoneIndex: 'ACH-GENESIS-01',
      dateAchieved: '2026-09-22',
    },
    evidence: {
      id: 'urn:arc:evidence:achievement-milestone-01',
      type: ['FoundationResolution', 'NetworkDeploymentProof'],
      description: 'Arc Foundation Governance Resolution #42 ratified by validator multisig.',
      documentUrl: 'https://arc.network/governance/resolutions/42',
      documentHash: '0x99887766554433221100ffeeddccbbaa99887766554433221100ffeeddccbbaa',
      verifier: 'Arc Governance Genesis Multisig',
    },
    blockNumber: 1245600,
  }),

  // 7. Award
  buildSeedCredential({
    id: 'urn:arc:credential:award-gdif-2026',
    typeId: 'award',
    issuerAddress: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
    issuerName: 'VeriID Global KYC Consortium',
    issuerDid: 'did:arc:org_veriid',
    subjectAddress: SAMPLE_HOLDER_1,
    subjectDid: `did:pkh:eip155:42424:${SAMPLE_HOLDER_1}`,
    issuanceDaysAgo: 8,
    validDays: 0,
    claims: {
      honoreeName: 'Alex Vance',
      awardTitle: 'Excellence in Cryptographic Engineering Award',
      presentingEntity: 'Global Decentralized Identity Forum',
      category: 'Best Privacy-Preserving Web3 Architecture 2026',
      juryPresident: 'Prof. David K. Miller',
      citation: 'For breakthrough work on deterministic off-chain claim hashing with on-chain zero-leakage state anchoring.',
    },
    evidence: {
      id: 'urn:arc:evidence:award-jury-verdict',
      type: ['JuryBallotRecord', 'AwardCeremonyVideoHash'],
      description: 'Jury consensus decision recorded in conference public proceedings.',
      documentUrl: 'https://identityforum.org/awards/2026/cryptography/vance',
      documentHash: '0x4f3e2d1c0b9a897867564534231201908f7e6d5c4b3a291807f6e5d4c3b2a190',
      verifier: 'GDIF Awards Advisory Council',
    },
    blockNumber: 1245780,
  }),

  // 8. Hackathon Participation
  buildSeedCredential({
    id: 'urn:arc:credential:hack-etharc-01',
    typeId: 'hackathon_participation',
    issuerAddress: '0x28974aA448e8952B9c024d9f6974d08A375c3254',
    issuerName: 'Arc Institute of Technology (AIT)',
    issuerDid: 'did:arc:org_ait',
    subjectAddress: SAMPLE_HOLDER_1,
    subjectDid: `did:pkh:eip155:42424:${SAMPLE_HOLDER_1}`,
    issuanceDaysAgo: 5,
    validDays: 0,
    claims: {
      participantName: 'Alex Vance',
      hackathonName: 'ETH Arc Global Hackathon 2026',
      projectName: 'ARC Teleport: Cross-Chain Zero-Knowledge Relayer',
      placement: '1st Place Overall — Grand Prize Winner',
      track: 'Infrastructure & Sovereign Verification',
      prizeAmountUsd: 50000,
      projectRepoUrl: 'https://github.com/alexvance/arc-teleport-zk',
    },
    evidence: {
      id: 'urn:arc:evidence:hackathon-submission-etharc',
      type: ['DevpostSubmissionAudit', 'SmartContractDeploymentLog'],
      description: 'Verified Git commit log and testnet contract deployment receipts evaluated by hackathon judges.',
      documentUrl: 'https://devpost.com/software/arc-teleport-zk',
      documentHash: '0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
      verifier: 'ETH Arc Hackathon Judging Panel',
    },
    blockNumber: 1245890,
  }),

  // 9. Employment / Role Credential
  buildSeedCredential({
    id: 'urn:arc:credential:emp-cyberscale-04',
    typeId: 'employment_role',
    issuerAddress: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
    issuerName: 'VeriID Global KYC Consortium',
    issuerDid: 'did:arc:org_veriid',
    subjectAddress: SAMPLE_HOLDER_1,
    subjectDid: `did:pkh:eip155:42424:${SAMPLE_HOLDER_1}`,
    issuanceDaysAgo: 90,
    validDays: 365,
    claims: {
      employeeName: 'Alex Vance',
      employer: 'CyberScale Core Labs Ltd',
      jobTitle: 'Principal Cryptographic Engineer',
      department: 'Core Consensus & Zero Knowledge',
      employmentStatus: 'Full-Time Active',
      startDate: '2024-03-01',
      securityClearanceLevel: 'Tier 3 (Confidential Protocol Infrastructure)',
    },
    evidence: {
      id: 'urn:arc:evidence:hr-clearance-cyberscale',
      type: ['CorporateHRRecord', 'PayrollVerificationProof'],
      description: 'Employment verification signed by Authorized Corporate HR Issuer Key under Arc Issuer Registry.',
      documentUrl: 'https://cyberscale.io/verify/emp/alex-vance',
      documentHash: '0x9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef',
      verifier: 'CyberScale Core Labs HR Department',
    },
    blockNumber: 1238000,
  }),

  // 10. Expiring Soon Credential (valid for 365 days, issued 357 days ago -> expires in 8 days)
  buildSeedCredential({
    id: 'urn:arc:credential:kyc-annual-exp2026',
    typeId: 'certificate',
    issuerAddress: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
    issuerName: 'VeriID Global KYC Consortium',
    issuerDid: 'did:arc:org_veriid',
    subjectAddress: SAMPLE_HOLDER_1,
    subjectDid: `did:pkh:eip155:42424:${SAMPLE_HOLDER_1}`,
    issuanceDaysAgo: 357,
    validDays: 365,
    claims: {
      recipientName: 'Alex Vance',
      certificateTitle: 'Annual Institutional KYC & Sanctions Clearance',
      issuingAuthority: 'VeriID Global KYC Consortium',
      gradeOrScore: 'Level 3 Verified (Biometric + Proof of Residence)',
      accreditationStandard: 'FATF Guidance on Digital Identity 2024',
      certificateNumber: 'VERIID-KYC-2025-9941',
    },
    evidence: {
      id: 'urn:arc:evidence:kyc-sanction-audit',
      type: ['KycAuditProof', 'SanctionsListCheck'],
      description: 'Zero-knowledge biometric match and Interpol sanctions ledger clearance.',
      documentUrl: 'https://veriid-global.com/audit/sanctions/alex-vance',
      documentHash: '0x718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0123456789abcd',
      verifier: 'VeriID Chief Compliance Officer',
    },
    blockNumber: 1215000,
  }),

  // 11. Expired Credential (valid for 60 days, issued 90 days ago -> EXPIRED)
  buildSeedCredential({
    id: 'urn:arc:credential:fellowship-exp-2025',
    typeId: 'membership',
    issuerAddress: '0x28974aA448e8952B9c024d9f6974d08A375c3254',
    issuerName: 'Arc Institute of Technology (AIT)',
    issuerDid: 'did:arc:org_ait',
    subjectAddress: SAMPLE_HOLDER_1,
    subjectDid: `did:pkh:eip155:42424:${SAMPLE_HOLDER_1}`,
    issuanceDaysAgo: 90,
    validDays: 60,
    status: 'EXPIRED',
    claims: {
      memberName: 'Alex Vance',
      organizationName: 'Arc Visiting Cryptography Fellowship',
      membershipTier: 'Quarterly Visiting Scholar',
      term: 'Summer Term 2025',
      sponsorDepartment: 'School of Distributed Computing',
    },
    evidence: {
      id: 'urn:arc:evidence:fellowship-term-audit',
      type: ['FellowshipCharter', 'FacultySponsorshipLetter'],
      description: 'Term-limited visiting scholar access record.',
      documentUrl: 'https://ait.arc.network/fellows/summer2025/vance',
      documentHash: '0x554433221100ffeeddccbbaa99887766554433221100ffeeddccbbaa99887766',
      verifier: 'AIT Academic Affairs Committee',
    },
    blockNumber: 1228000,
  }),

  // 12. Suspended Credential (under institutional regulatory review)
  buildSeedCredential({
    id: 'urn:arc:credential:wealth-adviser-susp44',
    typeId: 'certificate',
    issuerAddress: '0x28974aA448e8952B9c024d9f6974d08A375c3254',
    issuerName: 'Apex Global Financial Partners',
    issuerDid: 'did:arc:org_apex',
    subjectAddress: SAMPLE_HOLDER_1,
    subjectDid: `did:pkh:eip155:42424:${SAMPLE_HOLDER_1}`,
    issuanceDaysAgo: 40,
    validDays: 365,
    status: 'SUSPENDED',
    claims: {
      recipientName: 'Alex Vance',
      certificateTitle: 'Regulated Institutional Digital Asset Custody License',
      issuingAuthority: 'Apex Financial Compliance Directorate',
      licenseNumber: 'APEX-DAC-2026-44',
      jurisdiction: 'Switzerland & EEA',
      regulatoryStatus: 'Temporarily Suspended Pending Annual Institutional Re-Audit',
    },
    evidence: {
      id: 'urn:arc:evidence:apex-suspension-audit',
      type: ['ComplianceNotice', 'AuditHoldRecord'],
      description: 'Administrative suspension entered on Arc Issuer Registry during annual organizational re-accreditation.',
      documentUrl: 'https://apexfintech.com/compliance/hold/44',
      documentHash: '0x887766554433221100ffeeddccbbaa99887766554433221100ffeeddccbbaa99',
      verifier: 'Apex Institutional Audit Oversight',
    },
    blockNumber: 1241000,
  }),

  // 13. Revoked Credential (AffiliationTerminated on Arc Credential Registry)
  buildSeedCredential({
    id: 'urn:arc:credential:intern-access-rev02',
    typeId: 'employment_role',
    issuerAddress: '0x28974aA448e8952B9c024d9f6974d08A375c3254',
    issuerName: 'Arc Institute of Technology (AIT)',
    issuerDid: 'did:arc:org_ait',
    subjectAddress: SAMPLE_HOLDER_1,
    subjectDid: `did:pkh:eip155:42424:${SAMPLE_HOLDER_1}`,
    issuanceDaysAgo: 120,
    validDays: 180,
    status: 'REVOKED',
    claims: {
      employeeName: 'Alex Vance',
      employer: 'Arc Institute of Technology',
      jobTitle: 'Undergraduate Laboratory Assistant',
      department: 'High Performance Cryptography Lab',
      employmentStatus: 'Terminated Upon Program Completion',
      revocationReason: 'AffiliationTerminated — Successfully Graduated from Lab Assistant Program',
    },
    evidence: {
      id: 'urn:arc:evidence:intern-completion-rev',
      type: ['ExitClearanceRecord', 'ArcRevocationTxReceipt'],
      description: 'Official exit clearance and Arc Credential Registry on-chain revocation transaction.',
      documentUrl: 'https://ait.arc.network/hr/exit/alex-vance-2025',
      documentHash: '0x33221100ffeeddccbbaa99887766554433221100ffeeddccbbaa998877665544',
      verifier: 'AIT Human Resources Directorate',
    },
    blockNumber: 1232000,
  }),
];

// In-Memory store for fast fallback & dev environment
const inMemoryCredentials = new Map<string, ArcVerifiableCredential>();

// Seed initial memory store
for (const seed of SEED_CREDENTIALS) {
  inMemoryCredentials.set(seed.id, seed);
  inMemoryCredentials.set(seed.proof.credentialHash.toLowerCase(), seed);
}

export const credentialRepository = {
  async save(credential: ArcVerifiableCredential): Promise<ArcVerifiableCredential> {
    inMemoryCredentials.set(credential.id, credential);
    inMemoryCredentials.set(credential.proof.credentialHash.toLowerCase(), credential);

    const db = getDb();
    if (db.isPostgresConnected) {
      try {
        await db.query(
          `INSERT INTO arc_credentials 
           (id, credential_hash, issuer_address, subject_address, subject_did, schema_id, schema_name, claims_digest, private_claims, issuance_date, expiration_date, revocation_nonce, proof_signature, anchor_tx_hash, arc_block_number, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
           ON CONFLICT (credential_hash) DO UPDATE SET
             anchor_tx_hash = EXCLUDED.anchor_tx_hash,
             arc_block_number = EXCLUDED.arc_block_number,
             status = EXCLUDED.status`,
          [
            credential.id,
            credential.proof.credentialHash,
            credential.issuer.address,
            credential.credentialSubject.address || null,
            credential.credentialSubject.id,
            credential.schemaId,
            credential.schemaName,
            credential.proof.claimsDigest,
            JSON.stringify(credential.credentialSubject.claims),
            credential.issuanceDate,
            credential.expirationDate || null,
            credential.revocationNonce || 0,
            credential.proof.proofValue,
            credential.proof.anchorTxHash || null,
            credential.proof.arcBlockNumber || null,
            'ACTIVE',
          ]
        );
      } catch (err) {
        console.warn('DB error saving credential, persisted in memory:', err);
      }
    }

    return credential;
  },

  async getById(id: string): Promise<ArcVerifiableCredential | null> {
    const cred = inMemoryCredentials.get(id);
    if (cred) return cred;

    const db = getDb();
    if (db.isPostgresConnected) {
      try {
        const res = await db.query('SELECT * FROM arc_credentials WHERE id = $1 LIMIT 1', [id]);
        if (res.rows.length > 0) return this.mapRowToCredential(res.rows[0]);
      } catch (err) {
        console.warn('DB get error:', err);
      }
    }
    return null;
  },

  async getByHash(hash: string): Promise<ArcVerifiableCredential | null> {
    const cred = inMemoryCredentials.get(hash.toLowerCase());
    if (cred) return cred;

    const db = getDb();
    if (db.isPostgresConnected) {
      try {
        const res = await db.query(
          'SELECT * FROM arc_credentials WHERE LOWER(credential_hash) = $1 LIMIT 1',
          [hash.toLowerCase()]
        );
        if (res.rows.length > 0) return this.mapRowToCredential(res.rows[0]);
      } catch (err) {
        console.warn('DB getByHash error:', err);
      }
    }
    return null;
  },

  async getBySubject(subjectAddressOrDid: string): Promise<ArcVerifiableCredential[]> {
    const normalized = subjectAddressOrDid.toLowerCase();
    const matches: ArcVerifiableCredential[] = [];

    for (const cred of inMemoryCredentials.values()) {
      if (
        cred.credentialSubject.address?.toLowerCase() === normalized ||
        cred.credentialSubject.id.toLowerCase().includes(normalized) ||
        // If query is for sample holder, return rich sample suite
        (normalized === 'all' || normalized.includes('0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc'))
      ) {
        if (!matches.some((m) => m.id === cred.id)) {
          matches.push(cred);
        }
      }
    }

    const db = getDb();
    if (db.isPostgresConnected) {
      try {
        const res = await db.query(
          `SELECT * FROM arc_credentials 
           WHERE LOWER(subject_address) = $1 OR LOWER(subject_did) = $1 
           ORDER BY issuance_date DESC`,
          [normalized]
        );
        return res.rows.map((row: any) => this.mapRowToCredential(row));
      } catch (err) {
        console.warn('DB getBySubject error:', err);
      }
    }

    return matches;
  },

  async getByIssuer(issuerAddress: string): Promise<ArcVerifiableCredential[]> {
    const normalized = issuerAddress.toLowerCase();
    const matches: ArcVerifiableCredential[] = [];

    for (const cred of inMemoryCredentials.values()) {
      if (cred.issuer.address.toLowerCase() === normalized || normalized === 'all') {
        if (!matches.some((m) => m.id === cred.id)) {
          matches.push(cred);
        }
      }
    }

    const db = getDb();
    if (db.isPostgresConnected) {
      try {
        const res = await db.query(
          'SELECT * FROM arc_credentials WHERE LOWER(issuer_address) = $1 ORDER BY issuance_date DESC',
          [normalized]
        );
        return res.rows.map((row: any) => this.mapRowToCredential(row));
      } catch (err) {
        console.warn('DB getByIssuer error:', err);
      }
    }

    return matches;
  },

  async getAll(): Promise<ArcVerifiableCredential[]> {
    const unique = new Map<string, ArcVerifiableCredential>();
    for (const cred of inMemoryCredentials.values()) {
      unique.set(cred.id, cred);
    }
    return Array.from(unique.values());
  },

  async revoke(credentialHash: string, reason: string): Promise<boolean> {
    const cred = inMemoryCredentials.get(credentialHash.toLowerCase());
    if (cred) {
      cred.blockchainRecord.status = 'REVOKED';
      inMemoryCredentials.set(credentialHash.toLowerCase(), cred);
    }

    const db = getDb();
    if (db.isPostgresConnected) {
      try {
        await db.query(
          `UPDATE arc_credentials 
           SET status = 'REVOKED', revocation_reason = $1, revoked_at = NOW() 
           WHERE LOWER(credential_hash) = $2`,
          [reason, credentialHash.toLowerCase()]
        );
      } catch (err) {
        console.warn('DB revoke update error:', err);
      }
    }
    return true;
  },

  mapRowToCredential(row: any): ArcVerifiableCredential {
    const claims = typeof row.private_claims === 'string' ? JSON.parse(row.private_claims) : row.private_claims;
    const typeDef = CANONICAL_CREDENTIAL_TYPES.find((t) => t.schemaId === row.schema_id) || CANONICAL_CREDENTIAL_TYPES[0];

    return {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://schema.arc.network/v1/context.jsonld',
      ],
      id: row.id,
      type: ['VerifiableCredential', typeDef.vcType],
      issuer: {
        id: `did:arc:${row.issuer_address}`,
        address: row.issuer_address,
        name: 'Issuer Organization',
        verifiedOnArc: true,
      },
      issuanceDate: new Date(row.issuance_date).toISOString(),
      expirationDate: row.expiration_date ? new Date(row.expiration_date).toISOString() : undefined,
      credentialSubject: {
        id: row.subject_did,
        address: row.subject_address,
        claims,
      },
      credentialSchema: {
        id: `https://schema.arc.network/v1/schemas/${typeDef.schemaKey}.json`,
        type: 'JsonSchemaValidator2018',
        schemaId: row.schema_id,
        name: row.schema_name,
      },
      schemaId: row.schema_id,
      schemaName: row.schema_name,
      evidence: typeDef.defaultEvidence ? [typeDef.defaultEvidence] : undefined,
      credentialStatus: {
        id: `https://registry.arc.network/status/${row.credential_hash}#revocation`,
        type: 'ArcOnChainRevocationRegistry2024',
        statusPurpose: 'revocation',
        contractAddress: ARC_CONTRACTS.CREDENTIAL_REGISTRY,
        credentialHash: row.credential_hash,
        revocationNonce: Number(row.revocation_nonce || 0),
      },
      blockchainRecord: {
        network: 'Arc Mainnet',
        chainId: 42424,
        contractAddress: ARC_CONTRACTS.CREDENTIAL_REGISTRY,
        credentialHash: row.credential_hash,
        anchorTxHash: row.anchor_tx_hash,
        blockNumber: row.arc_block_number ? Number(row.arc_block_number) : undefined,
        anchoredAt: new Date(row.issuance_date).toISOString(),
        status: row.status === 'REVOKED' ? 'REVOKED' : 'ANCHORED',
      },
      proof: {
        type: 'ArcEip712Signature2024',
        created: new Date(row.issuance_date).toISOString(),
        verificationMethod: `did:arc:${row.issuer_address}#key-1`,
        proofPurpose: 'assertionMethod',
        proofValue: row.proof_signature,
        claimsDigest: row.claims_digest,
        credentialHash: row.credential_hash,
        anchorTxHash: row.anchor_tx_hash,
        arcBlockNumber: row.arc_block_number ? Number(row.arc_block_number) : undefined,
        chainId: 42424,
      },
      revocationNonce: Number(row.revocation_nonce || 0),
    };
  },
};
