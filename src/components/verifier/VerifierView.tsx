import React, { useState, useEffect } from 'react';
import {
  Search,
  ShieldCheck,
  ShieldX,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Upload,
  QrCode,
  FileCode,
  RefreshCw,
  Hash,
  Award,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  Lock,
  Building,
  User,
  Calendar,
} from 'lucide-react';
import { verifyArcCredential } from '../../verification/verifier';
import { decodeCredentialFromUrlPayload } from '../../verification/qr';
import type { ArcVerifiableCredential, ComprehensiveVerificationResult } from '../../verification/types';
import { CANONICAL_CREDENTIAL_TYPES } from '../../verification/credential-types';

interface VerifierViewProps {
  initialPayloadUrl?: string;
}

export function VerifierView({ initialPayloadUrl }: VerifierViewProps) {
  const [inputMode, setInputMode] = useState<'json' | 'hash'>('json');
  const [jsonInput, setJsonInput] = useState('');
  const [hashInput, setHashInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<ComprehensiveVerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifiedCredential, setVerifiedCredential] = useState<ArcVerifiableCredential | null>(null);

  // Check URL params on mount
  useEffect(() => {
    if (initialPayloadUrl) {
      handlePayloadFromUrl(initialPayloadUrl);
    } else if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const payloadParam = urlParams.get('payload');
      if (payloadParam) {
        const decoded = decodeCredentialFromUrlPayload<ArcVerifiableCredential>(payloadParam);
        if (decoded) {
          setJsonInput(JSON.stringify(decoded, null, 2));
          runVerification(decoded);
        }
      }
    }
  }, [initialPayloadUrl]);

  const handlePayloadFromUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      const payloadParam = urlObj.searchParams.get('payload');
      if (payloadParam) {
        const decoded = decodeCredentialFromUrlPayload<ArcVerifiableCredential>(payloadParam);
        if (decoded) {
          setJsonInput(JSON.stringify(decoded, null, 2));
          runVerification(decoded);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const runVerification = async (credential: ArcVerifiableCredential) => {
    setIsVerifying(true);
    setError(null);
    setResult(null);
    setVerifiedCredential(credential);

    try {
      // Execute independent verification engine
      const res = await verifyArcCredential(credential);
      setResult(res);
    } catch (err: any) {
      console.error('Verification failed:', err);
      setError(err.message || 'Verification failed unexpectedly');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyJson = () => {
    if (!jsonInput.trim()) {
      setError('Please provide Verifiable Credential JSON');
      return;
    }

    try {
      const parsed = JSON.parse(jsonInput) as ArcVerifiableCredential;
      runVerification(parsed);
    } catch {
      setError('Invalid JSON syntax. Please verify formatted JSON.');
    }
  };

  const handleVerifyByHash = async () => {
    if (!hashInput.trim()) {
      setError('Please provide an Arc Credential Hash');
      return;
    }

    setIsVerifying(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/credentials/${hashInput.trim()}`);
      if (!res.ok) {
        throw new Error('Credential record not found in Arc off-chain index');
      }
      const credential = await res.json();
      setJsonInput(JSON.stringify(credential, null, 2));
      setVerifiedCredential(credential);
      const verifyRes = await verifyArcCredential(credential);
      setResult(verifyRes);
    } catch (err: any) {
      setError(err.message || 'Failed to verify credential hash');
    } finally {
      setIsVerifying(false);
    }
  };

  // Pre-configured test sample buttons
  const loadPreset = async (presetId: 'cert' | 'hackathon' | 'course' | 'employment' | 'tampered') => {
    if (presetId === 'tampered') {
      try {
        const res = await fetch('/api/credentials/by-subject/0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC');
        const creds = await res.json();
        const base = creds[0] || {};
        const tampered: ArcVerifiableCredential = JSON.parse(JSON.stringify(base));
        tampered.id = 'urn:arc:credential:tampered-test';
        // Fraudulently alter a private claim without re-signing:
        if (tampered.credentialSubject.claims) {
          tampered.credentialSubject.claims.recipientName = 'MALICIOUS_ACTOR_NAME_ALTERED';
          tampered.credentialSubject.claims.tamperedAttribute = 'ATTACK_VALUE_UNAUTHORIZED';
        }
        setJsonInput(JSON.stringify(tampered, null, 2));
        runVerification(tampered);
      } catch (e) {
        console.error(e);
      }
      return;
    }

    try {
      const res = await fetch('/api/credentials/by-subject/0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC');
      if (res.ok) {
        const creds: ArcVerifiableCredential[] = await res.json();
        let target: ArcVerifiableCredential | undefined;
        if (presetId === 'cert') {
          target = creds.find((c) => c.type?.includes('CertificateCredential')) || creds[0];
        } else if (presetId === 'hackathon') {
          target = creds.find((c) => c.type?.includes('HackathonParticipationCredential')) || creds[0];
        } else if (presetId === 'course') {
          target = creds.find((c) => c.type?.includes('CourseCompletionCredential')) || creds[0];
        } else if (presetId === 'employment') {
          target = creds.find((c) => c.type?.includes('EmploymentRoleCredential')) || creds[0];
        }
        if (target) {
          setJsonInput(JSON.stringify(target, null, 2));
          runVerification(target);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-8">
      {/* Role Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-cyan-950/20 to-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-700/50 text-cyan-300 text-xs font-mono">
              <Search className="w-3.5 h-3.5" />
              <span>Actor: Public / Institutional Verifier</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Cryptographic Credential Verifier
            </h1>
            <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
              Independently verify any W3C Verifiable Credential against Arc Mainnet. Recomputes RFC 8785 deterministic claim digests, recovers EIP-712 signer addresses, queries the Arc Issuer Registry, and confirms on-chain revocation state.
            </p>
          </div>

          {/* Quick Demo Pre-sets */}
          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-2 shrink-0">
            <span className="text-slate-400 text-xs font-mono block">Instant Test Cases:</span>
            <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
              <button
                type="button"
                onClick={() => loadPreset('cert')}
                className="px-2.5 py-1 bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-800 rounded transition-colors"
              >
                Official Certificate
              </button>
              <button
                type="button"
                onClick={() => loadPreset('hackathon')}
                className="px-2.5 py-1 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800 rounded transition-colors"
              >
                Hackathon Award
              </button>
              <button
                type="button"
                onClick={() => loadPreset('course')}
                className="px-2.5 py-1 bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 border border-blue-800 rounded transition-colors"
              >
                Course Completion
              </button>
              <button
                type="button"
                onClick={() => loadPreset('employment')}
                className="px-2.5 py-1 bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border border-purple-800 rounded transition-colors"
              >
                Employment Role
              </button>
              <button
                type="button"
                onClick={() => loadPreset('tampered')}
                className="px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800 rounded transition-colors"
              >
                Tampered Claim Test
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Input Console */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setInputMode('json')}
              className={`text-xs font-mono font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                inputMode === 'json'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Verify Raw Credential JSON
            </button>
            <button
              onClick={() => setInputMode('hash')}
              className={`text-xs font-mono font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                inputMode === 'hash'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Verify On-Chain Hash
            </button>
          </div>

          <span className="text-xs text-slate-500 font-mono hidden sm:inline">
            Deterministic Evaluation (RFC 8785 + EIP-712)
          </span>
        </div>

        {inputMode === 'json' ? (
          <div className="space-y-3">
            <textarea
              rows={7}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder="Paste W3C Verifiable Credential JSON here..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl p-4 text-xs font-mono text-cyan-200 outline-none resize-none"
            />
            <div className="flex justify-end">
              <button
                type="button"
                disabled={isVerifying}
                onClick={handleVerifyJson}
                className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs font-mono transition-all shadow-md shadow-cyan-500/20"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Executing Verification Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Verify Credential Authenticity</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              type="text"
              value={hashInput}
              onChange={(e) => setHashInput(e.target.value)}
              placeholder="0x... (Keccak256 Credential Hash anchored on Arc)"
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-3 text-xs font-mono text-white outline-none"
            />
            <div className="flex justify-end">
              <button
                type="button"
                disabled={isVerifying}
                onClick={handleVerifyByHash}
                className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs font-mono transition-all shadow-md shadow-cyan-500/20"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Querying Arc Registry...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Query & Verify Hash</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs font-mono flex items-center space-x-2">
            <XCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Verification Result Showcase */}
      {result && (
        <div className="space-y-6">
          {/* Main Status Header Card */}
          <div
            className={`p-6 sm:p-8 rounded-2xl border transition-all ${
              result.overallStatus === 'VALID'
                ? 'bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-600/50 shadow-xl shadow-emerald-950/30'
                : result.overallStatus === 'REVOKED'
                ? 'bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 border-rose-600/50 shadow-xl shadow-rose-950/30'
                : 'bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border-amber-600/50 shadow-xl shadow-amber-950/30'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                    result.overallStatus === 'VALID'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : result.overallStatus === 'REVOKED'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  }`}
                >
                  {result.overallStatus === 'VALID' ? (
                    <ShieldCheck className="w-8 h-8" />
                  ) : result.overallStatus === 'REVOKED' ? (
                    <ShieldX className="w-8 h-8" />
                  ) : (
                    <AlertTriangle className="w-8 h-8" />
                  )}
                </div>

                <div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-xl sm:text-2xl font-black tracking-tight ${
                        result.overallStatus === 'VALID'
                          ? 'text-emerald-400'
                          : result.overallStatus === 'REVOKED'
                          ? 'text-rose-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {result.overallStatus === 'VALID' && 'CREDENTIAL AUTHENTIC & VALID'}
                      {result.overallStatus === 'INVALID' && 'VERIFICATION FAILED / TAMPER DETECTED'}
                      {result.overallStatus === 'REVOKED' && 'CREDENTIAL REVOKED ON ARC'}
                      {result.overallStatus === 'EXPIRED' && 'CREDENTIAL HAS EXPIRED'}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs mt-1">
                    {result.credentialType} ({result.schemaName}) • Verified on Arc Mainnet at {new Date(result.verifiedAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl font-mono text-[11px] text-right space-y-1">
                <div className="text-slate-500">Issuer Authority</div>
                <div className="text-cyan-400 font-semibold">{result.issuerRegistryStatus?.organizationName}</div>
                <div className="text-slate-400">{result.issuerAddress.slice(0, 10)}...</div>
              </div>
            </div>
          </div>

          {/* Complete W3C Credential Structure Inspector */}
          {verifiedCredential && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="font-bold text-white text-base flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-cyan-400" />
                  <span>Credential Model Invariants (W3C Data Model v1.1/v2.0)</span>
                </h3>
                <span className="text-xs font-mono text-cyan-400">Deterministic Binding</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-850 space-y-1">
                  <span className="text-slate-500 text-[10px] block">Credential ID</span>
                  <span className="text-white truncate block">{verifiedCredential.id}</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-850 space-y-1">
                  <span className="text-slate-500 text-[10px] block">Credential Type</span>
                  <span className="text-cyan-300 truncate block">
                    {verifiedCredential.type?.join(' / ')}
                  </span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-850 space-y-1">
                  <span className="text-slate-500 text-[10px] block">Holder Subject</span>
                  <span className="text-slate-300 truncate block">{verifiedCredential.credentialSubject.id}</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-850 space-y-1">
                  <span className="text-slate-500 text-[10px] block">Arc Anchor Status</span>
                  <span className="text-emerald-400 font-bold block">
                    {verifiedCredential.blockchainRecord?.status || 'ANCHORED'} (Chain 42424)
                  </span>
                </div>
              </div>

              {/* Private Claims Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>Verified Claims Payload:</span>
                  <span className="text-emerald-400">Retained off-chain, sealed via Keccak256</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 bg-slate-950 p-4 rounded-xl border border-slate-850 font-mono text-xs">
                  {Object.entries(verifiedCredential.credentialSubject.claims).map(([k, v]) => (
                    <div key={k} className="p-2 bg-slate-900/60 rounded-lg border border-slate-800/80">
                      <span className="text-slate-500 text-[10px] block capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                      <span className="text-slate-200 font-medium truncate block">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Evidence Section if present */}
              {verifiedCredential.evidence && verifiedCredential.evidence.length > 0 && (
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-850 space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-bold uppercase text-[11px]">
                      Attached Evidence Reference
                    </span>
                    <span className="text-cyan-400 text-[10px]">W3C Evidence Extension</span>
                  </div>
                  {verifiedCredential.evidence.map((ev, i) => (
                    <div key={ev.id || i} className="text-slate-300 space-y-1">
                      <div>Type: <span className="text-white">{ev.type.join(', ')}</span></div>
                      <div>Description: <span className="text-slate-400">{ev.description}</span></div>
                      {ev.documentUrl && (
                        <div>
                          Resource: <a href={ev.documentUrl} target="_blank" rel="noreferrer" className="text-cyan-400 underline">{ev.documentUrl}</a>
                        </div>
                      )}
                      {ev.documentHash && (
                        <div>Document Hash: <span className="text-slate-500">{ev.documentHash}</span></div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Cryptographic Verification Steps Audit Trail */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Cryptographic Audit Trail (Independent Engine)</h3>
              <span className="text-xs font-mono text-emerald-400">Zero Server Trust</span>
            </div>

            <div className="space-y-4">
              {result.steps.map((step, idx) => (
                <div
                  key={step.id}
                  className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center font-mono text-[10px] text-slate-300 font-bold">
                        {idx + 1}
                      </div>
                      <span className="font-bold text-white text-sm">{step.name}</span>
                    </div>

                    <div className="flex items-center space-x-1.5 font-mono text-[11px]">
                      {step.status === 'passed' && (
                        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>PASSED</span>
                        </span>
                      )}
                      {step.status === 'failed' && (
                        <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 flex items-center space-x-1">
                          <XCircle className="w-3 h-3" />
                          <span>FAILED</span>
                        </span>
                      )}
                      {step.status === 'warning' && (
                        <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 flex items-center space-x-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>NOTE</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-slate-400 text-xs pl-7 leading-relaxed">{step.description}</p>
                  <div className="pl-7 font-mono text-[11px] text-cyan-300/90 bg-slate-900/60 p-2.5 rounded-lg border border-slate-850 break-all">
                    {step.details}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
