import type { Address, Hash } from 'viem';

export interface CredentialSubjectClaims {
  [key: string]: unknown;
}

/**
 * W3C Credential Subject
 * Identifies the holder/subject and contains all private off-chain claims
 */
export interface CredentialSubject {
  id: string; // Holder DID, e.g. did:pkh:eip155:42424:0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
  address?: Address; // EVM address of holder
  claims: CredentialSubjectClaims; // Arbitrary typed claims (kept private off-chain)
}

/**
 * W3C Issuer Metadata
 * Identifies the issuing authority on Arc Mainnet
 */
export interface CredentialIssuerMeta {
  id: string; // Issuer DID, e.g. did:arc:org_ait or did:pkh:eip155:42424:0x28974aA448e8952B9c024d9f6974d08A375c3254
  name: string; // Legal or recognized organization name
  address: Address; // Signing wallet address (must be authorized in ArcIssuerRegistry)
  organizationId?: string; // e.g. org_ait_technology
  verifiedOnArc: boolean; // Flag indicating Arc governance accreditation status
}

/**
 * W3C Credential Schema Reference
 */
export interface CredentialSchemaReference {
  id: string; // e.g. https://schema.arc.network/v1/ArcAcademicDegree.json
  type: 'JsonSchemaValidator2018' | 'ArcSchemaDefinitionV1';
  schemaId: Hash; // Deterministic bytes32 schema identifier
  name: string; // Human-readable schema title
}

/**
 * W3C Evidence Reference
 * Documents the independent verification basis for issuing this credential
 */
export interface CredentialEvidence {
  id: string; // URI or URN identifying the evidence
  type: string[]; // e.g. ['InstitutionalAccreditationRecord', 'DocumentVerification']
  verifier?: string; // Entity or committee that audited the evidence
  description?: string; // Human-readable summary of evidence
  documentUrl?: string; // Off-chain URL to proof document (transcripts, video, commit, exam log)
  documentHash?: string; // Cryptographic digest (Keccak256 or SHA-256) of document
}

/**
 * W3C Credential Status Reference
 * Points directly to the Arc on-chain revocation registry contract
 */
export interface CredentialStatusReference {
  id: string; // URI to status query, e.g. https://registry.arc.network/status/0x...#revocation
  type: 'ArcOnChainRevocationRegistry2024';
  statusPurpose: 'revocation' | 'suspension';
  contractAddress: Address; // ArcCredentialRegistry contract address
  credentialHash: Hash; // On-chain anchored credential digest
  revocationNonce?: number;
}

/**
 * Blockchain Record Reference
 * Concrete link to the state of this credential on Arc Mainnet
 */
export interface BlockchainRecordReference {
  network: 'Arc Mainnet' | 'Arc Testnet';
  chainId: number; // 42424 for Arc Mainnet
  contractAddress: Address; // ArcCredentialRegistry address
  credentialHash: Hash; // Anchored bytes32 hash
  anchorTxHash?: Hash; // Confirmation transaction hash
  blockNumber?: number; // Confirmed block height
  anchoredAt?: string; // Block confirmation timestamp
  status: 'ANCHORED' | 'PENDING' | 'REVOKED' | 'EXPIRED' | 'SUSPENDED';
}

/**
 * Future Selective Disclosure Preparation
 * Holds per-claim salted hashes so individual claims can be blinded or disclosed in future
 */
export interface SelectiveDisclosureCommitment {
  algorithm: 'Keccak256-Salted-Blinding';
  claimHashes: Record<string, Hash>; // fieldName => Keccak256(fieldName + val + salt)
  salts?: Record<string, string>; // Held privately by holder for selective disclosure presentations
}

/**
 * W3C Cryptographic Proof
 * EIP-712 typed data signature created in issuer's Web3 wallet
 */
export interface CredentialProof {
  type: 'ArcEip712Signature2024';
  created: string; // ISO 8601 creation timestamp
  verificationMethod: string; // did:arc:0x...#key-1
  proofPurpose: 'assertionMethod';
  proofValue: `0x${string}`; // Issuer ECDSA signature (65 bytes hex)
  claimsDigest: Hash; // Deterministic Keccak256 hash of canonical private claims
  credentialHash: Hash; // Keccak256 EIP-712 digest anchored on Arc Mainnet
  anchorTxHash?: Hash; // Arc Mainnet transaction hash
  arcBlockNumber?: number; // Arc Mainnet block number
  chainId: number;
  disclosureCommitment?: SelectiveDisclosureCommitment;
}

/**
 * Complete ARC Verify Verifiable Credential Data Model
 * Strictly follows W3C Verifiable Credentials Data Model v1.1/v2.0
 */
export interface ArcVerifiableCredential {
  '@context': string[];
  id: string; // Credential ID (e.g. urn:uuid:... or urn:arc:credential:...)
  type: string[]; // ['VerifiableCredential', 'CertificateCredential', etc.]
  issuer: CredentialIssuerMeta; // Issuer & Issuer Identifier
  issuanceDate: string; // Issue Date (ISO 8601)
  expirationDate?: string; // Expiration Date (ISO 8601, optional/perpetual)
  credentialSubject: CredentialSubject; // Holder / Subject & Private Claims
  credentialSchema: CredentialSchemaReference; // Credential Schema / Type
  schemaId: Hash; // Convenience bytes32 schema identifier
  schemaName: string; // Convenience schema name
  evidence?: CredentialEvidence[]; // Evidence Reference where applicable
  credentialStatus: CredentialStatusReference; // Credential Status (Arc Revocation Registry)
  blockchainRecord: BlockchainRecordReference; // Blockchain Record Reference
  proof: CredentialProof; // Cryptographic Proof / Signature
  revocationNonce: number;
}

/**
 * W3C Verifiable Presentation
 * Constructed by the holder to share one or more verifiable credentials with verifiers
 */
export interface ArcVerifiablePresentation {
  '@context': string[];
  type: string[];
  id: string;
  holder: string; // did:pkh:eip155:42424:0x...
  verifiableCredential: ArcVerifiableCredential[];
  proof?: {
    type: 'ArcHolderProof2024';
    created: string;
    challenge: string;
    holderSignature: `0x${string}`;
  };
}

/**
 * Granular verification step result
 */
export interface VerificationCheckStep {
  id: string;
  name: string;
  description: string;
  status: 'passed' | 'failed' | 'warning' | 'pending';
  details: string;
  metadata?: Record<string, unknown>;
}

/**
 * Comprehensive verification audit report produced by independent verifier
 */
export interface ComprehensiveVerificationResult {
  overallStatus: 'VALID' | 'INVALID' | 'REVOKED' | 'EXPIRED';
  verifiedAt: string;
  credentialId: string;
  credentialType: string;
  credentialHash: Hash;
  issuerAddress: Address;
  recoveredSigner: Address;
  subjectAddress?: Address;
  schemaId: Hash;
  schemaName: string;
  steps: VerificationCheckStep[];
  onChainStatus?: {
    anchored: boolean;
    issuedAt?: number;
    validUntil?: number;
    revoked: boolean;
    revocationReason?: string;
    revokedAt?: number;
    blockNumber?: number;
  };
  issuerRegistryStatus?: {
    isRegistered: boolean;
    isVerified: boolean;
    organizationName?: string;
    didUri?: string;
    departmentLabel?: string;
  };
  crossChainProofCapable: boolean;
}
