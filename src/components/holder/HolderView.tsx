import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  QrCode,
  Share2,
  Copy,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Building,
  Key,
  Download,
  Eye,
  RefreshCw,
  FileText,
  Lock,
  Sparkles,
  Layers,
  ChevronRight,
  Filter,
  Search,
  UserCheck,
  Wallet,
  Clock,
  Printer,
  XCircle,
  PauseCircle,
  Check,
  Award,
} from 'lucide-react';
import { useAccount, useConnect } from 'wagmi';
import { QRCodeSVG } from 'qrcode.react';
import { resolveCredentialStatus, type HolderCredentialStatusType } from './holderStatus';
import { CredentialCertificate } from './CredentialCertificate';
import { ShareVerificationModal } from './ShareVerificationModal';
import { generateVerificationLink } from '../../verification/qr';
import type { ArcVerifiableCredential } from '../../verification/types';
import { CANONICAL_CREDENTIAL_TYPES } from '../../verification/credential-types';
import { ARC_ISOLATED_CONFIG } from '../../blockchain/arcNetwork';

interface HolderViewProps {
  currentAddress?: string;
  onNavigateToVerifier?: (payloadUrl: string) => void;
}

const SAMPLE_IDENTITIES = [
  {
    name: 'Alex Vance (Primary Holder & Protocol Fellow)',
    address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    role: 'Principal Cryptographic Engineer',
  },
  {
    name: 'Elena Rostova (Academic Fellow & Researcher)',
    address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    role: 'Visiting Cryptography Fellow',
  },
  {
    name: 'Devon Miller (VIP Delegate & Consortium Member)',
    address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    role: 'Consortium Signatory',
  },
];

export function HolderView({ currentAddress, onNavigateToVerifier }: HolderViewProps) {
  const { address: wagmiAddress, isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  // Active holder identity
  const [selectedAddress, setSelectedAddress] = useState(
    currentAddress || wagmiAddress || SAMPLE_IDENTITIES[0].address
  );

  const [credentials, setCredentials] = useState<ArcVerifiableCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCredential, setSelectedCredential] = useState<ArcVerifiableCredential | null>(null);
  const [viewFormat, setViewFormat] = useState<'certificate' | 'list'>('certificate');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRING' | 'SUSPENDED' | 'REVOKED'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Education' | 'Events' | 'Achievement' | 'Governance' | 'Professional'>('All');

  // Modals
  const [sharingCredential, setSharingCredential] = useState<ArcVerifiableCredential | null>(null);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Sync if wagmiAddress or currentAddress changes
  useEffect(() => {
    if (currentAddress) {
      setSelectedAddress(currentAddress);
    } else if (wagmiAddress && !currentAddress) {
      setSelectedAddress(wagmiAddress);
    }
  }, [currentAddress, wagmiAddress]);

  useEffect(() => {
    fetchHolderCredentials();
  }, [selectedAddress]);

  const fetchHolderCredentials = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/credentials/by-subject/${selectedAddress}`);
      if (res.ok) {
        const data: ArcVerifiableCredential[] = await res.json();
        setCredentials(data);
        if (data.length > 0) {
          // Keep current selection or default to first
          setSelectedCredential((prev) => {
            if (prev && data.some((c) => c.id === prev.id)) {
              return data.find((c) => c.id === prev.id)!;
            }
            return data[0];
          });
        } else {
          setSelectedCredential(null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch holder credentials:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectWallet = () => {
    const injected = connectors[0];
    if (injected) {
      connect({ connector: injected });
    }
  };

  // Metrics computation for the 4 required statuses
  const metrics = useMemo(() => {
    let active = 0;
    let expiring = 0;
    let suspended = 0;
    let revoked = 0;

    for (const cred of credentials) {
      const s = resolveCredentialStatus(cred);
      if (s.type === 'ACTIVE') active++;
      else if (s.type === 'EXPIRING' || s.type === 'EXPIRED') expiring++;
      else if (s.type === 'SUSPENDED') suspended++;
      else if (s.type === 'REVOKED') revoked++;
    }

    return {
      total: credentials.length,
      active,
      expiring,
      suspended,
      revoked,
    };
  }, [credentials]);

  // Filtered credentials list
  const filteredCredentials = useMemo(() => {
    return credentials.filter((cred) => {
      const status = resolveCredentialStatus(cred);

      // Status filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'ACTIVE' && status.type !== 'ACTIVE') return false;
        if (statusFilter === 'EXPIRING' && status.type !== 'EXPIRING' && status.type !== 'EXPIRED') return false;
        if (statusFilter === 'SUSPENDED' && status.type !== 'SUSPENDED') return false;
        if (statusFilter === 'REVOKED' && status.type !== 'REVOKED') return false;
      }

      // Category filter
      if (categoryFilter !== 'All') {
        const typeDef = CANONICAL_CREDENTIAL_TYPES.find(
          (t) => t.schemaId === cred.schemaId || t.vcType === cred.type?.[1]
        );
        if (typeDef?.category !== categoryFilter) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const schema = (cred.schemaName || '').toLowerCase();
        const issuer = (cred.issuer.name || '').toLowerCase();
        const id = (cred.id || '').toLowerCase();
        const claims = cred.credentialSubject.claims as any;
        const name = String(claims?.recipientName || claims?.studentName || claims?.attendeeName || claims?.memberName || '').toLowerCase();

        return schema.includes(query) || issuer.includes(query) || id.includes(query) || name.includes(query);
      }

      return true;
    });
  }, [credentials, statusFilter, categoryFilter, searchQuery]);

  const handleCopyLink = (cred: ArcVerifiableCredential) => {
    const url = generateVerificationLink(cred);
    navigator.clipboard.writeText(url);
    setCopiedLink(cred.id);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Identity & Wallet Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0d1627] to-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-700/50 text-cyan-300 text-xs font-mono">
              <UserCheck className="w-3.5 h-3.5" />
              <span>Holder Wallet Experience</span>
              <span className="w-1 h-1 rounded-full bg-cyan-500" />
              <span className="text-slate-400">Arc Mainnet (42424)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              My Credentials
            </h1>
            <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
              Connect your wallet to inspect, present, and share verifiable credentials associated with your sovereign identity. Private personal claims remain sealed off-chain while non-repudiation is anchored on Arc.
            </p>
          </div>

          {/* Identity & Wallet Control Box */}
          <div className="bg-slate-950/90 border border-slate-800 p-4 sm:p-5 rounded-2xl font-mono text-xs space-y-3 shrink-0 lg:max-w-md w-full">
            <div className="flex items-center justify-between pb-2 border-b border-slate-850">
              <span className="text-slate-400 font-semibold flex items-center space-x-1.5">
                <Wallet className="w-3.5 h-3.5 text-cyan-400" />
                <span>Holder Identity (DID)</span>
              </span>
              {isConnected ? (
                <span className="flex items-center space-x-1 text-emerald-400 text-[11px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Wallet Connected</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectWallet}
                  className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[11px] font-bold transition-colors"
                >
                  Connect Wallet
                </button>
              )}
            </div>

            <div className="space-y-1">
              <div className="text-[11px] text-slate-500">Active Subject Address:</div>
              <div className="text-white font-bold break-all bg-slate-900/90 p-2 rounded-lg border border-slate-800 text-[11px]">
                {selectedAddress}
              </div>
            </div>

            {/* Quick Demo Holder Selector */}
            <div className="space-y-1 pt-1">
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Switch Holder Identity:</div>
              <select
                value={selectedAddress}
                onChange={(e) => setSelectedAddress(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-slate-200 text-[11px] outline-none focus:ring-1 focus:ring-cyan-500"
              >
                {SAMPLE_IDENTITIES.map((id) => (
                  <option key={id.address} value={id.address}>
                    {id.name}
                  </option>
                ))}
                {wagmiAddress && !SAMPLE_IDENTITIES.some((id) => id.address.toLowerCase() === wagmiAddress.toLowerCase()) && (
                  <option value={wagmiAddress}>Connected Wallet ({wagmiAddress.slice(0, 8)}...)</option>
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Status Metrics Bar (Explicitly displays the 4 required statuses) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-6 mt-6 border-t border-slate-800/80 font-mono text-xs">
          <div
            onClick={() => setStatusFilter('ALL')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              statusFilter === 'ALL'
                ? 'bg-slate-800/90 border-cyan-500/80 shadow-sm'
                : 'bg-slate-950/60 border-slate-850 hover:border-slate-750'
            }`}
          >
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Total Credentials</span>
            <span className="text-lg font-bold text-white">{metrics.total}</span>
          </div>

          <div
            onClick={() => setStatusFilter('ACTIVE')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              statusFilter === 'ACTIVE'
                ? 'bg-emerald-950/80 border-emerald-500 shadow-sm'
                : 'bg-slate-950/60 border-slate-850 hover:border-emerald-800/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-emerald-400 text-[10px] uppercase font-bold">✓ Active</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <span className="text-lg font-bold text-emerald-300">{metrics.active}</span>
          </div>

          <div
            onClick={() => setStatusFilter('EXPIRING')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              statusFilter === 'EXPIRING'
                ? 'bg-amber-950/80 border-amber-500 shadow-sm'
                : 'bg-slate-950/60 border-slate-850 hover:border-amber-800/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-amber-400 text-[10px] uppercase font-bold">⚠ Expiring/Expired</span>
              <AlertTriangle className="w-3 h-3 text-amber-400" />
            </div>
            <span className="text-lg font-bold text-amber-300">{metrics.expiring}</span>
          </div>

          <div
            onClick={() => setStatusFilter('SUSPENDED')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              statusFilter === 'SUSPENDED'
                ? 'bg-slate-900 border-slate-400 shadow-sm'
                : 'bg-slate-950/60 border-slate-850 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-slate-300 text-[10px] uppercase font-bold">⏸ Suspended</span>
              <PauseCircle className="w-3 h-3 text-slate-400" />
            </div>
            <span className="text-lg font-bold text-slate-200">{metrics.suspended}</span>
          </div>

          <div
            onClick={() => setStatusFilter('REVOKED')}
            className={`col-span-2 sm:col-span-1 p-3 rounded-xl border cursor-pointer transition-all ${
              statusFilter === 'REVOKED'
                ? 'bg-rose-950/80 border-rose-500 shadow-sm'
                : 'bg-slate-950/60 border-slate-850 hover:border-rose-800/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-rose-400 text-[10px] uppercase font-bold">✕ Revoked</span>
              <XCircle className="w-3 h-3 text-rose-400" />
            </div>
            <span className="text-lg font-bold text-rose-300">{metrics.revoked}</span>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Credential Inventory & Filter Controls */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span>Credentials In Wallet ({filteredCredentials.length})</span>
            </h2>

            <button
              type="button"
              onClick={fetchHolderCredentials}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-mono flex items-center space-x-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by title, issuer, or recipient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-1 text-[11px] font-mono">
            {(['All', 'Education', 'Events', 'Achievement', 'Governance', 'Professional'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
                  categoryFilter === cat
                    ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-800'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-900/60 border border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Credential Cards List */}
          {loading ? (
            <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl text-xs font-mono text-slate-500 space-y-2">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-cyan-400" />
              <p>Querying Arc Mainnet and off-chain claims...</p>
            </div>
          ) : filteredCredentials.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
              <Shield className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">No credentials match filter criteria</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Try clearing search query or switching identity, or issue a new credential in the Issuer Portal.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCredentials.map((cred) => {
                const isSelected = selectedCredential?.id === cred.id;
                const status = resolveCredentialStatus(cred);
                const credType = cred.type?.find((t) => t !== 'VerifiableCredential') || 'Credential';

                return (
                  <div
                    key={cred.id}
                    onClick={() => setSelectedCredential(cred)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-slate-900/90 border-cyan-500/90 shadow-lg shadow-cyan-950/20'
                        : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-slate-800 text-slate-300 border border-slate-700">
                            {credType.replace('Credential', '')}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-white pt-0.5">{cred.schemaName}</h3>
                        <div className="text-xs text-slate-400 flex items-center space-x-1.5">
                          <Building className="w-3.5 h-3.5 text-slate-500" />
                          <span className="truncate max-w-[200px]">{cred.issuer.name}</span>
                        </div>
                      </div>

                      {/* Status Stamp with the 4 symbols */}
                      <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded font-bold shrink-0 ${status.pillClass}`}>
                        {status.label}
                      </span>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center space-x-1 font-mono text-[11px]">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>{new Date(cred.issuanceDate).toLocaleDateString()}</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyLink(cred);
                          }}
                          className="flex items-center space-x-1 text-slate-400 hover:text-white text-xs py-1 px-2 rounded hover:bg-slate-800"
                          title="Copy Public Verification Link"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedLink === cred.id ? 'Copied' : 'Link'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSharingCredential(cred);
                          }}
                          className="flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 font-semibold text-xs py-1 px-2.5 rounded bg-cyan-950/60 hover:bg-cyan-950 border border-cyan-800/60"
                        >
                          <Share2 className="w-3 h-3" />
                          <span>Share QR</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Selected Credential Detail & Digital Certificate Card */}
        <div className="lg:col-span-7 space-y-4">
          {selectedCredential ? (
            <div className="space-y-4">
              {/* Certificate vs Detail Format Switcher */}
              <div className="flex items-center justify-between bg-slate-900/60 p-2 rounded-xl border border-slate-800 font-mono text-xs">
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => setViewFormat('certificate')}
                    className={`px-3 py-1.5 rounded-lg transition-colors font-semibold flex items-center space-x-1.5 ${
                      viewFormat === 'certificate'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Official Certificate Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewFormat('list')}
                    className={`px-3 py-1.5 rounded-lg transition-colors font-semibold flex items-center space-x-1.5 ${
                      viewFormat === 'list'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Detailed Technical Audit</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setSharingCredential(selectedCredential)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold transition-colors shadow-sm"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share Verification Link</span>
                </button>
              </div>

              {/* View 1: Professional Digital Certificate Card */}
              {viewFormat === 'certificate' ? (
                <CredentialCertificate
                  credential={selectedCredential}
                  onShareClick={() => setSharingCredential(selectedCredential)}
                  onNavigateToVerifier={onNavigateToVerifier}
                />
              ) : (
                /* View 2: Detailed Technical Audit & W3C Data Model Inspection */
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-800">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono text-cyan-400 uppercase font-bold">
                          W3C Verifiable Credential v2.0
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="text-xs font-mono text-slate-400">
                          {selectedCredential.type?.find((t) => t !== 'VerifiableCredential') || 'Credential'}
                        </span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold text-white">{selectedCredential.schemaName}</h2>
                      <div className="text-xs text-slate-400 flex items-center space-x-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-500" />
                        <span>Issued by {selectedCredential.issuer.name}</span>
                        <span>•</span>
                        <span className="font-mono text-cyan-300">{selectedCredential.issuer.address.slice(0, 8)}...</span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1 rounded-xl text-xs font-mono font-bold ${resolveCredentialStatus(selectedCredential).badgeClass}`}>
                        {resolveCredentialStatus(selectedCredential).label}
                      </span>
                    </div>
                  </div>

                  {/* Identifiers Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-950 rounded-xl border border-slate-850 font-mono text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Credential ID</span>
                      <span className="text-white break-all">{selectedCredential.id}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Holder Subject (DID)</span>
                      <span className="text-cyan-300 break-all">{selectedCredential.credentialSubject.id}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Issue Date</span>
                      <span className="text-slate-200">{new Date(selectedCredential.issuanceDate).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Expiration Date</span>
                      <span className="text-slate-200">
                        {selectedCredential.expirationDate
                          ? new Date(selectedCredential.expirationDate).toLocaleString()
                          : 'Perpetual (No Expiration)'}
                      </span>
                    </div>
                  </div>

                  {/* Private Verified Claims */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-300 font-bold uppercase tracking-wider flex items-center space-x-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Private Verified Claims (Sealed Off-Chain)</span>
                      </span>
                      <span className="text-emerald-400 text-[11px]">RFC 8785 Sealed Digest</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs">
                      {Object.entries(selectedCredential.credentialSubject.claims).map(([key, val]) => (
                        <div key={key} className="space-y-0.5">
                          <span className="text-slate-500 text-[11px] capitalize">
                            {key.replace(/([A-Z])/g, ' $1')}
                          </span>
                          <div className="text-slate-200 font-medium break-all">
                            {typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* On-Chain Arc Mainnet Anchor */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold flex items-center space-x-1.5">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      <span>Arc Mainnet On-Chain Anchor Verification</span>
                    </h3>

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-2.5 font-mono">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-850">
                        <span className="text-slate-500">Credential Digest Hash:</span>
                        <span className="text-cyan-400 break-all">{selectedCredential.proof.credentialHash}</span>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-850">
                        <span className="text-slate-500">Claims RFC 8785 Digest:</span>
                        <span className="text-slate-300 break-all">{selectedCredential.proof.claimsDigest}</span>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-850">
                        <span className="text-slate-500">Arc Mainnet Anchor Tx:</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-emerald-400 break-all">{selectedCredential.blockchainRecord?.anchorTxHash}</span>
                          {selectedCredential.blockchainRecord?.anchorTxHash && (
                            <a
                              href={`${ARC_ISOLATED_CONFIG.explorerUrl}/tx/${selectedCredential.blockchainRecord.anchorTxHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-cyan-400 hover:text-cyan-300 inline-flex items-center space-x-0.5"
                            >
                              <span>ArcScan</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="text-slate-500">Issuer EIP-712 Signature:</span>
                        <span className="text-slate-400 truncate max-w-xs">{selectedCredential.proof.proofValue}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs font-mono">
                    <button
                      type="button"
                      onClick={() => setShowPrivacyModal(true)}
                      className="text-purple-400 hover:text-purple-300 flex items-center space-x-1"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Inspect Selective Disclosure Blinding</span>
                    </button>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(selectedCredential, null, 2));
                          const downloadAnchor = document.createElement('a');
                          downloadAnchor.setAttribute('href', dataStr);
                          downloadAnchor.setAttribute('download', `arc-credential-${selectedCredential.id.slice(-8)}.json`);
                          document.body.appendChild(downloadAnchor);
                          downloadAnchor.click();
                          downloadAnchor.remove();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
                      >
                        Download JSON
                      </button>

                      <button
                        type="button"
                        onClick={() => setSharingCredential(selectedCredential)}
                        className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
                      >
                        Share Verification Link
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-12 bg-slate-900/40 border border-slate-800 rounded-2xl text-center text-slate-500 text-xs">
              Select a credential from the list to view its official digital certificate and verification details.
            </div>
          )}
        </div>
      </div>

      {/* Share & Verification Presentation Modal (No-Wallet Public Link) */}
      <ShareVerificationModal
        isOpen={Boolean(sharingCredential)}
        credential={sharingCredential}
        onClose={() => setSharingCredential(null)}
        onNavigateToVerifier={onNavigateToVerifier}
      />

      {/* Selective Disclosure Preparation Modal */}
      {showPrivacyModal && selectedCredential && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-800/80 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Lock className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-white text-base">Selective Disclosure Model</h3>
              </div>
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              The ARC Verify credential model is prepared for <strong>selective disclosure</strong>. Each claim field has an individual blinded cryptographic commitment, enabling future presentation of a subset of claims without disclosing unneeded private attributes.
            </p>

            <div className="space-y-2.5 font-mono text-xs max-h-60 overflow-y-auto pr-1">
              {Object.entries(selectedCredential.credentialSubject.claims).map(([key, val]) => (
                <div key={key} className="p-2.5 bg-slate-950 rounded-xl border border-slate-850 space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="font-bold text-white">{key}</span>
                    <span className="text-[10px] text-purple-400">Blinded Leaf</span>
                  </div>
                  <div className="text-[11px] text-slate-300 truncate">Value: {String(val)}</div>
                  <div className="text-[10px] text-slate-500 truncate">
                    Salted Hash: {selectedCredential.proof.disclosureCommitment?.claimHashes[key] || '0x...'}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-850 text-xs text-slate-400 space-y-1">
              <strong className="text-white block font-sans">Anchored Verification Invariant:</strong>
              <p className="text-[11px] leading-relaxed">
                The overall <strong className="text-cyan-300">claimsDigest</strong> anchored on Arc Mainnet binds all claims together deterministically. Verifiers can verify any individual claim against this digest without seeing the rest.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
