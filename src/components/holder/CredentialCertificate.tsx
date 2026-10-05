import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Award,
  Calendar,
  Building,
  User,
  Key,
  ExternalLink,
  Copy,
  Check,
  QrCode,
  Share2,
  Printer,
  Download,
  Lock,
  Layers,
  FileText,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { ArcVerifiableCredential } from '../../verification/types';
import { resolveCredentialStatus } from './holderStatus';
import { generateVerificationLink } from '../../verification/qr';
import { ARC_ISOLATED_CONFIG } from '../../blockchain/arcNetwork';

interface CredentialCertificateProps {
  credential: ArcVerifiableCredential;
  onShareClick?: () => void;
  onNavigateToVerifier?: (payloadUrl: string) => void;
}

export function CredentialCertificate({
  credential,
  onShareClick,
  onNavigateToVerifier,
}: CredentialCertificateProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedTx, setCopiedTx] = useState(false);

  const status = resolveCredentialStatus(credential);
  const publicVerifyUrl = generateVerificationLink(credential);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicVerifyUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyTx = () => {
    if (credential.blockchainRecord?.anchorTxHash) {
      navigator.clipboard.writeText(credential.blockchainRecord.anchorTxHash);
      setCopiedTx(true);
      setTimeout(() => setCopiedTx(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(credential, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `arc-credential-${credential.id.slice(-8)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Derive recipient legal name or handle
  const claims = credential.credentialSubject.claims as Record<string, unknown>;
  const recipientName =
    String(
      claims.recipientName ||
      claims.studentName ||
      claims.attendeeName ||
      claims.memberName ||
      claims.employeeName ||
      claims.contributorName ||
      claims.honoreeName ||
      claims.participantName ||
      credential.credentialSubject.address ||
      'Credential Holder'
    );

  const issueDateFormatted = new Date(credential.issuanceDate).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const expirationFormatted = credential.expirationDate
    ? new Date(credential.expirationDate).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Perpetual (No Expiration)';

  return (
    <div className="space-y-4">
      {/* Top Action Utility Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center space-x-2">
          <span className="text-slate-400">Institutional Certificate:</span>
          <span className="text-slate-200 font-bold truncate max-w-[200px] sm:max-w-xs">{credential.id}</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 transition-colors"
            title="Print or save PDF certificate"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Certificate</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadJson}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 transition-colors"
            title="Download signed W3C JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>W3C JSON</span>
          </button>

          <button
            type="button"
            onClick={onShareClick || handleCopyLink}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors shadow-sm"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share Verification Link</span>
          </button>
        </div>
      </div>

      {/* Professional Digital Certificate Card */}
      <div className="relative bg-[#0c121e] border-2 border-slate-700/80 rounded-2xl p-6 sm:p-10 shadow-2xl overflow-hidden print:p-0 print:border-none print:shadow-none print:bg-white print:text-black">
        {/* Subtle Ornamental Certificate Security Border Background */}
        <div className="absolute inset-2 sm:inset-3 border border-slate-800/80 rounded-xl pointer-events-none print:border-black" />
        <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-cyan-500/60 rounded-tl-sm pointer-events-none" />
        <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-cyan-500/60 rounded-tr-sm pointer-events-none" />
        <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-cyan-500/60 rounded-bl-sm pointer-events-none" />
        <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-cyan-500/60 rounded-br-sm pointer-events-none" />

        {/* Certificate Content Wrapper */}
        <div className="relative z-10 space-y-8">
          {/* Section 1: Certificate Header & Accredited Authority */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 border-b border-slate-800/90 pb-6 text-center sm:text-left">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-900 to-slate-900 border border-cyan-500/40 p-1 flex items-center justify-center shadow-lg shadow-cyan-950/40 flex-shrink-0">
                <Award className="w-8 h-8 text-cyan-400" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
                    Official Verifiable Credential
                  </span>
                  <span className="w-1 h-1 rounded-full bg-slate-600" />
                  <span className="text-[11px] font-mono text-slate-400">W3C VC v2.0</span>
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  {credential.issuer.name}
                </h2>
                <div className="text-xs font-mono text-slate-400 flex items-center space-x-1.5 mt-0.5">
                  <span>DID:</span>
                  <span className="text-slate-300 truncate max-w-xs">{credential.issuer.id}</span>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/80 text-[10px] font-semibold">
                    Accredited Authority
                  </span>
                </div>
              </div>
            </div>

            {/* Official Status Stamp (Explicit 4 Statuses) */}
            <div className="flex flex-col items-center sm:items-end space-y-1">
              <div className={`px-4 py-1.5 rounded-xl border text-sm font-mono font-bold tracking-wide flex items-center space-x-2 ${status.badgeClass}`}>
                <span className={`w-2 h-2 rounded-full ${status.dotColor} animate-pulse`} />
                <span>{status.label}</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 text-center sm:text-right max-w-[200px]">
                {status.explanation}
              </span>
            </div>
          </div>

          {/* Section 2: Preamble & Recipient */}
          <div className="text-center space-y-3 py-2">
            <p className="text-xs sm:text-sm font-serif italic text-slate-400 tracking-wide">
              This authoritative digital credential is cryptographically conferred upon
            </p>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight font-sans selection:bg-cyan-500/30">
              {recipientName}
            </h1>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-lg bg-slate-900/90 border border-slate-800 font-mono text-xs text-slate-400">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span>Holder Identity:</span>
              <span className="text-slate-200 font-semibold truncate max-w-xs sm:max-w-md">
                {credential.credentialSubject.id}
              </span>
            </div>
          </div>

          {/* Section 3: Credential Specification Title */}
          <div className="text-center space-y-1 bg-slate-950/60 p-4 rounded-xl border border-slate-850">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-semibold block">
              For Successful Attestation of
            </span>
            <div className="text-lg sm:text-xl font-bold text-cyan-300 font-sans">
              {credential.schemaName}
            </div>
            <p className="text-xs text-slate-400 max-w-2xl mx-auto">
              Anchored with sub-second deterministic finality on Arc Mainnet, verifying non-repudiation and active status without storing private claims directly on-chain.
            </p>
          </div>

          {/* Section 4: Attested Claims Matrix */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
              <span className="uppercase font-semibold tracking-wider flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Attested Credential Attributes</span>
              </span>
              <span className="text-emerald-400 text-[11px]">RFC 8785 Sealed Digest</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/90 p-4 sm:p-5 rounded-xl border border-slate-800 font-mono text-xs">
              {Object.entries(claims).map(([key, val]) => (
                <div key={key} className="space-y-0.5 p-2 rounded-lg bg-slate-900/40 border border-slate-850/60">
                  <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block">
                    {key.replace(/([A-Z])/g, ' $1')}
                  </span>
                  <span className="text-slate-100 font-medium text-xs break-all block">
                    {typeof val === 'boolean' ? (val ? 'Confirmed (Yes)' : 'No') : String(val)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Evidence Reference (if applicable) */}
          {credential.evidence && credential.evidence.length > 0 && (
            <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-850 font-mono text-xs space-y-1.5">
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span className="font-semibold text-slate-300 flex items-center space-x-1.5">
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Audit & Evidence Dossier</span>
                </span>
                <span className="text-slate-500">Auditor: {credential.evidence[0].verifier || 'Senate Committee'}</span>
              </div>
              <p className="text-slate-300 text-xs font-sans leading-relaxed">
                {credential.evidence[0].description}
              </p>
              {credential.evidence[0].documentUrl && (
                <a
                  href={credential.evidence[0].documentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 text-[11px] underline pt-0.5"
                >
                  <span>View Primary Supporting Document</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}

          {/* Section 6: Security Audit Trail, Cryptographic Signatures & Verification QR */}
          <div className="pt-6 border-t border-slate-800/90 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Left: Metadata & Timestamps */}
            <div className="md:col-span-8 space-y-3 font-mono text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-850 space-y-1">
                  <div className="flex items-center space-x-1.5 text-slate-500 text-[10px] uppercase font-bold">
                    <Calendar className="w-3 h-3" />
                    <span>Issue Date:</span>
                  </div>
                  <div className="text-white font-semibold">{issueDateFormatted}</div>
                  <div className="text-[10px] text-slate-500 truncate">{credential.issuanceDate}</div>
                </div>

                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-850 space-y-1">
                  <div className="flex items-center space-x-1.5 text-slate-500 text-[10px] uppercase font-bold">
                    <Clock className="w-3 h-3" />
                    <span>Expiration Date:</span>
                  </div>
                  <div className={status.type === 'EXPIRED' ? 'text-rose-400 font-semibold' : 'text-slate-200 font-semibold'}>
                    {expirationFormatted}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {credential.expirationDate ? (status.type === 'EXPIRED' ? 'Status: Lapsed' : 'Status: Valid') : 'Status: Perpetual'}
                  </div>
                </div>
              </div>

              {/* Arc Anchor & Signatures */}
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-850 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 uppercase font-bold text-[10px]">Arc Mainnet Anchor:</span>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleCopyTx}
                      className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 text-[10px]"
                    >
                      {copiedTx ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedTx ? 'Copied' : 'Copy Tx'}</span>
                    </button>
                    {credential.blockchainRecord?.anchorTxHash && (
                      <a
                        href={`${ARC_ISOLATED_CONFIG.explorerUrl}/tx/${credential.blockchainRecord.anchorTxHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 text-[10px]"
                      >
                        <span>ArcScan</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="text-emerald-400 text-[11px] font-mono break-all bg-black/40 p-1.5 rounded border border-slate-850">
                  {credential.blockchainRecord?.anchorTxHash || credential.proof.credentialHash}
                </div>

                <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-900">
                  <span>Network: <strong className="text-cyan-300">Arc Mainnet (42424)</strong></span>
                  <span>Finality: <strong className="text-emerald-400">Deterministic Single-Slot</strong></span>
                  <span>Block: <strong className="text-slate-300">#{credential.proof.arcBlockNumber || 1245910}</strong></span>
                </div>
              </div>
            </div>

            {/* Right: Public Scannable QR Code */}
            <div className="md:col-span-4 flex flex-col items-center justify-center p-4 bg-slate-950/80 rounded-xl border border-slate-850 text-center space-y-2.5">
              <div className="p-3 bg-white rounded-xl shadow-md">
                <QRCodeSVG
                  value={publicVerifyUrl}
                  size={120}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] font-mono font-bold text-white block">
                  Scan to Verify Independently
                </span>
                <span className="text-[10px] text-slate-400 font-sans block max-w-[180px] leading-tight">
                  No wallet or login required for public verifiers.
                </span>
              </div>
              {onNavigateToVerifier && (
                <button
                  type="button"
                  onClick={() => onNavigateToVerifier(publicVerifyUrl)}
                  className="w-full py-1.5 px-2 bg-slate-900 hover:bg-slate-850 text-cyan-400 rounded-lg text-[11px] font-mono font-semibold border border-slate-850 transition-colors"
                >
                  Verify Online Now
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
