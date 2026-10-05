import {
  type Address,
  type Hash,
  getAddress,
  hashTypedData,
  isAddress,
  keccak256,
  recoverTypedDataAddress,
  stringToBytes,
} from 'viem';
import { ARC_CONTRACTS } from './contracts';
import { canonicalizeJson } from '../verification/canonical';

export const ARC_EIP712_DOMAIN = (chainId = 42424, verifyingContract = ARC_CONTRACTS.CREDENTIAL_REGISTRY) => ({
  name: 'ARC Verify',
  version: '1.0.0',
  chainId,
  verifyingContract: getAddress(verifyingContract),
} as const);

export const ARC_CREDENTIAL_EIP712_TYPES = {
  ArcCredential: [
    { name: 'credentialId', type: 'string' },
    { name: 'schemaId', type: 'bytes32' },
    { name: 'issuer', type: 'address' },
    { name: 'subject', type: 'address' },
    { name: 'claimsDigest', type: 'bytes32' },
    { name: 'validFrom', type: 'uint64' },
    { name: 'validUntil', type: 'uint64' },
    { name: 'revocationNonce', type: 'uint256' },
  ],
} as const;

export interface ArcEip712CredentialPayload {
  credentialId: string;
  schemaId: Hash;
  issuer: Address;
  subject: Address;
  claimsDigest: Hash;
  validFrom: bigint;
  validUntil: bigint;
  revocationNonce: bigint;
}

function sanitizePayload(payload: ArcEip712CredentialPayload): ArcEip712CredentialPayload {
  return {
    ...payload,
    issuer: getAddress(payload.issuer),
    subject: payload.subject && isAddress(payload.subject)
      ? getAddress(payload.subject)
      : '0x0000000000000000000000000000000000000000',
  };
}

/**
 * Computes canonical Keccak256 digest of private off-chain claims
 * using RFC 8785 JSON Canonicalization Scheme (JCS)
 */
export function computeClaimsDigest(claims: Record<string, unknown>): Hash {
  const canonical = canonicalizeJson(claims);
  return keccak256(stringToBytes(canonical));
}

/**
 * Computes the primary Arc Credential Hash (EIP-712 typed digest) anchored on-chain
 */
export function computeCredentialHash(
  payload: ArcEip712CredentialPayload,
  chainId = 42424,
  verifyingContract = ARC_CONTRACTS.CREDENTIAL_REGISTRY
): Hash {
  const sanitized = sanitizePayload(payload);
  return hashTypedData({
    domain: ARC_EIP712_DOMAIN(chainId, verifyingContract),
    types: ARC_CREDENTIAL_EIP712_TYPES,
    primaryType: 'ArcCredential',
    message: sanitized,
  });
}

/**
 * Recovers signer address from signed credential using ECDSA typed data recovery
 */
export async function recoverCredentialIssuer(
  payload: ArcEip712CredentialPayload,
  signature: `0x${string}`,
  chainId = 42424,
  verifyingContract = ARC_CONTRACTS.CREDENTIAL_REGISTRY
): Promise<Address> {
  const sanitized = sanitizePayload(payload);
  return await recoverTypedDataAddress({
    domain: ARC_EIP712_DOMAIN(chainId, verifyingContract),
    types: ARC_CREDENTIAL_EIP712_TYPES,
    primaryType: 'ArcCredential',
    message: sanitized,
    signature,
  });
}

export function computeSchemaId(schemaName: string): Hash {
  return keccak256(stringToBytes(`arc.schema.v1.${schemaName.toLowerCase().trim()}`));
}
