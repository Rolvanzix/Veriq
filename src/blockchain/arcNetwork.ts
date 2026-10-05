import {
  type Address,
  type Hash,
  type Hex,
  createPublicClient,
  http,
  isAddress,
  getAddress,
  encodeFunctionData,
  decodeErrorResult,
} from 'viem';
import { arcMainnet, arcTestnet } from './chain';
import { ARC_CONTRACTS, ARC_CREDENTIAL_REGISTRY_ABI, ARC_ISSUER_REGISTRY_ABI } from './contracts';

/**
 * Strict Arc Network Isolation Configuration
 * Prevents accidental transaction submission to non-Arc networks (e.g. Ethereum Mainnet, Sepolia, Arbitrum).
 */
export const ARC_ISOLATED_CONFIG = {
  chainId: arcMainnet.id, // 42424
  networkName: arcMainnet.name,
  chain: arcMainnet,
  nativeCurrency: arcMainnet.nativeCurrency,
  primaryGasToken: 'ARC / USDC',
  rpcUrl: 'https://rpc.arc.network',
  explorerUrl: 'https://explorer.arc.network',
  deterministicFinality: true,
  expectedContracts: ARC_CONTRACTS,
} as const;

/**
 * Validates that the active chain is strictly Arc Mainnet (or Arc Testnet for testing).
 */
export function assertArcNetwork(activeChainId: number | undefined): {
  isArc: boolean;
  isMainnet: boolean;
  error?: string;
} {
  if (!activeChainId) {
    return {
      isArc: false,
      isMainnet: false,
      error: 'No active blockchain network detected. Please connect your wallet to Arc Mainnet.',
    };
  }

  if (activeChainId === arcMainnet.id) {
    return { isArc: true, isMainnet: true };
  }

  if (activeChainId === arcTestnet.id) {
    return { isArc: true, isMainnet: false };
  }

  return {
    isArc: false,
    isMainnet: false,
    error: `Incorrect network detected (Chain ID: ${activeChainId}). ARC Verify strictly requires Arc Mainnet (Chain ID: ${arcMainnet.id}). Transactions on this network are blocked to protect user funds and credential integrity.`,
  };
}

/**
 * Structured Arc Error Categories
 */
export type ArcErrorCategory =
  | 'REJECTED_SIGNATURE'
  | 'INSUFFICIENT_GAS_USDC'
  | 'WRONG_NETWORK'
  | 'CONTRACT_REVERT'
  | 'UNAUTHORIZED_ISSUER'
  | 'ALREADY_ANCHORED'
  | 'ALREADY_REVOKED'
  | 'NETWORK_TIMEOUT'
  | 'UNKNOWN';

export interface ArcParsedError {
  category: ArcErrorCategory;
  title: string;
  message: string;
  remedy: string;
  rawError?: string;
  technicalCode?: string | number;
}

/**
 * Parses any blockchain or wallet error into clear, actionable Arc-specific guidance.
 * Handles:
 * - Rejected signatures
 * - Insufficient USDC for gas
 * - Wrong network
 * - Reverted contracts
 */
export function parseArcBlockchainError(error: unknown, currentChainId?: number): ArcParsedError {
  const errString = error instanceof Error ? error.message : String(error);
  const errAny = error as any;

  // Check network mismatch first
  if (currentChainId && currentChainId !== arcMainnet.id && currentChainId !== arcTestnet.id) {
    return {
      category: 'WRONG_NETWORK',
      title: 'Incorrect Network Connected',
      message: `Your wallet is currently connected to Chain ID ${currentChainId}. ARC Verify transactions must be submitted to Arc Mainnet (Chain ID 42424).`,
      remedy: 'Please switch your wallet network to Arc Mainnet in the top bar or inside your wallet extension before retrying.',
      rawError: errString,
    };
  }

  // 1. User Rejection
  if (
    errString.includes('User rejected') ||
    errString.includes('user rejected') ||
    errString.includes('User denied') ||
    errString.includes('4001') ||
    errAny?.code === 4001 ||
    errAny?.cause?.code === 4001
  ) {
    return {
      category: 'REJECTED_SIGNATURE',
      title: 'Signature / Transaction Rejected by Issuer',
      message: 'The cryptographic signature or transaction was explicitly declined in your wallet. The credential was NOT issued or modified.',
      remedy: 'If you intended to approve this action, re-open your wallet when prompted and confirm the EIP-712 typed data message or transaction.',
      rawError: errString,
      technicalCode: 4001,
    };
  }

  // 2. Insufficient Gas / USDC
  if (
    errString.includes('insufficient funds') ||
    errString.includes('exceeds balance') ||
    errString.includes('gas required exceeds allowance') ||
    errString.includes('insufficient USDC') ||
    errString.includes('insufficient gas') ||
    errString.includes('gas * price + value')
  ) {
    return {
      category: 'INSUFFICIENT_GAS_USDC',
      title: 'Insufficient Gas Balance on Arc Mainnet',
      message: 'Your issuer wallet does not have sufficient ARC or gas tokens (such as USDC) on Arc Mainnet to execute this on-chain registration.',
      remedy: 'Deposit native ARC or gas fee tokens to your authorized issuer address on Arc Mainnet, or request faucet funds if on testnet.',
      rawError: errString,
    };
  }

  // 3. Known Contract Reverts
  if (
    errString.includes('caller is not a verified issuer') ||
    errString.includes('unauthorized caller') ||
    errString.includes('not an organization administrator')
  ) {
    return {
      category: 'UNAUTHORIZED_ISSUER',
      title: 'Unauthorized Issuer Wallet',
      message: 'Smart Contract Revert: The transaction caller address is not registered as an authorized issuer for a verified organization in ArcIssuerRegistry.',
      remedy: 'Verify that your connected wallet has been authorized by your Organization Owner in the Issuer Registry tab, or switch to an authorized wallet.',
      rawError: errString,
    };
  }

  if (errString.includes('already anchored') || errString.includes('Duplicate hash')) {
    return {
      category: 'ALREADY_ANCHORED',
      title: 'Credential Already Anchored',
      message: 'Smart Contract Revert: A credential with this exact deterministic Keccak256 hash has already been registered on Arc Mainnet.',
      remedy: 'Ensure credential claims or subject identifier are unique, or check the existing credential record in the Issuer Dashboard.',
      rawError: errString,
    };
  }

  if (errString.includes('already revoked')) {
    return {
      category: 'ALREADY_REVOKED',
      title: 'Credential Already Revoked',
      message: 'Smart Contract Revert: This credential is already recorded as revoked on Arc Mainnet.',
      remedy: 'No further revocation action can be taken on this hash.',
      rawError: errString,
    };
  }

  if (errString.includes('only issuer or owner can revoke')) {
    return {
      category: 'CONTRACT_REVERT',
      title: 'Revocation Unauthorized',
      message: 'Smart Contract Revert: Only the original issuing wallet address or the Arc contract governance owner can revoke this credential record.',
      remedy: 'Connect with the exact wallet address that issued the credential originally.',
      rawError: errString,
    };
  }

  if (errString.includes('validUntil must be in future')) {
    return {
      category: 'CONTRACT_REVERT',
      title: 'Invalid Expiration Timestamp',
      message: 'Smart Contract Revert: The specified credential expiration timestamp is not in the future.',
      remedy: 'Provide an expiration date further in the future or select perpetual validity.',
      rawError: errString,
    };
  }

  // Default contract / network error
  return {
    category: 'UNKNOWN',
    title: 'Arc Blockchain Interaction Error',
    message: errString.length > 250 ? errString.slice(0, 250) + '...' : errString,
    remedy: 'Check network connectivity to Arc Mainnet RPC and ensure your wallet is unlocked.',
    rawError: errString,
  };
}

/**
 * Dedicated Arc Mainnet Public Client
 * Utilizes sub-second polling and deterministic single-confirmation finality.
 */
export const arcPublicClient = createPublicClient({
  chain: arcMainnet,
  transport: http('https://rpc.arc.network', {
    timeout: 10_000,
    retryCount: 2,
  }),
  pollingInterval: 1_000,
});
