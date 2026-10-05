import type { ArcVerifiableCredential } from '../../verification/types';

export type HolderCredentialStatusType =
  | 'ACTIVE'
  | 'EXPIRING'
  | 'EXPIRED'
  | 'SUSPENDED'
  | 'REVOKED';

export interface CredentialStatusDescriptor {
  type: HolderCredentialStatusType;
  label: string; // Exact user format: "✓ Active", "⚠ Expiring/Expired", "⏸ Suspended", "✕ Revoked"
  symbol: string; // "✓", "⚠", "⏸", "✕"
  badgeClass: string;
  pillClass: string;
  textClass: string;
  dotColor: string;
  explanation: string;
  isUsable: boolean;
}

/**
 * Resolves the authoritative lifecycle status for a Verifiable Credential on Arc.
 * Explicitly distinguishes:
 * ✓ Active
 * ⚠ Expiring/Expired
 * ⏸ Suspended
 * ✕ Revoked
 */
export function resolveCredentialStatus(credential: ArcVerifiableCredential): CredentialStatusDescriptor {
  const isRevoked =
    credential.blockchainRecord?.status === 'REVOKED' ||
    (credential.credentialStatus as any)?.status === 'REVOKED';

  const isSuspended =
    credential.blockchainRecord?.status === 'SUSPENDED' ||
    credential.credentialStatus?.statusPurpose === 'suspension';

  const now = Date.now();
  const hasExpiration = Boolean(credential.expirationDate);
  const expirationTime = hasExpiration ? new Date(credential.expirationDate!).getTime() : null;
  const isExpired = expirationTime !== null && expirationTime <= now;
  const isExpiringSoon =
    !isExpired &&
    expirationTime !== null &&
    expirationTime - now <= 30 * 24 * 60 * 60 * 1000; // Within 30 days

  // 1. Revoked (Takes precedence)
  if (isRevoked) {
    const claimsObj = credential.credentialSubject.claims as Record<string, unknown>;
    const reasonText = claimsObj?.revocationReason
      ? `Reason: ${String(claimsObj.revocationReason)}`
      : 'Revoked on Arc Credential Registry';
    return {
      type: 'REVOKED',
      label: '✕ Revoked',
      symbol: '✕',
      badgeClass: 'bg-rose-950/80 text-rose-300 border-rose-800/80 shadow-sm shadow-rose-950/30',
      pillClass: 'bg-rose-950/60 text-rose-300 border border-rose-800/60',
      textClass: 'text-rose-400',
      dotColor: 'bg-rose-500',
      explanation: reasonText,
      isUsable: false,
    };
  }

  // 2. Suspended
  if (isSuspended) {
    return {
      type: 'SUSPENDED',
      label: '⏸ Suspended',
      symbol: '⏸',
      badgeClass: 'bg-slate-900 text-slate-300 border-slate-700 shadow-sm shadow-slate-950/30',
      pillClass: 'bg-slate-900/80 text-slate-300 border border-slate-700',
      textClass: 'text-slate-400',
      dotColor: 'bg-amber-400',
      explanation: 'Temporarily suspended by issuing authority pending administrative or compliance review.',
      isUsable: false,
    };
  }

  // 3. Expired
  if (isExpired) {
    const expiredDateStr = new Date(expirationTime!).toLocaleDateString();
    return {
      type: 'EXPIRED',
      label: '⚠ Expired',
      symbol: '⚠',
      badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-800/80 shadow-sm shadow-amber-950/30',
      pillClass: 'bg-amber-950/60 text-amber-300 border border-amber-800/60',
      textClass: 'text-amber-400',
      dotColor: 'bg-amber-500',
      explanation: `Validity period lapsed on ${expiredDateStr}. Independent verifiers will flag this credential as expired.`,
      isUsable: false,
    };
  }

  // 4. Expiring Soon
  if (isExpiringSoon) {
    const daysRemaining = Math.max(1, Math.ceil((expirationTime! - now) / (1000 * 60 * 60 * 24)));
    return {
      type: 'EXPIRING',
      label: `⚠ Expiring (${daysRemaining}d)`,
      symbol: '⚠',
      badgeClass: 'bg-amber-950/70 text-amber-300 border-amber-800/70 shadow-sm shadow-amber-950/20',
      pillClass: 'bg-amber-950/50 text-amber-300 border border-amber-800/50',
      textClass: 'text-amber-400',
      dotColor: 'bg-amber-400',
      explanation: `Valid until ${new Date(expirationTime!).toLocaleDateString()} (${daysRemaining} days remaining). Renewal recommended.`,
      isUsable: true,
    };
  }

  // 5. Active
  const expiryNote = hasExpiration
    ? `Valid until ${new Date(expirationTime!).toLocaleDateString()}`
    : 'Perpetual validity (no expiration date)';

  return {
    type: 'ACTIVE',
    label: '✓ Active',
    symbol: '✓',
    badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80 shadow-sm shadow-emerald-950/30',
    pillClass: 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60',
    textClass: 'text-emerald-400',
    dotColor: 'bg-emerald-400',
    explanation: `Active on Arc Mainnet. Cryptographically anchored and verified. ${expiryNote}.`,
    isUsable: true,
  };
}
