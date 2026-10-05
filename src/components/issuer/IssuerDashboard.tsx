import React, { useState, useMemo } from 'react';
import {
  Award,
  PlusCircle,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Copy,
  Clock,
  Building,
  User,
  ShieldCheck,
  ShieldAlert,
  Layers,
  Sparkles,
  RefreshCw,
  Eye,
  Trash2,
  FileText,
  Lock,
  Download,
  X,
  Share2,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useAccount } from 'wagmi';
import type { Address, Hash } from 'viem';
import type { ArcVerifiableCredential } from '../../verification/types';
import { CANONICAL_CREDENTIAL_TYPES } from '../../verification/credential-types';
import { generateVerificationLink } from '../../verification/qr';
import { ARC_CONTRACTS, ARC_CREDENTIAL_REGISTRY_ABI } from '../../blockchain/contracts';
import { useArcTransaction } from '../../blockchain/useArcTransaction';
import { ArcTransactionModal } from '../layout/ArcTransactionModal';

interface IssuerDashboardProps {
  credentials: ArcVerifiableCredential[];
  loading: boolean;
  onRefresh: () => void;
  onCreateCredentialClick: () => void;
  onNavigateToVerifier?: (payloadUrl: string) => void;
  onNavigateToHolder?: (holderAddress: string) => void;
  currentAddress?: string;
}

export function IssuerDashboard({
  credentials,
  loading,
  onRefresh,
  onCreateCredentialClick,
  onNavigateToVerifier,
  onNavigateToHolder,
  currentAddress,
}: IssuerDashboardProps) {
  const { session, hasPermission, demoSwitchRole } = useAuth();
  const { address: wagmiAddress } = useAccount();

  const effectiveAddress = (session.userAddress || currentAddress || wagmiAddress || '0x28974aA448e8952B9c024d9f6974d08A375c3254') as Address;

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Revoked' | 'Expired'>('All');
  const [selectedCredentialForDetail, setSelectedCredentialForDetail] = useState<ArcVerifiableCredential | null>(null);
  const [revokingCredential, setRevokingCredential] = useState<ArcVerifiableCredential | null>(null);
  const [revocationReason, setRevocationReason] = useState('AffiliationTerminated');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);

  const {
    stage: revokeStage,
    stageMessage: revokeStageMessage,
    txHash: revokeTxHash,
    txResult: revokeTxResult,
    error: revokeError,
    executeTransaction: executeRevokeTransaction,
    resetState: resetRevokeState,
  } = useArcTransaction({
    actionName: 'Arc Credential Revocation',
    onSuccess: () => {
      onRefresh();
    },
  });

  const REASON_CODES: Record<string, number> = {
    None: 0,
    Superseded: 1,
    AffiliationTerminated: 2,
    DisciplinaryAction: 3,
    Compromised: 4,
    RequestedByHolder: 5,
  };

  // Status checks
  const isOrgVerified = session.organization?.status === 'VERIFIED';
  const canIssue = hasPermission('ISSUE_CREDENTIAL');
  const isIssuanceAllowed = isOrgVerified && canIssue;

  // Filter credentials
  const filteredCredentials = useMemo(() => {
    return credentials.filter((cred) => {
      // Status filter
      const isRevoked = cred.blockchainRecord?.status === 'REVOKED';
      const isExpired = Boolean(cred.expirationDate && new Date(cred.expirationDate).getTime() < Date.now());
      const currentStatus = isRevoked ? 'Revoked' : isExpired ? 'Expired' : 'Active';

      if (statusFilter !== 'All' && currentStatus !== statusFilter) {
        return false;
      }

      // Search term
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const credId = cred.id.toLowerCase();
      const schemaName = (cred.schemaName || '').toLowerCase();
      const subject = (cred.credentialSubject.address || '').toLowerCase();
      const recipientName = String((cred.credentialSubject.claims as any)?.recipientName || (cred.credentialSubject.claims as any)?.studentName || (cred.credentialSubject.claims as any)?.attendeeName || (cred.credentialSubject.claims as any)?.memberName || (cred.credentialSubject.claims as any)?.employeeName || '').toLowerCase();

      return (
        credId.includes(term) ||
        schemaName.includes(term) ||
        subject.includes(term) ||
        recipientName.includes(term)
      );
    });
  }, [credentials, statusFilter, searchTerm]);

  // Metrics
  const metrics = useMemo(() => {
    const total = credentials.length;
    let active = 0;
    let revoked = 0;
    let expired = 0;

    for (const cred of credentials) {
      if (cred.blockchainRecord?.status === 'REVOKED') {
        revoked++;
      } else if (cred.expirationDate && new Date(cred.expirationDate).getTime() < Date.now()) {
        expired++;
      } else {
        active++;
      }
    }

    return { total, active, revoked, expired };
  }, [credentials]);

  const handleRevoke = async () => {
    if (!revokingCredential) return;
    const credHash = (revokingCredential.proof?.credentialHash || revokingCredential.blockchainRecord?.credentialHash) as Hash;
    if (!credHash) {
      alert('Missing credential hash for on-chain revocation');
      return;
    }

    const reasonNum = REASON_CODES[revocationReason] ?? 2;
    setIsTxModalOpen(true);

    try {
      // 1. Submit on-chain revocation transaction to Arc Credential Registry
      await executeRevokeTransaction({
        contractAddress: ARC_CONTRACTS.CREDENTIAL_REGISTRY,
        abi: ARC_CREDENTIAL_REGISTRY_ABI,
        functionName: 'revokeCredential',
        args: [credHash, reasonNum],
        customTxSender: effectiveAddress,
      });

      // 2. Sync with database
      await fetch('/api/credentials/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentialHash: credHash,
          reason: revocationReason,
          callerAddress: effectiveAddress,
        }),
      });

      onRefresh();
      setRevokingCredential(null);
    } catch (err: any) {
      console.error('Revocation failed:', err);
    }
  };

  const handleCopyLink = (cred: ArcVerifiableCredential) => {
    const link = generateVerificationLink(cred);
    navigator.clipboard.writeText(link);
    setCopiedLink(cred.id);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const getRecipientName = (cred: ArcVerifiableCredential) => {
    const claims = cred.credentialSubject.claims as any;
    return (
      claims.recipientName ||
      claims.studentName ||
      claims.attendeeName ||
      claims.memberName ||
      claims.contributorName ||
      claims.honoreeName ||
      claims.participantName ||
      claims.employeeName ||
      'Verified Subject'
    );
  };

  const getCredentialStatus = (cred: ArcVerifiableCredential) => {
    if (cred.blockchainRecord?.status === 'REVOKED') {
      return { label: 'REVOKED', color: 'bg-rose-950 text-rose-300 border-rose-800' };
    }
    if (cred.expirationDate && new Date(cred.expirationDate).getTime() < Date.now()) {
      return { label: 'EXPIRED', color: 'bg-amber-950 text-amber-300 border-amber-800' };
    }
    return { label: 'ACTIVE', color: 'bg-emerald-950 text-emerald-300 border-emerald-800' };
  };

  return (
    <div className="space-y-8">
      {/* Organization Header Dashboard Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-700/50 text-cyan-300 text-xs font-mono flex items-center space-x-1.5">
                <Building className="w-3.5 h-3.5" />
                <span>Organization Dashboard</span>
              </span>

              {isOrgVerified ? (
                <span className="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-mono font-bold flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verified Issuer</span>
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-amber-950 text-amber-300 border border-amber-800 text-xs font-mono font-bold flex items-center space-x-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{session.organization?.status || 'PENDING'} ISSUER</span>
                </span>
              )}

              {canIssue ? (
                <span className="px-2.5 py-1 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 text-xs font-mono">
                  Issuer Key Authorized
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-rose-950 text-rose-300 border border-rose-800 text-xs font-mono font-bold">
                  Wallet Not Authorized
                </span>
              )}
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {session.organization?.name || 'Arc Accredited Authority'}
              </h1>
              <p className="text-slate-400 text-sm max-w-2xl leading-relaxed mt-1">
                {session.organization?.description ||
                  'Official accredited institution anchoring tamper-proof credentials directly to Arc Mainnet smart contracts.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 pt-1">
              <div>
                <span className="text-slate-500">DID:</span>{' '}
                <span className="text-cyan-300 font-semibold">{session.organization?.didUri || `did:arc:${effectiveAddress}`}</span>
              </div>
              <div>
                <span className="text-slate-500">Domain:</span>{' '}
                <span className="text-slate-200">{session.organization?.domain || 'arc.network'}</span>
              </div>
              <div>
                <span className="text-slate-500">Signing Key:</span>{' '}
                <span className="text-slate-200">{effectiveAddress.slice(0, 8)}...{effectiveAddress.slice(-6)}</span>
              </div>
            </div>
          </div>

          {/* Primary Action Button & Simulator Switcher */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            <button
              onClick={onCreateCredentialClick}
              disabled={!isIssuanceAllowed}
              className={`px-6 py-3.5 rounded-xl font-bold text-xs font-mono flex items-center justify-center space-x-2 transition-all shadow-xl ${
                isIssuanceAllowed
                  ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 shadow-cyan-500/20'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-750'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Credential</span>
            </button>

            {!isIssuanceAllowed && (
              <p className="text-[11px] font-mono text-rose-400 text-center max-w-xs">
                {session.organization?.status === 'SUSPENDED'
                  ? 'Organization is SUSPENDED. New credential issuance is halted.'
                  : 'Wallet is not authorized to issue for a verified organization.'}
              </p>
            )}

            {/* Quick Organization Role Switcher (Tests Governance Rules) */}
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-850 font-mono text-[11px] space-y-1.5">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">
                Test Institutional Roles:
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => demoSwitchRole('ORG_ADMIN')}
                  className={`px-2 py-1 rounded text-[10px] border transition-colors ${
                    session.role === 'ORG_ADMIN' && isOrgVerified
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-800 font-bold'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  Verified Issuer
                </button>
                <button
                  type="button"
                  onClick={() => demoSwitchRole('HOLDER')}
                  className={`px-2 py-1 rounded text-[10px] border transition-colors ${
                    session.role === 'HOLDER'
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-800 font-bold'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  Unauthorized Key
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-800/80">
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-850">
            <span className="text-slate-500 text-xs font-mono block">Total Issued</span>
            <span className="text-2xl font-black text-white font-mono">{metrics.total}</span>
          </div>
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-850">
            <span className="text-slate-500 text-xs font-mono block">Active Credentials</span>
            <span className="text-2xl font-black text-emerald-400 font-mono">{metrics.active}</span>
          </div>
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-850">
            <span className="text-slate-500 text-xs font-mono block">Revoked On-Chain</span>
            <span className="text-2xl font-black text-rose-400 font-mono">{metrics.revoked}</span>
          </div>
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-850">
            <span className="text-slate-500 text-xs font-mono block">Network Anchor</span>
            <span className="text-sm font-bold text-cyan-400 font-mono block mt-1">Arc Mainnet</span>
            <span className="text-[10px] text-slate-500 font-mono block">Chain ID: 42424</span>
          </div>
        </div>
      </div>

      {/* Issued Credentials Management Section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Issued Credential Registry
            </h2>
            <p className="text-slate-400 text-xs mt-1">
              Active ledger of all verifiable credentials issued by your authorized institution on Arc Mainnet.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Refresh ledger records"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onCreateCredentialClick}
              disabled={!isIssuanceAllowed}
              className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create Credential</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by recipient, credential ID, schema..."
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 font-mono text-xs">
            {(['All', 'Active', 'Revoked', 'Expired'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  statusFilter === status
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Credentials Table */}
        {loading ? (
          <div className="py-16 text-center text-slate-500 font-mono text-xs space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-400" />
            <p>Querying immutable Arc registry state...</p>
          </div>
        ) : filteredCredentials.length === 0 ? (
          <div className="py-16 text-center rounded-2xl border border-dashed border-slate-800 space-y-3 font-mono">
            <FileText className="w-10 h-10 mx-auto text-slate-600" />
            <div className="text-white text-sm font-bold">No credentials matching filter criteria</div>
            <p className="text-slate-500 text-xs max-w-sm mx-auto">
              {credentials.length === 0
                ? 'No credentials issued yet. Launch the guided issuance wizard to create your first anchor on Arc.'
                : 'Try adjusting your search query or status filter.'}
            </p>
            {credentials.length === 0 && isIssuanceAllowed && (
              <button
                onClick={onCreateCredentialClick}
                className="mt-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl font-bold text-xs"
              >
                Create First Credential
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                  <th className="pb-3 pl-2">Credential Type & ID</th>
                  <th className="pb-3">Recipient / Subject</th>
                  <th className="pb-3">Issue Date</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Arc Anchor Tx</th>
                  <th className="pb-3 pr-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {filteredCredentials.map((cred) => {
                  const status = getCredentialStatus(cred);
                  const recipient = getRecipientName(cred);
                  const shareableUrl = generateVerificationLink(cred);

                  return (
                    <tr key={cred.id} className="hover:bg-slate-950/40 transition-colors group">
                      <td className="py-4 pl-2 space-y-1">
                        <div className="font-bold text-white text-xs flex items-center space-x-2">
                          <span>{cred.schemaName || cred.type?.[1] || 'Credential'}</span>
                        </div>
                        <div className="text-slate-500 text-[10px] truncate max-w-[200px]" title={cred.id}>
                          {cred.id}
                        </div>
                      </td>

                      <td className="py-4 space-y-0.5">
                        <div className="text-slate-200 font-semibold text-xs">{recipient}</div>
                        <div className="text-slate-500 text-[10px] truncate max-w-[160px]" title={cred.credentialSubject.address}>
                          {cred.credentialSubject.address || cred.credentialSubject.id}
                        </div>
                      </td>

                      <td className="py-4 text-slate-400 text-[11px] whitespace-nowrap">
                        <div>{new Date(cred.issuanceDate).toLocaleDateString()}</div>
                        <div className="text-[10px] text-slate-600">
                          {cred.expirationDate ? `Exp: ${new Date(cred.expirationDate).toLocaleDateString()}` : 'Perpetual'}
                        </div>
                      </td>

                      <td className="py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${status.color}`}>
                          {status.label}
                        </span>
                      </td>

                      <td className="py-4 text-slate-400 text-[11px] whitespace-nowrap">
                        {cred.blockchainRecord?.anchorTxHash ? (
                          <div className="flex items-center space-x-1.5 text-cyan-400">
                            <span className="font-mono text-[11px] truncate max-w-[120px]">
                              {cred.blockchainRecord.anchorTxHash.slice(0, 10)}...
                            </span>
                            <a
                              href={`https://explorer.arc.network/tx/${cred.blockchainRecord.anchorTxHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-500 hover:text-cyan-300"
                              title="Inspect on Arc Explorer"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-slate-600 text-[10px]">Anchored</span>
                        )}
                      </td>

                      <td className="py-4 pr-2 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            type="button"
                            onClick={() => setSelectedCredentialForDetail(cred)}
                            className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800"
                            title="Inspect W3C Data Model & Proof"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {onNavigateToVerifier && (
                            <button
                              type="button"
                              onClick={() => onNavigateToVerifier(shareableUrl)}
                              className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 border border-slate-800"
                              title="Verify independently"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleCopyLink(cred)}
                            className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800"
                            title="Copy shareable verification link"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {cred.blockchainRecord?.status !== 'REVOKED' && (
                            <button
                              type="button"
                              onClick={() => setRevokingCredential(cred)}
                              className="p-1.5 rounded-lg bg-slate-950 hover:bg-rose-950/60 text-slate-500 hover:text-rose-400 border border-slate-800 hover:border-rose-800/60 transition-colors"
                              title="Revoke credential on Arc"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      {selectedCredentialForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono text-cyan-400 uppercase font-bold">W3C Credential Inspection</span>
                <h3 className="text-xl font-bold text-white">{selectedCredentialForDetail.schemaName}</h3>
              </div>
              <button
                onClick={() => setSelectedCredentialForDetail(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-850">
                <span className="text-slate-500 text-[10px] block">Credential ID:</span>
                <span className="text-white break-all block">{selectedCredentialForDetail.id}</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-850">
                <span className="text-slate-500 text-[10px] block">Holder DID:</span>
                <span className="text-cyan-300 break-all block">{selectedCredentialForDetail.credentialSubject.id}</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-850">
                <span className="text-slate-500 text-[10px] block">Arc Anchor Tx Hash:</span>
                <span className="text-emerald-400 break-all block">{selectedCredentialForDetail.blockchainRecord?.anchorTxHash}</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-850">
                <span className="text-slate-500 text-[10px] block">Off-Chain Claims Digest:</span>
                <span className="text-slate-300 break-all block">{selectedCredentialForDetail.proof.claimsDigest}</span>
              </div>
            </div>

            <div className="space-y-2 font-mono text-xs">
              <span className="text-slate-400 font-bold">Private Off-Chain Claims:</span>
              <pre className="p-4 bg-slate-950 border border-slate-850 rounded-xl text-cyan-300 overflow-x-auto text-[11px] leading-relaxed">
                {JSON.stringify(selectedCredentialForDetail.credentialSubject.claims, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedCredentialForDetail(null)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-mono"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REVOCATION MODAL */}
      {revokingCredential && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-rose-800/60 rounded-2xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center space-x-3 text-rose-400">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="text-lg font-bold text-white">Revoke Credential on Arc</h3>
            </div>

            <p className="text-slate-400 text-xs font-mono leading-relaxed">
              Revoking marks this credential invalid on the Arc Credential Registry smart contract. Independent verifiers querying the blockchain will instantly reject this credential.
            </p>

            <div className="space-y-2 font-mono text-xs">
              <label className="block text-slate-300 font-semibold">Select Revocation Reason *</label>
              <select
                value={revocationReason}
                onChange={(e) => setRevocationReason(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-rose-500 text-xs"
              >
                <option value="Superseded">Superseded by newer credential</option>
                <option value="AffiliationTerminated">Affiliation / Employment Terminated</option>
                <option value="DisciplinaryAction">Disciplinary Action / Code of Conduct</option>
                <option value="Compromised">Key Compromise / Security Violation</option>
                <option value="RequestedByHolder">Requested by Credential Holder</option>
              </select>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-800 font-mono text-xs">
              <button
                type="button"
                onClick={() => setRevokingCredential(null)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRevoke}
                disabled={revokeStage === 'pending' || revokeStage === 'wallet_interaction'}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center space-x-2 disabled:opacity-50"
              >
                {revokeStage === 'pending' || revokeStage === 'wallet_interaction' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>Confirm Revocation on Arc</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ARC BLOCKCHAIN TRANSACTION MODAL (5 STATES) */}
      <ArcTransactionModal
        isOpen={isTxModalOpen}
        stage={revokeStage}
        stageMessage={revokeStageMessage}
        txHash={revokeTxHash}
        txResult={revokeTxResult}
        error={revokeError}
        actionTitle="Arc Credential Revocation"
        onClose={() => {
          setIsTxModalOpen(false);
          resetRevokeState();
        }}
        onRetry={handleRevoke}
      />
    </div>
  );
}
