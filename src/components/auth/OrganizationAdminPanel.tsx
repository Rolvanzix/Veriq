import React, { useState } from 'react';
import {
  Building,
  Key,
  ShieldCheck,
  ShieldAlert,
  UserPlus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Lock,
  PlusCircle,
  ExternalLink,
} from 'lucide-react';
import { isAddress, type Address } from 'viem';
import { useAuth } from '../../auth/AuthContext';

export function OrganizationAdminPanel() {
  const { session, orgWallets, authorizeNewWallet, revokeWallet, hasPermission } = useAuth();
  const [newWalletAddress, setNewWalletAddress] = useState('');
  const [newWalletLabel, setNewWalletLabel] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const organization = session.organization;

  if (!organization) {
    return (
      <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
        <Building className="w-8 h-8 text-slate-600 mx-auto" />
        <h3 className="text-white font-bold text-base">No Organization Context Active</h3>
        <p className="text-slate-400 text-xs max-w-sm mx-auto">
          Sign in as an Organization Administrator or Owner to access authorized issuer keys, members, and organizational identity governance.
        </p>
      </div>
    );
  }

  const handleAuthorizeWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWalletAddress || !isAddress(newWalletAddress)) {
      setStatusMessage('Please enter a valid EVM wallet address.');
      return;
    }
    if (!newWalletLabel.trim()) {
      setStatusMessage('Please provide a descriptive label for this issuer key.');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    const success = await authorizeNewWallet(newWalletAddress as Address, newWalletLabel.trim());
    setIsSubmitting(false);

    if (success) {
      setNewWalletAddress('');
      setNewWalletLabel('');
      setStatusMessage(`Wallet ${newWalletAddress.slice(0, 10)}... successfully approved as an authorized issuer.`);
    } else {
      setStatusMessage('Failed to authorize wallet.');
    }
  };

  const handleRevokeWallet = async (walletAddress: Address) => {
    if (confirm(`Are you sure you want to revoke authorization for wallet ${walletAddress}? It will immediately lose issuance rights.`)) {
      await revokeWallet(walletAddress);
    }
  };

  return (
    <div className="space-y-8">
      {/* Organization Header & Identity Separation Rule Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900 border border-indigo-800/40 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 text-xs font-mono">
              <Building className="w-3.5 h-3.5" />
              <span>Organization Governance: {session.role.replace('_', ' ')}</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">{organization.name}</h2>
            <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
              <strong className="text-cyan-400">Security Invariant:</strong> Wallet identity and organization identity are strictly separate concepts. Connecting a wallet does not grant issuance rights until approved below.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl font-mono text-xs space-y-1.5">
            <div className="text-slate-500">Organization DID</div>
            <div className="text-cyan-400 font-semibold truncate max-w-xs">{organization.didUri}</div>
            <div className="flex items-center space-x-2 pt-1">
              <span className="text-slate-500">Arc Status:</span>
              {organization.status === 'VERIFIED' ? (
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                  VERIFIED ON ARC
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-bold">
                  PENDING ACCREDITATION
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Authorized Wallets & Add Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* List of Authorized Issuer Wallets */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-base flex items-center space-x-2">
              <Key className="w-4 h-4 text-cyan-400" />
              <span>Approved Issuer Wallets ({orgWallets.length})</span>
            </h3>
            <span className="text-xs text-slate-500 font-mono">Governed List</span>
          </div>

          <div className="space-y-3">
            {orgWallets.map((wallet) => (
              <div
                key={wallet.id}
                className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2 text-xs font-mono"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-bold text-white text-sm block font-sans">
                      {wallet.label}
                    </span>
                    <span className="text-cyan-400 break-all">{wallet.walletAddress}</span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      wallet.status === 'ACTIVE'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}
                  >
                    {wallet.status}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-850 text-slate-400 text-[11px]">
                  <span>Approved: {new Date(wallet.approvedAt).toLocaleDateString()}</span>

                  {hasPermission('MANAGE_ISSUER_WALLETS') && wallet.status === 'ACTIVE' && (
                    <button
                      type="button"
                      onClick={() => handleRevokeWallet(wallet.walletAddress)}
                      className="text-rose-400 hover:text-rose-300 hover:underline flex items-center space-x-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Revoke Issuance Rights</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add New Authorized Wallet Form */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
              <UserPlus className="w-5 h-5 text-cyan-400" />
              <h3 className="font-bold text-white text-base">Authorize New Issuer Wallet</h3>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Grant credential signing and on-chain anchoring authority to an external EVM wallet address on behalf of <strong>{organization.name}</strong>.
            </p>

            <form onSubmit={handleAuthorizeWallet} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-mono text-[11px] mb-1">
                  EVM Wallet Address
                </label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={newWalletAddress}
                  onChange={(e) => setNewWalletAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-mono text-[11px] mb-1">
                  Signer Label / Department
                </label>
                <input
                  type="text"
                  placeholder="e.g. Registrar Officer Key #3"
                  value={newWalletLabel}
                  onChange={(e) => setNewWalletLabel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>

              {statusMessage && (
                <div className="p-3 bg-cyan-950/40 border border-cyan-800/60 rounded-xl text-cyan-300 text-xs font-mono">
                  {statusMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs font-mono flex items-center justify-center space-x-2 transition-all shadow-md shadow-cyan-500/20"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Authorize & Bind Wallet</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
