import { computeSchemaId } from '../blockchain/eip712';
import type { Hash } from 'viem';

export interface CredentialTypeDefinition {
  typeId: string;
  name: string;
  vcType: string;
  category: 'Education' | 'Professional' | 'Events' | 'Governance' | 'Achievement' | 'Identity';
  schemaKey: string;
  schemaId: Hash;
  description: string;
  defaultClaims: Record<string, unknown>;
  defaultEvidence?: {
    id: string;
    type: string[];
    description: string;
    documentUrl?: string;
    documentHash?: string;
    verifier?: string;
  };
  defaultValidDays: number; // 0 = Perpetual (No Expiration)
  badgeColor: string;
  accentColor: string;
}

export const CANONICAL_CREDENTIAL_TYPES: CredentialTypeDefinition[] = [
  {
    typeId: 'certificate',
    name: 'Official Certificate',
    vcType: 'CertificateCredential',
    category: 'Education',
    schemaKey: 'ArcCertificateCredentialV1',
    schemaId: computeSchemaId('ArcCertificateCredentialV1'),
    description: 'Certified institutional certificate verifying formal qualification, accredited training, or technical standard compliance.',
    defaultClaims: {
      recipientName: 'Alex Vance',
      certificateTitle: 'Certified Arc Protocol Security Auditor',
      issuingAuthority: 'Arc Institute of Technology',
      gradeOrScore: 'Distinction (98/100)',
      accreditationStandard: 'ISO/IEC 27001 & Smart Contract Security Level 3',
      certificateNumber: 'ARC-CERT-2026-8819',
    },
    defaultEvidence: {
      id: 'urn:arc:evidence:cert-audit-8819',
      type: ['InstitutionalAccreditationRecord', 'DocumentVerification'],
      description: 'Official academic board transcript and cryptographic examination audit hash.',
      documentUrl: 'https://credentials.arc.network/transcripts/8819.pdf',
      documentHash: '0x8f3c7d6a5e4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9876',
      verifier: 'Arc Academic Senate Review Committee',
    },
    defaultValidDays: 730, // 2 Years
    badgeColor: 'bg-cyan-950 text-cyan-300 border-cyan-800',
    accentColor: 'from-cyan-500 to-blue-500',
  },
  {
    typeId: 'course_completion',
    name: 'Course Completion',
    vcType: 'CourseCompletionCredential',
    category: 'Education',
    schemaKey: 'ArcCourseCompletionCredentialV1',
    schemaId: computeSchemaId('ArcCourseCompletionCredentialV1'),
    description: 'Verifies successful completion of an academic course, university curriculum, or developer bootcamp.',
    defaultClaims: {
      studentName: 'Alex Vance',
      courseName: 'Distributed Systems & EVM Layer-1 Engineering',
      instructor: 'Dr. Sarah Chen, Ph.D.',
      durationHours: 120,
      completionDate: '2026-09-15',
      finalCapstoneProject: 'Sub-Second Cross-Chain Teleport Engine on Arc',
      grade: 'A+',
    },
    defaultEvidence: {
      id: 'urn:arc:evidence:course-course-120',
      type: ['CourseAttendanceLog', 'CapstoneEvaluation'],
      description: 'Course completion ledger signed by lead lecturer and student repo commit log.',
      documentUrl: 'https://academy.arc.network/courses/evm-l1/capstones/alex-vance',
      documentHash: '0x5b4c3d2e1f0a9b876543210fedcba9876543210abcdef0123456789abcdef01',
      verifier: 'Dean of Computer Science, AIT',
    },
    defaultValidDays: 0, // Perpetual
    badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-800',
    accentColor: 'from-emerald-500 to-teal-500',
  },
  {
    typeId: 'event_attendance',
    name: 'Event Attendance',
    vcType: 'EventAttendanceCredential',
    category: 'Events',
    schemaKey: 'ArcEventAttendanceCredentialV1',
    schemaId: computeSchemaId('ArcEventAttendanceCredentialV1'),
    description: 'Proof of in-person or virtual attendance at official conferences, summits, and protocol governance meetings.',
    defaultClaims: {
      attendeeName: 'Alex Vance',
      eventName: 'Arc Global Genesis Summit 2026',
      eventLocation: 'Zurich Convention Center & Arc Virtual Campus',
      attendanceType: 'In-Person VIP Delegate',
      eventDate: '2026-08-20',
      badgeId: 'DELEGATE-ARC-4091',
    },
    defaultEvidence: {
      id: 'urn:arc:evidence:event-checkin-4091',
      type: ['NfcBadgeCheckinRecord', 'BiometricEntranceProof'],
      description: 'Cryptographic NFC badge tap record at keynote hall ingress gate.',
      documentUrl: 'https://events.arc.network/summit2026/checkin/4091',
      documentHash: '0x3a2b1c0d9e8f7a6b5c4d3e2f1a0b9876543210abcdef1234567890abcdef1234',
      verifier: 'Arc Event Operations Gate 3 Validator',
    },
    defaultValidDays: 0, // Perpetual
    badgeColor: 'bg-indigo-950 text-indigo-300 border-indigo-800',
    accentColor: 'from-indigo-500 to-purple-500',
  },
  {
    typeId: 'membership',
    name: 'Membership',
    vcType: 'MembershipCredential',
    category: 'Governance',
    schemaKey: 'ArcMembershipCredentialV1',
    schemaId: computeSchemaId('ArcMembershipCredentialV1'),
    description: 'Proves verified membership standing in a DAO, professional consortium, alumni association, or institutional club.',
    defaultClaims: {
      memberName: 'Alex Vance',
      organizationName: 'Arc Network Governance Consortium',
      membershipTier: 'Senior Protocol Fellow',
      votingPowerWeight: 1000,
      memberSince: '2025-01-10',
      goodStandingConfirmed: true,
    },
    defaultEvidence: {
      id: 'urn:arc:evidence:membership-registry-v1',
      type: ['ConsortiumCharterRegistration', 'KycVerificationAudit'],
      description: 'Governance charter signatory record verified by consortium legal counsel.',
      documentUrl: 'https://consortium.arc.network/members/alex-vance',
      documentHash: '0x7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9876543210abcdef0123456789ab',
      verifier: 'Consortium Membership Secretariat',
    },
    defaultValidDays: 365, // 1 Year Renewal
    badgeColor: 'bg-purple-950 text-purple-300 border-purple-800',
    accentColor: 'from-purple-500 to-pink-500',
  },
  {
    typeId: 'contribution',
    name: 'Contribution',
    vcType: 'ContributionCredential',
    category: 'Achievement',
    schemaKey: 'ArcContributionCredentialV1',
    schemaId: computeSchemaId('ArcContributionCredentialV1'),
    description: 'Records verified technical code contributions, research grants, vulnerability disclosures, or public goods development.',
    defaultClaims: {
      contributorName: 'Alex Vance',
      repository: 'arc-network/core-consensus-engine',
      contributionType: 'Core Protocol Optimization & EIP-712 Engine',
      mergedPullRequestCount: 14,
      totalLinesChanged: 4820,
      grantAwardedUsd: 25000,
      reviewerApproval: 'Consensus Engineering WG Lead',
    },
    defaultEvidence: {
      id: 'urn:arc:evidence:git-contribution-pr14',
      type: ['GitCommitHashChain', 'PeerReviewAudit'],
      description: 'Signed Git commit hashes verified on GitHub and mirrored on Arweave.',
      documentUrl: 'https://github.com/arc-network/core-consensus/commits?author=alexvance',
      documentHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      verifier: 'Arc Foundation Core Developer Review Board',
    },
    defaultValidDays: 0, // Perpetual
    badgeColor: 'bg-teal-950 text-teal-300 border-teal-800',
    accentColor: 'from-teal-500 to-cyan-500',
  },
  {
    typeId: 'achievement',
    name: 'Achievement',
    vcType: 'AchievementCredential',
    category: 'Achievement',
    schemaKey: 'ArcAchievementCredentialV1',
    schemaId: computeSchemaId('ArcAchievementCredentialV1'),
    description: 'Milestone achievement credential recognizing professional honors, competition results, or technical discoveries.',
    defaultClaims: {
      recipientName: 'Alex Vance',
      achievementTitle: 'Genesis Protocol Architect Milestone',
      issuerAuthority: 'Arc Foundation & Network Authority',
      criteria: 'Designed and deployed sub-second deterministic credential anchoring system on Arc',
      milestoneIndex: 'ACH-GENESIS-01',
      dateAchieved: '2026-10-01',
    },
    defaultEvidence: {
      id: 'urn:arc:evidence:achievement-milestone-01',
      type: ['FoundationResolution', 'NetworkDeploymentProof'],
      description: 'Arc Foundation Governance Resolution #42 ratified by validator multisig.',
      documentUrl: 'https://arc.network/governance/resolutions/42',
      documentHash: '0x99887766554433221100ffeeddccbbaa99887766554433221100ffeeddccbbaa',
      verifier: 'Arc Governance Genesis Multisig',
    },
    defaultValidDays: 0, // Perpetual
    badgeColor: 'bg-amber-950 text-amber-300 border-amber-800',
    accentColor: 'from-amber-500 to-orange-500',
  },
  {
    typeId: 'award',
    name: 'Award',
    vcType: 'AwardCredential',
    category: 'Achievement',
    schemaKey: 'ArcAwardCredentialV1',
    schemaId: computeSchemaId('ArcAwardCredentialV1'),
    description: 'Formal award recognizing excellence, outstanding research paper, innovation breakthrough, or industry distinction.',
    defaultClaims: {
      honoreeName: 'Alex Vance',
      awardTitle: 'Excellence in Cryptographic Engineering Award',
      presentingEntity: 'Global Decentralized Identity Forum',
      category: 'Best Privacy-Preserving Web3 Architecture 2026',
      juryPresident: 'Prof. David K. Miller',
      citation: 'For breakthrough work on deterministic off-chain claim hashing with on-chain zero-leakage state anchoring.',
    },
    defaultEvidence: {
      id: 'urn:arc:evidence:award-jury-verdict',
      type: ['JuryBallotRecord', 'AwardCeremonyVideoHash'],
      description: 'Jury consensus decision recorded in conference public proceedings.',
      documentUrl: 'https://identityforum.org/awards/2026/cryptography/vance',
      documentHash: '0x4f3e2d1c0b9a897867564534231201908f7e6d5c4b3a291807f6e5d4c3b2a190',
      verifier: 'GDIF Awards Advisory Council',
    },
    defaultValidDays: 0, // Perpetual
    badgeColor: 'bg-rose-950 text-rose-300 border-rose-800',
    accentColor: 'from-rose-500 to-pink-500',
  },
  {
    typeId: 'hackathon_participation',
    name: 'Hackathon Participation',
    vcType: 'HackathonParticipationCredential',
    category: 'Events',
    schemaKey: 'ArcHackathonParticipationCredentialV1',
    schemaId: computeSchemaId('ArcHackathonParticipationCredentialV1'),
    description: 'Proves participation, submission of working code, and podium placement in Web3 hackathons and builder sprints.',
    defaultClaims: {
      participantName: 'Alex Vance',
      hackathonName: 'ETH Arc Global Hackathon 2026',
      projectName: 'ARC Teleport: Cross-Chain Zero-Knowledge Relayer',
      placement: '1st Place Overall — Grand Prize Winner',
      track: 'Infrastructure & Sovereign Verification',
      prizeAmountUsd: 50000,
      projectRepoUrl: 'https://github.com/alexvance/arc-teleport-zk',
    },
    defaultEvidence: {
      id: 'urn:arc:evidence:hackathon-submission-etharc',
      type: ['DevpostSubmissionAudit', 'SmartContractDeploymentLog'],
      description: 'Verified Git commit log and testnet contract deployment receipts evaluated by hackathon judges.',
      documentUrl: 'https://devpost.com/software/arc-teleport-zk',
      documentHash: '0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
      verifier: 'ETH Arc Hackathon Judging Panel',
    },
    defaultValidDays: 0, // Perpetual
    badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-800',
    accentColor: 'from-emerald-500 to-cyan-500',
  },
  {
    typeId: 'employment_role',
    name: 'Employment / Role Credential',
    vcType: 'EmploymentRoleCredential',
    category: 'Professional',
    schemaKey: 'ArcEmploymentRoleCredentialV1',
    schemaId: computeSchemaId('ArcEmploymentRoleCredentialV1'),
    description: 'Verifies verified corporate employment, job title, institutional department, security clearance, and tenure.',
    defaultClaims: {
      employeeName: 'Alex Vance',
      employer: 'CyberScale Core Labs Ltd',
      jobTitle: 'Principal Cryptographic Engineer',
      department: 'Core Consensus & Zero Knowledge',
      employmentStatus: 'Full-Time Active',
      startDate: '2024-03-01',
      securityClearanceLevel: 'Tier 3 (Confidential Protocol Infrastructure)',
    },
    defaultEvidence: {
      id: 'urn:arc:evidence:hr-clearance-cyberscale',
      type: ['CorporateHRRecord', 'PayrollVerificationProof'],
      description: 'Employment verification signed by Authorized Corporate HR Issuer Key under Arc Issuer Registry.',
      documentUrl: 'https://cyberscale.io/verify/emp/alex-vance',
      documentHash: '0x9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef',
      verifier: 'CyberScale Core Labs HR Department',
    },
    defaultValidDays: 365, // Annual Refresh
    badgeColor: 'bg-blue-950 text-blue-300 border-blue-800',
    accentColor: 'from-blue-500 to-indigo-500',
  },
];

export function getCredentialTypeById(id: string): CredentialTypeDefinition | undefined {
  return CANONICAL_CREDENTIAL_TYPES.find((t) => t.typeId === id || t.schemaKey === id || t.vcType === id);
}
