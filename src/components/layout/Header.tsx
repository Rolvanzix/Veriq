import React, { useState } from 'react';
import {
  ShieldCheck,
  Layers,
  Award,
  UserCheck,
  Search,
  Building,
  Key,
  Lock,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { arcMainnet } from '../../blockchain/chain';
import { useAuth } from '../../auth/AuthContext';
import { AuthModal } from '../auth/AuthModal';
import { ArcNetworkGuardBanner } from '../blockchain/ArcNetworkGuardBanner';
import { ArcTestHarnessModal } from '../blockchain/ArcTestHarnessModal';

interface HeaderProps {
  activeTab: 'issuer' | 'holder' | 'verifier' | 'registry' | 'verification_queue' | 'architecture';
  setActiveTab: (tab: 'issuer' | 'holder' | 'verifier' | 'registry' | 'verification_queue' | 'architecture') => void;
  mockAccount?: string;
  setMockAccount: (acc: string | undefined) => void;
}

export function Header({ activeTab, setActiveTab, mockAccount, setMockAccount }: HeaderProps) {
  const { session, hasPermission, signOut } = useAuth();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isTestHarnessOpen, setIsTestHarnessOpen] = useState(false);

  const currentAddress = session.userAddress || address || mockAccount;
  const isWalletActive = isConnected || Boolean(mockAccount) || Boolean(session.userAddress);

  const handleConnectWallet = () => {
    const injectedConnector = connectors[0];
    if (injectedConnector) {
      connect({ connector: injectedConnector });
    }
  };

  // Helper for role styling
  const getRoleBadge = () => {
    switch (session.role) {
      case 'ORG_OWNER':
        return { label: 'Org Owner', bg: 'bg-purple-950 text-purple-300 border-purple-800' };
      case 'ORG_ADMIN':
        return { label: 'Org Admin', bg: 'bg-blue-950 text-blue-300 border-blue-800' };
      case 'ISSUER':
        return { label: 'Authorized Issuer', bg: 'bg-cyan-950 text-cyan-300 border-cyan-800' };
      case 'VIEWER_AUDITOR':
        return { label: 'Auditor', bg: 'bg-amber-950 text-amber-300 border-amber-800' };
      case 'HOLDER':
        return { label: 'Holder', bg: 'bg-emerald-950 text-emerald-300 border-emerald-800' };
      case 'PUBLIC_VERIFIER':
      default:
        return { label: 'Public Verifier', bg: 'bg-slate-800 text-slate-300 border-slate-700' };
    }
  };

  const roleBadge = getRoleBadge();

  return (
    <>
      <ArcNetworkGuardBanner />
      <header className="border-b border-slate-800 bg-[#0d131f]/95 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Network */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 p-0.5 shadow-lg shadow-cyan-500/20">
                <div className="w-full h-full bg-[#0d131f] rounded-[10px] flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-cyan-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-lg text-white tracking-tight">ARC VERIFY</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-semibold">
                    EVM
                  </span>
                </div>
                <p className="text-xs text-slate-400 hidden sm:block">Decentralized Credential Platform</p>
              </div>

              {/* Arc Network Status */}
              <div className="hidden xl:flex items-center ml-4 pl-4 border-l border-slate-800 space-x-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-mono text-slate-300">Arc Mainnet</span>
                <span className="text-[11px] font-mono text-slate-500">ID: {arcMainnet.id}</span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex items-center space-x-1">
              <button
                onClick={() => setActiveTab('issuer')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  activeTab === 'issuer'
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Award className="w-4 h-4" />
                <span>Issuer</span>
              </button>

              <button
                onClick={() => setActiveTab('holder')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  activeTab === 'holder'
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>Holder</span>
              </button>

              <button
                onClick={() => setActiveTab('verifier')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  activeTab === 'verifier'
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Search className="w-4 h-4" />
                <span>Verifier</span>
              </button>

              {/* Authoritative Issuer Registry */}
              <button
                onClick={() => setActiveTab('registry')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  activeTab === 'registry'
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Building className="w-4 h-4" />
                <span className="hidden md:inline">Issuer Registry</span>
                <span className="md:hidden">Registry</span>
              </button>

              {/* Organization Onboarding & Institutional Verification Queue */}
              <button
                onClick={() => setActiveTab('verification_queue')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  activeTab === 'verification_queue'
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span className="hidden md:inline">Onboarding Queue</span>
                <span className="md:hidden">Audit</span>
              </button>

              <button
                onClick={() => setActiveTab('architecture')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  activeTab === 'architecture'
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span className="hidden lg:inline">Architecture & Contracts</span>
                <span className="lg:hidden">Specs</span>
              </button>
            </nav>

            {/* Authentication & Role Controls */}
            <div className="flex items-center space-x-2">
              {/* Arc Test Suite & Diagnostics Button */}
              <button
                onClick={() => setIsTestHarnessOpen(true)}
                className="hidden sm:flex items-center space-x-1.5 bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-800/80 text-cyan-300 rounded-lg py-1.5 px-2.5 text-xs font-mono transition-colors shadow-sm"
                title="Arc Blockchain Diagnostics & Test Suite"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[11px] font-semibold">Test Suite</span>
              </button>

              {/* Role & Auth Status Trigger Button */}
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-lg py-1.5 px-2.5 text-xs transition-colors"
                title="Manage Authentication & Roles"
              >
                <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${roleBadge.bg}`}>
                  {roleBadge.label}
                </span>

                {session.organization && (
                  <span className="hidden xl:inline text-slate-300 font-medium truncate max-w-[120px]">
                    {session.organization.name.split(' ')[0]}
                  </span>
                )}

                {currentAddress ? (
                  <span className="font-mono text-slate-400 text-[11px] hidden sm:inline">
                    {currentAddress.slice(0, 6)}...
                  </span>
                ) : (
                  <span className="text-cyan-400 font-semibold text-[11px]">Sign In</span>
                )}
                <ChevronDown className="w-3 h-3 text-slate-500" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Auth & Roles Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Arc Pre-Deployment Test Suite Modal */}
      <ArcTestHarnessModal
        isOpen={isTestHarnessOpen}
        onClose={() => setIsTestHarnessOpen(false)}
        currentAddress={currentAddress}
      />
    </>
  );
}
