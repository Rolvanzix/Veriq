import React, { useState, useEffect } from 'react';
import {
  Building,
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Globe,
  Key,
  UserCheck,
  PlusCircle,
  RefreshCw,
  Search,
  Filter,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { OrganizationInfo, OrgVerificationStatus } from '../../auth/types';
import { OrganizationOnboardingModal } from './OrganizationOnboardingModal';

export function InstitutionalReviewQueue() {
  const [organizations, setOrganizations] = useState<OrganizationInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selectedOrg, setSelectedOrg] = useState<OrganizationInfo | null>(null);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [reviewNoteInput, setReviewNoteInput] = useState('');
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/organizations');
      if (res.ok) {
        const data = await res.json();
        setOrganizations(data);
        if (data.length > 0 && !selectedOrg) {
          setSelectedOrg(data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load organizations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewAction = async (
    status: OrgVerificationStatus,
    rejectionReason?: string
  ) => {
    if (!selectedOrg) return;
    setIsProcessing(true);
    setStatusMessage(null);

    try {
      const res = await fetch(`/api/auth/organizations/${selectedOrg.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          reviewNotes: reviewNoteInput.trim() || undefined,
          rejectionReason: rejectionReason || rejectionReasonInput.trim() || undefined,
          reviewerName: 'Arc Institutional Accreditation Board',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update institutional review status');
      }

      setStatusMessage(`Organization ${selectedOrg.name} status updated to: ${status}`);
      setSelectedOrg(data.organization);
      fetchOrganizations();
    } catch (err: any) {
      setStatusMessage(err.message || 'Operation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredOrgs = organizations.filter((org) => {
    if (filterStatus === 'ALL') return true;
    return org.status === filterStatus;
  });

  const getStatusBadge = (status: OrgVerificationStatus) => {
    switch (status) {
      case 'VERIFIED':
        return { label: 'Verified Issuer', color: 'bg-emerald-950 text-emerald-300 border-emerald-800' };
      case 'UNDER_REVIEW':
        return { label: 'Under Review', color: 'bg-cyan-950 text-cyan-300 border-cyan-800' };
      case 'PENDING':
        return { label: 'Pending Domain Check', color: 'bg-amber-950 text-amber-300 border-amber-800' };
      case 'SUSPENDED':
        return { label: 'Suspended', color: 'bg-rose-950 text-rose-300 border-rose-800' };
      case 'REJECTED':
        return { label: 'Rejected', color: 'bg-slate-850 text-slate-400 border-slate-700' };
      case 'REVOKED':
        return { label: 'Permanently Revoked', color: 'bg-slate-900 text-slate-400 border-slate-700' };
      default:
        return { label: status, color: 'bg-slate-900 text-slate-300 border-slate-700' };
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner & Security Principle */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-700/50 text-cyan-300 text-xs font-mono">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Institutional Accreditation & Verification</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Organization Verification & Review Queue
            </h1>
            <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
              Verify organizations through official domain-control proofs and authorized representative signatures. Only approved organizations can issue trusted credentials on Arc Mainnet.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsOnboardingModalOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold rounded-xl text-xs font-mono flex items-center space-x-2 shadow-lg shadow-cyan-500/20 whitespace-nowrap self-start md:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Onboard New Organization</span>
          </button>
        </div>

        {/* Security Principle Callout */}
        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-start space-x-3 text-xs">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="text-white block font-sans">
              ARC Verify Trust Invariant:
            </strong>
            <p className="text-slate-400 leading-relaxed font-sans">
              Blockchain consensus records immutable issuer registries and hashes, but <strong>does not intrinsically prove that a real-world legal entity is legitimate</strong>. ARC Verify establishes verified domain-control, authenticated legal representative signatures, and governance audit before conferring Verified Issuer status.
            </p>
          </div>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Organization Directory List */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Building className="w-4 h-4 text-cyan-400" />
              <span>Organizations ({filteredOrgs.length})</span>
            </h2>

            <button
              onClick={fetchOrganizations}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-mono flex items-center space-x-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh</span>
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
            {['ALL', 'VERIFIED', 'UNDER_REVIEW', 'PENDING', 'REJECTED'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStatus(st)}
                className={`px-2.5 py-1 rounded-lg border transition-colors ${
                  filterStatus === st
                    ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 font-semibold'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl text-xs font-mono text-slate-500">
              Loading organization records...
            </div>
          ) : filteredOrgs.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl text-xs text-slate-500">
              No organizations found matching filter '{filterStatus}'.
            </div>
          ) : (
            <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
              {filteredOrgs.map((org) => {
                const badge = getStatusBadge(org.status);
                const isSelected = selectedOrg?.id === org.id;

                return (
                  <div
                    key={org.id}
                    onClick={() => setSelectedOrg(org)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-2.5 ${
                      isSelected
                        ? 'bg-slate-900 border-cyan-500 shadow-md shadow-cyan-500/10'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-white text-sm">{org.name}</div>
                        <div className="text-[11px] font-mono text-slate-400 flex items-center space-x-1.5 mt-0.5">
                          <Globe className="w-3 h-3 text-cyan-400" />
                          <span>{org.domain}</span>
                          <span>•</span>
                          <span>{org.country}</span>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-850 flex items-center justify-between text-[11px] font-mono text-slate-500">
                      <span>Type: {org.orgType.split('/')[0]}</span>
                      <span>Credentials: {org.credentialCount}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detailed Organization Inspection & Review Actions */}
        <div className="lg:col-span-7">
          {selectedOrg ? (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider font-semibold">
                      {selectedOrg.orgType}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-xs text-slate-400">{selectedOrg.country}</span>
                  </div>
                  <h2 className="text-xl font-bold text-white">{selectedOrg.name}</h2>
                  <p className="text-slate-400 text-xs max-w-md">{selectedOrg.description}</p>
                </div>

                <div className="text-right space-y-1">
                  <span className={`px-2.5 py-1 rounded font-mono text-xs font-bold border ${getStatusBadge(selectedOrg.status).color}`}>
                    {selectedOrg.status}
                  </span>
                  <div className="text-[11px] font-mono text-slate-500">DID: {selectedOrg.didUri}</div>
                </div>
              </div>

              {/* Status Message */}
              {statusMessage && (
                <div className="p-3 bg-cyan-950/40 border border-cyan-800/60 rounded-xl text-cyan-300 text-xs font-mono">
                  {statusMessage}
                </div>
              )}

              {/* 3 Core Verification Pillars */}
              <div className="space-y-4">
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                  Verification Audit Evidence (3 Pillars)
                </h3>

                {/* Pillar 1: Domain-Control Proof */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-white font-semibold font-sans">
                      <Globe className="w-4 h-4 text-cyan-400" />
                      <span>1. Domain-Control Verification</span>
                    </div>

                    {selectedOrg.domainVerification.isVerified ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>VERIFIED ✓</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-bold">
                        UNVERIFIED
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 text-slate-400 text-[11px] pt-1">
                    <div>• Domain: <strong className="text-white">{selectedOrg.domain}</strong></div>
                    <div>• Method: {selectedOrg.domainVerification.method === 'WELL_KNOWN_FILE' ? 'Well-Known File (/.well-known/arc-verify.json)' : 'DNS TXT Record'}</div>
                    <div className="break-all">• Challenge Token: <span className="text-cyan-300">{selectedOrg.domainVerification.challengeToken}</span></div>
                    {selectedOrg.domainVerification.verifiedAt && (
                      <div className="text-emerald-400">• Confirmed At: {new Date(selectedOrg.domainVerification.verifiedAt).toLocaleString()}</div>
                    )}
                  </div>
                </div>

                {/* Pillar 2: Authorized Representative Verification */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-white font-semibold font-sans">
                      <UserCheck className="w-4 h-4 text-cyan-400" />
                      <span>2. Authorized Representative Identity</span>
                    </div>

                    {selectedOrg.representative.isVerified ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>AUTHENTICATED ✓</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-bold">
                        PENDING SIGNATURE
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 text-slate-400 text-[11px] pt-1">
                    <div>• Representative: <strong className="text-white">{selectedOrg.representative.fullName}</strong> ({selectedOrg.representative.title})</div>
                    <div>• Official Work Email: <strong className="text-cyan-300">{selectedOrg.representative.officialEmail}</strong> (Matches @{selectedOrg.domain} ✓)</div>
                    <div>• Bound EVM Address: <span className="text-slate-300">{selectedOrg.representative.walletAddress}</span></div>
                    {selectedOrg.representative.signature && (
                      <div className="break-all text-[10px] text-slate-500">• ECDSA Signature: {selectedOrg.representative.signature.slice(0, 36)}...</div>
                    )}
                  </div>
                </div>

                {/* Pillar 3: Designated Issuer Wallet Association */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-white font-semibold font-sans">
                      <Key className="w-4 h-4 text-cyan-400" />
                      <span>3. Designated Arc Issuer Wallet</span>
                    </div>

                    <span className="text-slate-500 text-[10px]">
                      Separated from Personal Wallet Identity
                    </span>
                  </div>

                  <div className="space-y-1 text-slate-400 text-[11px] pt-1">
                    <div>• Designated Issuer Wallet Address:</div>
                    <div className="text-cyan-400 break-all bg-slate-900 p-2 rounded border border-slate-850">
                      {selectedOrg.issuerWalletAddress}
                    </div>
                    <p className="text-[10px] text-slate-500 pt-0.5 font-sans">
                      This address is authorized to sign and anchor verifiable credentials on Arc Mainnet only when this organization's status is VERIFIED.
                    </p>
                  </div>
                </div>
              </div>

              {/* Review History / Notes if present */}
              {selectedOrg.reviewNotes && (
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1 text-xs font-mono">
                  <span className="text-slate-500 text-[11px]">Accreditation Board Notes:</span>
                  <div className="text-slate-300">{selectedOrg.reviewNotes}</div>
                  <div className="text-[10px] text-slate-500">
                    Reviewed by {selectedOrg.reviewedBy} at {selectedOrg.reviewedAt ? new Date(selectedOrg.reviewedAt).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              )}

              {/* Institutional Review & Governance Action Panel */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                  Institutional Governance Actions
                </h3>

                <div className="flex flex-wrap items-center gap-3">
                  {selectedOrg.status !== 'VERIFIED' && (
                    <button
                      type="button"
                      disabled={isProcessing || !selectedOrg.domainVerification.isVerified}
                      onClick={() => handleReviewAction('VERIFIED')}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-slate-950 font-bold text-xs font-mono flex items-center space-x-1.5 transition-all shadow-md shadow-emerald-500/20"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve as Verified Issuer</span>
                    </button>
                  )}

                  {selectedOrg.status === 'VERIFIED' && (
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleReviewAction('SUSPENDED')}
                      className="px-4 py-2.5 rounded-xl bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800 text-xs font-mono font-semibold transition-colors"
                    >
                      Suspend Issuance Authority
                    </button>
                  )}

                  {selectedOrg.status !== 'REJECTED' && (
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => {
                        const reason = prompt('Please enter rejection reason (e.g., Unaccredited institution, domain control failure):');
                        if (reason) {
                          handleReviewAction('REJECTED', reason);
                        }
                      }}
                      className="px-4 py-2.5 rounded-xl bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-mono font-semibold transition-colors"
                    >
                      Reject Application
                    </button>
                  )}

                  {selectedOrg.status === 'REJECTED' && (
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleReviewAction('UNDER_REVIEW')}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-semibold transition-colors"
                    >
                      Reopen for Manual Review
                    </button>
                  )}
                </div>

                {!selectedOrg.domainVerification.isVerified && selectedOrg.status !== 'VERIFIED' && (
                  <p className="text-[11px] text-amber-400 font-mono">
                    * Cannot approve as Verified Issuer until domain-control verification is completed.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl text-xs text-slate-500">
              Select an organization from the list to inspect domain-control proofs and institutional review history.
            </div>
          )}
        </div>
      </div>

      {/* Onboarding Modal */}
      <OrganizationOnboardingModal
        isOpen={isOnboardingModalOpen}
        onClose={() => setIsOnboardingModalOpen(false)}
        onSuccess={(newOrg) => {
          fetchOrganizations();
          setSelectedOrg(newOrg);
          setIsOnboardingModalOpen(false);
        }}
      />
    </div>
  );
}
