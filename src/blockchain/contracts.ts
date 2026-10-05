import type { Address } from 'viem';

// Configurable Arc Mainnet Contract Addresses
export const ARC_CONTRACTS = {
  CREDENTIAL_REGISTRY: (import.meta.env?.VITE_ARC_CREDENTIAL_REGISTRY ||
    '0x71C8a33d62d420Fa3A6A88B209e99393E8d5e34E') as Address,
  ISSUER_REGISTRY: (import.meta.env?.VITE_ARC_ISSUER_REGISTRY ||
    '0x28974aa448e8952b9C024D9f6974d08a375C3254') as Address,
  CROSS_CHAIN_TELEPORT: (import.meta.env?.VITE_ARC_TELEPORT_ROUTER ||
    '0x5248EcF0B62E34863a2F3Fa14589D8f03B30E3f9') as Address,
} as const;

export const ARC_CREDENTIAL_REGISTRY_ABI = [
  {
    type: 'function',
    name: 'anchorCredential',
    inputs: [
      { name: 'credentialHash', type: 'bytes32' },
      { name: 'subject', type: 'address' },
      { name: 'validUntil', type: 'uint64' },
      { name: 'schemaId', type: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'batchAnchorCredentials',
    inputs: [
      { name: 'credentialHashes', type: 'bytes32[]' },
      { name: 'subjects', type: 'address[]' },
      { name: 'validUntils', type: 'uint64[]' },
      { name: 'schemaIds', type: 'bytes32[]' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'revokeCredential',
    inputs: [
      { name: 'credentialHash', type: 'bytes32' },
      { name: 'reason', type: 'uint8' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'isCredentialValid',
    inputs: [{ name: 'credentialHash', type: 'bytes32' }],
    outputs: [
      { name: 'isValid', type: 'bool' },
      { name: 'isRevoked', type: 'bool' },
      { name: 'isExpired', type: 'bool' },
      { name: 'issuer', type: 'address' },
      { name: 'subject', type: 'address' },
      { name: 'issuedAt', type: 'uint64' },
      { name: 'validUntil', type: 'uint64' },
      { name: 'schemaId', type: 'bytes32' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getCredentialRecord',
    inputs: [{ name: 'credentialHash', type: 'bytes32' }],
    outputs: [
      {
        components: [
          { name: 'credentialHash', type: 'bytes32' },
          { name: 'issuer', type: 'address' },
          { name: 'subject', type: 'address' },
          { name: 'schemaId', type: 'bytes32' },
          { name: 'issuedAt', type: 'uint64' },
          { name: 'validUntil', type: 'uint64' },
          { name: 'revoked', type: 'bool' },
          { name: 'reason', type: 'uint8' },
          { name: 'revokedAt', type: 'uint64' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getSubjectCredentials',
    inputs: [{ name: 'subject', type: 'address' }],
    outputs: [{ name: '', type: 'bytes32[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getIssuerCredentials',
    inputs: [{ name: 'issuer', type: 'address' }],
    outputs: [{ name: '', type: 'bytes32[]' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'CredentialAnchored',
    inputs: [
      { indexed: true, name: 'credentialHash', type: 'bytes32' },
      { indexed: true, name: 'issuer', type: 'address' },
      { indexed: true, name: 'subject', type: 'address' },
      { indexed: false, name: 'schemaId', type: 'bytes32' },
      { indexed: false, name: 'validUntil', type: 'uint64' },
    ],
  },
  {
    type: 'event',
    name: 'CredentialRevoked',
    inputs: [
      { indexed: true, name: 'credentialHash', type: 'bytes32' },
      { indexed: true, name: 'issuer', type: 'address' },
      { indexed: false, name: 'reason', type: 'uint8' },
      { indexed: false, name: 'revokedAt', type: 'uint64' },
    ],
  },
] as const;

export const ARC_ISSUER_REGISTRY_ABI = [
  {
    type: 'function',
    name: 'registerOrganization',
    inputs: [
      { name: 'orgId', type: 'bytes32' },
      { name: 'name', type: 'string' },
      { name: 'didUri', type: 'string' },
      { name: 'metadataHash', type: 'bytes32' },
      { name: 'initialIssuerWallet', type: 'address' },
      { name: 'initialWalletLabel', type: 'string' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setOrganizationStatus',
    inputs: [
      { name: 'orgId', type: 'bytes32' },
      { name: 'newStatus', type: 'uint8' },
      { name: 'reason', type: 'string' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'suspendOrganization',
    inputs: [
      { name: 'orgId', type: 'bytes32' },
      { name: 'reason', type: 'string' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'reactivateOrganization',
    inputs: [{ name: 'orgId', type: 'bytes32' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'authorizeIssuerWallet',
    inputs: [
      { name: 'orgId', type: 'bytes32' },
      { name: 'wallet', type: 'address' },
      { name: 'label', type: 'string' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'revokeIssuerWallet',
    inputs: [
      { name: 'orgId', type: 'bytes32' },
      { name: 'wallet', type: 'address' },
      { name: 'reason', type: 'string' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'setOrganizationAdmin',
    inputs: [
      { name: 'orgId', type: 'bytes32' },
      { name: 'admin', type: 'address' },
      { name: 'isAuthorized', type: 'bool' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'canWalletIssue',
    inputs: [{ name: 'wallet', type: 'address' }],
    outputs: [
      { name: 'allowed', type: 'bool' },
      { name: 'orgId', type: 'bytes32' },
      { name: 'status', type: 'uint8' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isVerifiedIssuer',
    inputs: [{ name: 'wallet', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getOrganization',
    inputs: [{ name: 'orgId', type: 'bytes32' }],
    outputs: [
      {
        components: [
          { name: 'orgId', type: 'bytes32' },
          { name: 'name', type: 'string' },
          { name: 'didUri', type: 'string' },
          { name: 'metadataHash', type: 'bytes32' },
          { name: 'owner', type: 'address' },
          { name: 'status', type: 'uint8' },
          { name: 'registeredAt', type: 'uint64' },
          { name: 'verifiedAt', type: 'uint64' },
          { name: 'credentialCount', type: 'uint256' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getOrganizationIssuerWallets',
    inputs: [{ name: 'orgId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getWalletOrganization',
    inputs: [{ name: 'wallet', type: 'address' }],
    outputs: [
      { name: 'orgId', type: 'bytes32' },
      { name: 'label', type: 'string' },
      { name: 'isAuthorized', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'totalOrganizations',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'OrganizationRegistered',
    inputs: [
      { indexed: true, name: 'orgId', type: 'bytes32' },
      { indexed: false, name: 'name', type: 'string' },
      { indexed: false, name: 'didUri', type: 'string' },
      { indexed: true, name: 'owner', type: 'address' },
      { indexed: false, name: 'metadataHash', type: 'bytes32' },
    ],
  },
  {
    type: 'event',
    name: 'OrganizationStatusChanged',
    inputs: [
      { indexed: true, name: 'orgId', type: 'bytes32' },
      { indexed: false, name: 'previousStatus', type: 'uint8' },
      { indexed: false, name: 'newStatus', type: 'uint8' },
      { indexed: false, name: 'reason', type: 'string' },
    ],
  },
  {
    type: 'event',
    name: 'OrganizationSuspended',
    inputs: [
      { indexed: true, name: 'orgId', type: 'bytes32' },
      { indexed: true, name: 'caller', type: 'address' },
      { indexed: false, name: 'reason', type: 'string' },
    ],
  },
  {
    type: 'event',
    name: 'OrganizationReactivated',
    inputs: [
      { indexed: true, name: 'orgId', type: 'bytes32' },
      { indexed: true, name: 'caller', type: 'address' },
    ],
  },
  {
    type: 'event',
    name: 'IssuerWalletAuthorized',
    inputs: [
      { indexed: true, name: 'orgId', type: 'bytes32' },
      { indexed: true, name: 'wallet', type: 'address' },
      { indexed: false, name: 'label', type: 'string' },
      { indexed: true, name: 'authorizedBy', type: 'address' },
    ],
  },
  {
    type: 'event',
    name: 'IssuerWalletRevoked',
    inputs: [
      { indexed: true, name: 'orgId', type: 'bytes32' },
      { indexed: true, name: 'wallet', type: 'address' },
      { indexed: false, name: 'reason', type: 'string' },
      { indexed: true, name: 'revokedBy', type: 'address' },
    ],
  },
] as const;

export const ARC_TELEPORT_ABI = [
  {
    type: 'function',
    name: 'dispatchVerificationProof',
    inputs: [
      { name: 'destinationChainId', type: 'uint32' },
      { name: 'destinationReceiver', type: 'address' },
      { name: 'credentialHash', type: 'bytes32' },
    ],
    outputs: [{ name: 'requestId', type: 'bytes32' }],
    stateMutability: 'payable',
  },
  {
    type: 'event',
    name: 'CrossChainVerificationDispatched',
    inputs: [
      { indexed: true, name: 'requestId', type: 'bytes32' },
      { indexed: true, name: 'destinationChainId', type: 'uint32' },
      { indexed: true, name: 'destinationReceiver', type: 'address' },
      { indexed: false, name: 'credentialHash', type: 'bytes32' },
      { indexed: false, name: 'isValid', type: 'bool' },
    ],
  },
] as const;
