import React from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { AlertTriangle, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { arcMainnet, arcTestnet } from '../../blockchain/chain';
import { ARC_ISOLATED_CONFIG } from '../../blockchain/arcNetwork';

export function ArcNetworkGuardBanner() {
  const { chainId, isConnected } = useAccount();
  const { switchChain, isPending } = useSwitchChain();

  if (!isConnected || !chainId) return null;

  const isArcMainnet = chainId === arcMainnet.id;
  const isArcTestnet = chainId === arcTestnet.id;

  if (isArcMainnet || isArcTestnet) return null;

  const handleSwitch = () => {
    switchChain({ chainId: arcMainnet.id });
  };

  return (
    <div className="bg-gradient-to-r from-rose-950 via-amber-950 to-rose-950 border-b border-rose-600/50 px-4 py-2.5 text-xs text-rose-200">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>
            <strong className="font-semibold text-white">Network Isolation Warning:</strong> Wallet connected to unsupported Chain ID <code className="bg-black/40 px-1 py-0.5 rounded text-rose-300">{chainId}</code>. Production transactions are strictly locked to <strong className="text-cyan-300">Arc Mainnet (Chain ID 42424)</strong> to prevent loss of funds.
          </span>
        </div>

        <button
          onClick={handleSwitch}
          disabled={isPending}
          className="flex items-center space-x-1 px-3 py-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors shadow-sm flex-shrink-0"
        >
          <span>Switch to Arc Mainnet</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
