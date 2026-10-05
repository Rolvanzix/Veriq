import React, { useState } from 'react';
import {
  QrCode,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  X,
  Share2,
  Lock,
  Globe,
  Award,
  Calendar,
  Building,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { ArcVerifiableCredential } from '../../verification/types';
import { resolveCredentialStatus } from './holderStatus';
import { generateVerificationLink } from '../../verification/qr';

interface ShareVerificationModalProps {
  isOpen: boolean;
  credential: ArcVerifiableCredential | null;
  onClose: () => void;
  onNavigateToVerifier?: (payloadUrl: string) => void;
}

export function ShareVerificationModal({
  isOpen,
  credential,
  onClose,
  onNavigateToVerifier,
}: ShareVerificationModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !credential) return null;

  const status = resolveCredentialStatus(credential);
  const publicUrl = generateVerificationLink(credential);

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const claims = credential.credentialSubject.claims as Record<string, unknown>;
  const recipientName = String(
    claims.recipientName ||
    claims.studentName ||
    claims.attendeeName ||
    claims.memberName ||
    claims.employeeName ||
    credential.credentialSubject.address ||
    'Holder'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0e1626] border border-slate-700/80 rounded-2xl shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Share Verifiable Presentation
              </h3>
              <p className="text-xs text-slate-400">Independent public verification endpoint</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="py-5 space-y-5">
          {/* Public / No-Wallet Assurance Banner */}
          <div className="p-3.5 bg-cyan-950/40 border border-cyan-800/60 rounded-xl flex items-start space-x-3 text-xs">
            <Globe className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <strong className="text-cyan-300 font-semibold block">
                No Wallet Required for Public Verifiers
              </strong>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                Employers, universities, or verifiers can open this link on any browser or mobile device to verify the cryptographic proofs against Arc Mainnet without connecting a wallet, installing software, or paying gas fees.
              </p>
            </div>
          </div>

          {/* QR Code Presentation */}
          <div className="text-center space-y-3">
            <div className="p-4 bg-white rounded-2xl inline-block shadow-lg mx-auto">
              <QRCodeSVG
                value={publicUrl}
                size={180}
                level="M"
                includeMargin={false}
              />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-mono font-bold text-white">
                {credential.schemaName}
              </div>
              <div className="text-[11px] font-mono text-slate-400">
                Conferred upon: <span className="text-cyan-300 font-semibold">{recipientName}</span>
              </div>
              <div className="flex items-center justify-center space-x-2 pt-1">
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${status.badgeClass}`}>
                  {status.label}
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  Arc Mainnet (42424)
                </span>
              </div>
            </div>
          </div>

          {/* Copyable Public URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-300 font-semibold block">
              Public Verification URL
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={publicUrl}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-300 truncate focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-mono font-bold flex items-center space-x-1.5 transition-colors whitespace-nowrap shadow-sm"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
          {onNavigateToVerifier ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateToVerifier(publicUrl);
              }}
              className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center space-x-1"
            >
              <span>Test in Independent Verifier</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
