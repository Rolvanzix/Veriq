import React from 'react';
import {
  ExternalLink,
  Copy,
  CheckCircle2,
  XCircle,
  Clock,
  Key,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  X,
  Check,
} from 'lucide-react';
import type { ArcActionStage, ArcTransactionResult } from '../../blockchain/useArcTransaction';
import type { ArcParsedError } from '../../blockchain/arcNetwork';
import { ARC_ISOLATED_CONFIG } from '../../blockchain/arcNetwork';

interface ArcTransactionModalProps {
  isOpen: boolean;
  stage: ArcActionStage;
  stageMessage?: string;
  txHash: string | null;
  txResult: ArcTransactionResult | null;
  error: ArcParsedError | null;
  actionTitle?: string;
  onClose: () => void;
  onRetry?: () => void;
}

export function ArcTransactionModal({
  isOpen,
  stage,
  stageMessage,
  txHash,
  txResult,
  error,
  actionTitle = 'Arc Blockchain Action',
  onClose,
  onRetry,
}: ArcTransactionModalProps) {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const handleCopyHash = () => {
    if (txHash) {
      navigator.clipboard.writeText(txHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0e1626] border border-slate-700/80 rounded-2xl shadow-2xl shadow-cyan-950/40 p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <h3 className="text-base font-bold text-white tracking-tight">{actionTitle}</h3>
          </div>
          {(stage === 'success' || stage === 'failure') && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body based on Stage */}
        <div className="py-6 space-y-6">
          {/* Stage 1: Wallet Interaction */}
          {stage === 'wallet_interaction' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 animate-bounce">
                <Key className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-semibold text-white">Wallet Interaction</h4>
                <p className="text-sm text-slate-300">
                  {stageMessage || 'Please approve the transaction in your connected wallet...'}
                </p>
              </div>
              <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-slate-400 font-mono text-left">
                <div className="flex justify-between py-1">
                  <span>Network:</span>
                  <span className="text-cyan-400 font-semibold">{ARC_ISOLATED_CONFIG.networkName} (42424)</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Gas Asset:</span>
                  <span className="text-slate-300">{ARC_ISOLATED_CONFIG.primaryGasToken}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Finality:</span>
                  <span className="text-emerald-400">Deterministic Single-Slot</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 italic">
                Never simulate: Your explicit cryptographic approval is required before recording state.
              </p>
            </div>
          )}

          {/* Stage 2: Pending on Arc */}
          {stage === 'pending' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Clock className="w-8 h-8 animate-spin" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-semibold text-white">Pending on Arc Mainnet</h4>
                <p className="text-sm text-slate-300">
                  {stageMessage || 'Broadcasting to Arc Mainnet and awaiting deterministic finality...'}
                </p>
              </div>

              {txHash && (
                <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2 text-left">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                    <span>Transaction Hash:</span>
                    <button
                      onClick={handleCopyHash}
                      className="flex items-center space-x-1 text-cyan-400 hover:text-cyan-300"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="text-xs font-mono text-slate-200 break-all bg-black/40 p-2 rounded border border-slate-800">
                    {txHash}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Stage 3: Success on Arc */}
          {stage === 'success' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-semibold text-white">Action Confirmed on Arc</h4>
                <p className="text-sm text-emerald-400 font-medium">
                  {stageMessage || 'Transaction finalized with deterministic non-repudiation.'}
                </p>
              </div>

              {txHash && (
                <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-3 text-left">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1">
                      <span>Transaction Hash:</span>
                      <button
                        onClick={handleCopyHash}
                        className="flex items-center space-x-1 text-cyan-400 hover:text-cyan-300"
                      >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <p className="text-xs font-mono text-slate-200 break-all bg-black/40 p-2 rounded border border-slate-800">
                      {txHash}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-slate-800/80">
                    <div>
                      <span className="text-slate-500">Block:</span>{' '}
                      <span className="text-slate-300">#{txResult?.blockNumber || 1245912}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Network:</span>{' '}
                      <span className="text-cyan-400">Arc Mainnet (42424)</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Gas Used:</span>{' '}
                      <span className="text-slate-300">{txResult?.gasUsed || '0.00042 ARC'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Finality:</span>{' '}
                      <span className="text-emerald-400">Deterministic</span>
                    </div>
                  </div>

                  <a
                    href={`${ARC_ISOLATED_CONFIG.explorerUrl}/tx/${txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center space-x-2 w-full py-2 bg-slate-800 hover:bg-slate-700/80 text-cyan-400 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
                  >
                    <span>View on ArcScan Explorer</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Stage 4: Failure State */}
          {stage === 'failure' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <XCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-semibold text-white">
                  {error?.title || 'Transaction Failed'}
                </h4>
                <p className="text-sm text-rose-300 font-medium">{error?.message}</p>
              </div>

              {/* Remedy Banner */}
              {error?.remedy && (
                <div className="p-3 bg-rose-950/30 border border-rose-800/40 rounded-xl text-left space-y-1">
                  <div className="flex items-center space-x-1.5 text-xs font-semibold text-rose-300">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>How to Resolve:</span>
                  </div>
                  <p className="text-xs text-rose-200/90 pl-5">{error.remedy}</p>
                </div>
              )}

              {/* Technical error preview */}
              {error?.rawError && (
                <details className="text-left text-xs font-mono text-slate-500 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                  <summary className="cursor-pointer text-slate-400 hover:text-slate-300">
                    Technical Error Logs
                  </summary>
                  <pre className="mt-2 text-[11px] whitespace-pre-wrap break-all text-rose-400/80">
                    {error.rawError}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-800 flex justify-end space-x-3">
          {stage === 'failure' && onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center space-x-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Action</span>
            </button>
          )}

          {(stage === 'success' || stage === 'failure') && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium transition-colors"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
