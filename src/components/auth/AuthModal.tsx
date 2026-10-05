import React, { useState } from 'react';
import {
  Shield,
  Key,
  Building,
  UserCheck,
  CheckCircle,
  AlertTriangle,
  Lock,
  ArrowRight,
  LogOut,
  Users,
  Eye,
  Search,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { useAccount, useConnect } from 'wagmi';
import { useAuth } from '../../auth/AuthContext';
import { type UserRole, ROLE_PERMISSIONS } from '../../auth/types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { session, signInWithWallet, signInAsOrgAdmin, signOut, demoSwitchRole, loading } = useAuth();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  const [activeTab, setActiveTab] = useState<'wallet' | 'org_admin' | 'roles'>('wallet');
  const [adminEmail, setAdminEmail] = useState('admin@arc.network');
  const [adminPassword, setAdminPassword] = useState('ArcAdmin2026!');
  const [authError, setAuthError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleWalletSignIn = async () => {
    setAuthError(null);
    if (!isConnected) {
      const injected = connectors[0];
      if (injected) {
        connect({ connector: injected });
      }
    }
    const success = await signInWithWallet(address);
    if (success) {
      onClose();
    } else {
      setAuthError('Wallet sign-in could not be completed.');
    }
  };

  const handleOrgAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const result = await signInAsOrgAdmin(adminEmail, adminPassword);
    if (result.success) {
      onClose();
    } else {
      setAuthError(result.error || 'Authentication failed');
    }
  };

  const handleSelectRole = (role: UserRole) => {
    demoSwitchRole(role);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-white text-base">ARC Verify Authentication</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* Current Active Session Status */}
        <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs shrink-0 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-slate-500 font-mono text-[11px] block">Current Authenticated Identity</span>
            <div className="text-white font-semibold flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 font-mono text-[10px] border border-cyan-800 uppercase">
                {session.role.replace('_', ' ')}
              </span>
              <span className="truncate max-w-[220px]">{session.displayName}</span>
            </div>
          </div>

          {session.role !== 'PUBLIC_VERIFIER' && (
            <button
              onClick={() => {
                signOut();
              }}
              className="flex items-center space-x-1 text-slate-400 hover:text-rose-400 text-xs font-mono py-1 px-2 rounded hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 shrink-0">
          <button
            onClick={() => setActiveTab('wallet')}
            className={`text-xs font-mono font-semibold px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'wallet'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            EVM Wallet (SIWE)
          </button>

          <button
            onClick={() => setActiveTab('org_admin')}
            className={`text-xs font-mono font-semibold px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'org_admin'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Org Administrator
          </button>

          <button
            onClick={() => setActiveTab('roles')}
            className={`text-xs font-mono font-semibold px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'roles'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Quick Role Switcher
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-4 overflow-y-auto pr-1">
          {activeTab === 'wallet' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="text-white font-semibold flex items-center space-x-2">
                  <Key className="w-4 h-4 text-cyan-400" />
                  <span>Wallet-Based Identity (EIP-4361 SIWE)</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Sign a challenge nonce with your connected EVM wallet. ARC Verify resolves whether this wallet has been approved as an authorized issuer by an organization, or defaults safely to Holder / Public Verifier.
                </p>
                <div className="p-2 bg-slate-900 rounded border border-slate-800 text-[11px] font-mono text-emerald-400">
                  Zero private keys requested. Signature uses personal_sign and incurs zero gas.
                </div>
              </div>

              {authError && (
                <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs font-mono">
                  {authError}
                </div>
              )}

              <button
                type="button"
                disabled={loading}
                onClick={handleWalletSignIn}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs font-mono flex items-center justify-center space-x-2 transition-all shadow-md shadow-cyan-500/20"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Cryptographic Nonce...</span>
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    <span>Sign In With Connected Wallet</span>
                  </>
                )}
              </button>
            </div>
          )}

          {activeTab === 'org_admin' && (
            <form onSubmit={handleOrgAdminLogin} className="space-y-4">
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                <div className="text-white font-semibold flex items-center space-x-2">
                  <Building className="w-4 h-4 text-cyan-400" />
                  <span>Organization Administrator Dual Authentication</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Organization administrators authenticate using application credentials combined with approved wallet identity to manage authorized issuer keys and organization governance.
                </p>
              </div>

              {authError && (
                <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs font-mono">
                  {authError}
                </div>
              )}

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-mono text-[11px] mb-1">
                    Administrator Email
                  </label>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-white outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-mono text-[11px] mb-1">
                    Application Password
                  </label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-white outline-none font-mono"
                  />
                </div>
              </div>

              <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
                <div className="text-cyan-400 font-semibold">Pre-configured Admin Credentials:</div>
                <div>• Arc Foundation: <span className="text-slate-200">admin@arc.network</span> (ArcAdmin2026!)</div>
                <div>• VeriID Global: <span className="text-slate-200">compliance@veriid-global.com</span> (VeriIDSecure2026!)</div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs font-mono flex items-center justify-center space-x-2 transition-all shadow-md shadow-cyan-500/20"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Authenticating Admin...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Authenticate Organization Administrator</span>
                  </>
                )}
              </button>
            </form>
          )}

          {activeTab === 'roles' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 leading-relaxed">
                Test and verify the access control boundaries for each of the 6 roles:
              </p>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => handleSelectRole('ORG_OWNER')}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500 text-left transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">1. Organization Owner</span>
                    <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 font-mono text-[10px] border border-purple-800">
                      FULL ORG CONTROL
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Manage admins, approve/revoke issuer wallets, update DID metadata, issue credentials.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectRole('ORG_ADMIN')}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500 text-left transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">2. Organization Administrator</span>
                    <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 font-mono text-[10px] border border-blue-800">
                      ADMIN PRIVILEGES
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Authorize issuer wallets, manage credential templates, audit organizational logs.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectRole('ISSUER')}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500 text-left transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">3. Authorized Issuer Wallet</span>
                    <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-mono text-[10px] border border-cyan-800">
                      APPROVED ISSUER
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Approved wallet authorized by organization to sign (EIP-712) and anchor credentials on Arc.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectRole('VIEWER_AUDITOR')}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500 text-left transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">4. Viewer / Compliance Auditor</span>
                    <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 font-mono text-[10px] border border-amber-800">
                      AUDIT ONLY
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Inspect organization credentials and audit trails with zero issuance permissions.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectRole('HOLDER')}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500 text-left transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">5. Credential Holder</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono text-[10px] border border-emerald-800">
                      WALLET USER
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Standard wallet user who owns credentials, inspects proofs, and shares presentations.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectRole('PUBLIC_VERIFIER')}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500 text-left transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">6. Public Verifier</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">
                      ZERO TRUST
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Unauthenticated public party performing independent verification without special privileges.
                  </p>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
