import React from 'react';
import { Shield, Database, Cpu, Globe, CheckCircle2 } from 'lucide-react';
import { arcMainnet } from '../../blockchain/chain';
import { ARC_CONTRACTS } from '../../blockchain/contracts';

export function Footer() {
  return (
    <footer className="border-t border-slate-800/80 bg-[#0a0e17] py-8 text-xs text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div>
            <div className="flex items-center space-x-2 text-white font-bold text-sm mb-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span>ARC Verify</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Decentralized W3C-compliant credential anchoring and cryptographic verification platform native to Arc Mainnet.
            </p>
          </div>

          <div>
            <span className="font-semibold text-slate-200 block mb-2 font-mono text-[11px] uppercase tracking-wider">
              Arc Network Contracts
            </span>
            <ul className="space-y-1.5 font-mono text-[11px]">
              <li>
                <span className="text-slate-500">Credential Registry:</span>{' '}
                <span className="text-cyan-400">{ARC_CONTRACTS.CREDENTIAL_REGISTRY.slice(0, 10)}...</span>
              </li>
              <li>
                <span className="text-slate-500">Issuer Registry:</span>{' '}
                <span className="text-cyan-400">{ARC_CONTRACTS.ISSUER_REGISTRY.slice(0, 10)}...</span>
              </li>
              <li>
                <span className="text-slate-500">Teleport Router:</span>{' '}
                <span className="text-cyan-400">{ARC_CONTRACTS.CROSS_CHAIN_TELEPORT.slice(0, 10)}...</span>
              </li>
            </ul>
          </div>

          <div>
            <span className="font-semibold text-slate-200 block mb-2 font-mono text-[11px] uppercase tracking-wider">
              Network Parameters
            </span>
            <ul className="space-y-1.5 text-[11px]">
              <li className="flex items-center space-x-2">
                <span className="text-slate-500">Chain:</span>
                <span className="text-slate-300 font-mono">Arc Mainnet (EVM)</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-slate-500">Chain ID:</span>
                <span className="text-slate-300 font-mono">{arcMainnet.id}</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-slate-500">Finality:</span>
                <span className="text-emerald-400 font-mono">Sub-second deterministic</span>
              </li>
            </ul>
          </div>

          <div>
            <span className="font-semibold text-slate-200 block mb-2 font-mono text-[11px] uppercase tracking-wider">
              Security Protocol
            </span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Zero private keys stored. Personal claims retained off-chain in encrypted storage. Cryptographic hashes anchored on Arc immutable ledger.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between text-slate-500 text-[11px]">
          <div>© {new Date().getFullYear()} ARC Verify Protocol. Designed for Arc Mainnet EVM.</div>
          <div className="flex items-center space-x-4 mt-2 sm:mt-0 font-mono">
            <span className="flex items-center space-x-1 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Standard: W3C VC 1.0 & EIP-712</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
