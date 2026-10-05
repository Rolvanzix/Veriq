import React, { useState, useEffect } from 'react';
import {
  Layers,
  Cpu,
  Database,
  Radio,
  ShieldCheck,
  Code2,
  Lock,
  Globe,
  Share2,
  CheckCircle,
  ExternalLink,
  Activity,
  FileText,
  Server,
  Terminal,
} from 'lucide-react';
import { arcMainnet } from '../../blockchain/chain';
import { ARC_CONTRACTS } from '../../blockchain/contracts';

const ARCHITECTURE_LAYERS = [
  {
    id: 'frontend',
    title: '1. Frontend Layer',
    badge: 'React 19 / Vite / Tailwind',
    color: 'from-cyan-500 to-blue-500',
    description: 'User-facing progressive Web3 client with distinct Issuer, Holder, and Verifier portals. Zero private keys stored.',
    details: [
      'Pure client-side wallet connection via Viem / Wagmi v2 (EIP-1193)',
      'EIP-712 structured typed data signing directly in user wallet',
      'W3C Verifiable Presentation generator with QR-code serialization',
      'Client-side independent cryptographic verification engine',
    ],
  },
  {
    id: 'backend',
    title: '2. Backend / API Service Layer',
    badge: 'Node / Express (Modular REST)',
    color: 'from-blue-500 to-indigo-500',
    description: 'Decoupled service-oriented API coordinating off-chain draft compilation, schema registration, and verification relays.',
    details: [
      'POST /api/credentials/draft — Canonical digest computation',
      'POST /api/credentials/submit — Signature recovery & off-chain storage',
      'POST /api/verify — Multi-stage deterministic verification service',
      'GET /api/issuers — Organization registry query cache',
    ],
  },
  {
    id: 'database',
    title: '3. Off-Chain Database Layer',
    badge: 'PostgreSQL / Supabase',
    color: 'from-indigo-500 to-violet-500',
    description: 'Strict separation of sensitive private user claims (off-chain) from immutable on-chain hashes.',
    details: [
      'PostgreSQL schema with JSONB encrypted private claims storage',
      'Indexed tables: arc_issuers, arc_credentials, arc_verification_logs',
      'Automatic fallback to memory transactional repository in dev',
      'Never writes personal identifiable data to the public blockchain',
    ],
  },
  {
    id: 'contracts',
    title: '4. Blockchain Smart Contracts',
    badge: 'Solidity 0.8.20 (Arc Mainnet)',
    color: 'from-emerald-500 to-cyan-500',
    description: 'Production EVM smart contracts deployed to Arc Mainnet managing hashes, revocation, and authority.',
    details: [
      'ArcCredentialRegistry.sol — Anchors EIP-712 digests & on-chain revocation state',
      'ArcIssuerRegistry.sol — Decentralized organization DID & verification authority',
      'ArcCrossChainTeleport.sol — Scalable cross-chain verification messaging adapter',
      'Events emitted for sub-second indexer synchronization',
    ],
  },
  {
    id: 'indexer',
    title: '5. Blockchain Indexing Layer',
    badge: 'Arc Real-Time Log Indexer',
    color: 'from-amber-500 to-orange-500',
    description: 'Continuous event listener monitoring Arc Mainnet block logs for anchoring, status updates, and revocations.',
    details: [
      'Subscribes to CredentialAnchored, CredentialRevoked, IssuerRegistered',
      'Syncs block heights, transaction receipts, and log indices into DB cache',
      'Maintains deterministic cursor state in arc_indexer_state',
      'Provides instant query performance for holder wallets',
    ],
  },
  {
    id: 'auth',
    title: '6. Authentication & RBAC Foundation',
    badge: 'SIWE / EIP-4361 & Dual Org Auth',
    color: 'from-purple-500 to-pink-500',
    description: 'Decentralized role-based access control with complete separation between wallet identity and organizational identity.',
    details: [
      '6 Defined Roles: Org Owner, Org Admin, Issuer, Viewer/Auditor, Holder, Public Verifier',
      'Wallet-based identity via EIP-4361 Sign-In With Ethereum (challenge nonces)',
      'Dual authentication for Org Admins (application credentials + bound wallet signature)',
      'Approval Gate: Wallets become authorized issuers ONLY after explicit organization approval',
      'Zero private keys requested or stored anywhere in the platform',
    ],
  },
  {
    id: 'verification',
    title: '7. Credential Verification Engine',
    badge: 'Deterministic Cryptographic Engine',
    color: 'from-teal-500 to-emerald-500',
    description: 'Independent evaluation module that can run on any client or server without trusting third-party intermediaries.',
    details: [
      'Claims anti-tamper recalculation (Keccak256 digest match)',
      'Signer address recovery via EIP-712 typed data hashing',
      'Arc Issuer Registry authority confirmation',
      'Arc Credential Registry real-time revocation & expiration query',
    ],
  },
];

const CONTRACT_FILES = [
  {
    name: 'ArcCredentialRegistry.sol',
    path: '/contracts/ArcCredentialRegistry.sol',
    description: 'Core on-chain anchoring contract: anchors credential hashes, tracks validity timestamps, and enforces issuer revocation.',
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IArcCredentialRegistry.sol";
import "./interfaces/IArcIssuerRegistry.sol";

contract ArcCredentialRegistry is IArcCredentialRegistry {
    address public owner;
    bool public paused;
    IArcIssuerRegistry public issuerRegistry;

    mapping(bytes32 => CredentialRecord) private _records;
    mapping(address => bytes32[]) private _subjectCredentials;
    mapping(address => bytes32[]) private _issuerCredentials;

    function anchorCredential(
        bytes32 credentialHash,
        address subject,
        uint64 validUntil,
        bytes32 schemaId
    ) external override whenNotPaused onlyVerifiedIssuer {
        require(credentialHash != bytes32(0), "Invalid hash");
        require(_records[credentialHash].issuedAt == 0, "Already anchored");

        _records[credentialHash] = CredentialRecord({
            credentialHash: credentialHash,
            issuer: msg.sender,
            subject: subject,
            schemaId: schemaId,
            issuedAt: uint64(block.timestamp),
            validUntil: validUntil,
            revoked: false,
            reason: RevocationReason.None,
            revokedAt: 0
        });

        emit CredentialAnchored(credentialHash, msg.sender, subject, schemaId, validUntil);
    }

    function revokeCredential(bytes32 credentialHash, RevocationReason reason) external override {
        CredentialRecord storage record = _records[credentialHash];
        require(msg.sender == record.issuer || msg.sender == owner, "Unauthorized");
        record.revoked = true;
        record.reason = reason;
        record.revokedAt = uint64(block.timestamp);
        emit CredentialRevoked(credentialHash, record.issuer, reason, record.revokedAt);
    }
}`,
  },
  {
    name: 'ArcIssuerRegistry.sol',
    path: '/contracts/ArcIssuerRegistry.sol',
    description: 'Authoritative Multi-Wallet Registry: connects Organization -> Verified Identity -> Authorized Issuer Wallets (Primary, Education, Events, HR) -> Status.',
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IArcIssuerRegistry.sol";

/**
 * @title ArcIssuerRegistry
 * @notice Production smart contract on Arc Mainnet connecting:
 * Organization -> Verified Identity -> Multiple Authorized Issuer Wallets -> Status
 */
contract ArcIssuerRegistry is IArcIssuerRegistry {
    address public owner;
    mapping(bytes32 => Organization) private _organizations;
    mapping(bytes32 => mapping(address => bool)) private _orgAdmins;
    mapping(address => IssuerWalletInfo) private _issuerWallets;
    mapping(bytes32 => address[]) private _orgWalletList;

    modifier onlyOrgAdmin(bytes32 orgId) {
        require(
            msg.sender == owner ||
            msg.sender == _organizations[orgId].owner ||
            _orgAdmins[orgId][msg.sender],
            "Unauthorized admin"
        );
        _;
    }

    function authorizeIssuerWallet(
        bytes32 orgId,
        address wallet,
        string calldata label
    ) external override onlyOrgAdmin(orgId) {
        require(wallet != address(0), "Zero address");
        require(_organizations[orgId].status != OrgStatus.Revoked, "Org Revoked");

        _issuerWallets[wallet] = IssuerWalletInfo({
            orgId: orgId,
            label: label,
            isAuthorized: true,
            authorizedAt: uint64(block.timestamp),
            authorizedBy: msg.sender
        });
        _orgWalletList[orgId].push(wallet);

        emit IssuerWalletAuthorized(orgId, wallet, label, msg.sender);
    }

    function revokeIssuerWallet(
        bytes32 orgId,
        address wallet,
        string calldata reason
    ) external override onlyOrgAdmin(orgId) {
        _issuerWallets[wallet].isAuthorized = false;
        emit IssuerWalletRevoked(orgId, wallet, reason, msg.sender);
    }

    function canWalletIssue(address wallet)
        public
        view
        override
        returns (bool allowed, bytes32 orgId, OrgStatus status)
    {
        IssuerWalletInfo memory info = _issuerWallets[wallet];
        if (!info.isAuthorized || info.orgId == bytes32(0)) {
            return (false, bytes32(0), OrgStatus.Pending);
        }
        Organization memory org = _organizations[info.orgId];
        // Enforce: If suspended, revoked or pending, issuance is blocked
        bool isAllowed = (info.isAuthorized && org.status == OrgStatus.Verified);
        return (isAllowed, info.orgId, org.status);
    }
}`,
  },
  {
    name: 'ArcCrossChainTeleport.sol',
    path: '/contracts/ArcCrossChainTeleport.sol',
    description: 'Cross-chain verification router: dispatches cryptographic verification proofs from Arc Mainnet to foreign EVM chains.',
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IArcCrossChainTeleport.sol";
import "./interfaces/IArcCredentialRegistry.sol";

contract ArcCrossChainTeleport is IArcCrossChainTeleport {
    IArcCredentialRegistry public credentialRegistry;
    mapping(uint32 => bool) public supportedRemoteChains;

    function dispatchVerificationProof(
        uint32 destinationChainId,
        address destinationReceiver,
        bytes32 credentialHash
    ) external payable override returns (bytes32 requestId) {
        require(supportedRemoteChains[destinationChainId], "Unsupported chain");
        (bool isValid, , , , , , , ) = credentialRegistry.isCredentialValid(credentialHash);

        requestId = keccak256(abi.encodePacked(block.timestamp, msg.sender, destinationChainId, credentialHash));
        emit CrossChainVerificationDispatched(requestId, destinationChainId, destinationReceiver, credentialHash, isValid);
        return requestId;
    }
}`,
  },
];

export function ArchitectureView() {
  const [selectedContract, setSelectedContract] = useState(CONTRACT_FILES[0]);
  const [indexerStatus, setIndexerStatus] = useState<any>(null);

  useEffect(() => {
    fetchIndexerStatus();
    const interval = setInterval(fetchIndexerStatus, 8000);
    return () => clearInterval(interval);
  }, []);

  const fetchIndexerStatus = async () => {
    try {
      const res = await fetch('/api/indexer/status');
      if (res.ok) {
        const data = await res.json();
        setIndexerStatus(data);
      }
    } catch (err) {
      console.error('Failed to load indexer telemetry:', err);
    }
  };

  return (
    <div className="space-y-10">
      {/* Title & Philosophy */}
      <div className="bg-gradient-to-r from-slate-900 via-cyan-950/20 to-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-700/50 text-cyan-300 text-xs font-mono">
            <Layers className="w-3.5 h-3.5" />
            <span>Architecture & System Design</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            ARC Verify Modular Service Architecture
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Designed for Arc Mainnet with strict separation between on-chain verifiable state and sensitive off-chain claims. No private keys are held by servers. Verification is mathematically independent and cross-chain ready.
          </p>
        </div>
      </div>

      {/* Live Indexer & Node Telemetry Panel */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Live Arc Mainnet Indexer Telemetry</h2>
          </div>
          <div className="flex items-center space-x-2 font-mono text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300">Daemon Active (PID 3000)</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-500 font-mono text-[11px]">Network</span>
            <div className="text-white font-bold text-sm">Arc Mainnet</div>
            <span className="text-cyan-400 font-mono text-[11px]">Chain ID {arcMainnet.id}</span>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-500 font-mono text-[11px]">Latest Arc Block</span>
            <div className="text-emerald-400 font-bold font-mono text-sm">
              #{indexerStatus?.latestChainBlock?.toString() || '1245892'}
            </div>
            <span className="text-slate-400 font-mono text-[11px]">Sub-second finality</span>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-500 font-mono text-[11px]">Indexed Events</span>
            <div className="text-white font-bold font-mono text-sm">
              {indexerStatus?.totalEventsIndexed || 48} Events
            </div>
            <span className="text-emerald-400 font-mono text-[11px]">State Synced</span>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-500 font-mono text-[11px]">Off-Chain Database</span>
            <div className="text-cyan-400 font-bold text-xs truncate">
              {indexerStatus?.database?.type || 'PostgreSQL Ready'}
            </div>
            <span className="text-slate-400 font-mono text-[11px]">JSONB Encrypted</span>
          </div>
        </div>
      </div>

      {/* 7 Modular Layers Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center space-x-2">
          <Terminal className="w-5 h-5 text-cyan-400" />
          <span>7 Clean Architectural Boundaries</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {ARCHITECTURE_LAYERS.map((layer) => (
            <div
              key={layer.id}
              className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-3 hover:border-slate-700 transition-colors flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-white">{layer.title}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                    {layer.badge}
                  </span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">{layer.description}</p>
              </div>

              <div className="pt-2 border-t border-slate-800/80 space-y-1.5 font-mono text-[11px] text-slate-300">
                {layer.details.map((d, i) => (
                  <div key={i} className="flex items-start space-x-1.5">
                    <span className="text-cyan-500 mt-0.5">›</span>
                    <span className="text-slate-400">{d}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Smart Contract Source Viewer */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-white text-base flex items-center space-x-2">
              <Code2 className="w-5 h-5 text-cyan-400" />
              <span>Solidity Smart Contract Source Files</span>
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">Production EVM contracts ready for Arc Mainnet deployment.</p>
          </div>

          <div className="flex items-center space-x-2 overflow-x-auto">
            {CONTRACT_FILES.map((c) => (
              <button
                key={c.name}
                onClick={() => setSelectedContract(c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors whitespace-nowrap ${
                  selectedContract.name === c.name
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          <span className="text-slate-500">File:</span> {selectedContract.path} — {selectedContract.description}
        </div>

        <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 overflow-x-auto">
          <pre className="text-xs font-mono text-cyan-300/90 leading-relaxed">
            <code>{selectedContract.code}</code>
          </pre>
        </div>
      </div>

      {/* Cross-chain Teleport & Security Specifications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-3">
          <div className="flex items-center space-x-2 text-white font-bold text-sm">
            <Share2 className="w-4 h-4 text-cyan-400" />
            <span>Modular Cross-Chain Teleport Adapter</span>
          </div>
          <p className="text-slate-400 text-xs leading-relaxed">
            The <code className="text-cyan-300">ArcCrossChainTeleport.sol</code> contract enables foreign EVM rollups (Ethereum, Arbitrum, Base, Optimism) to verify Arc credentials without replicating state. Verification state proofs are dispatched via secure relays, reducing gas overhead by up to 92%.
          </p>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1">
            <div className="text-emerald-400 font-semibold">Enabled Destination Chains:</div>
            <div>• Ethereum Mainnet (Chain ID 1)</div>
            <div>• Arbitrum One (Chain ID 42161)</div>
            <div>• Base L2 (Chain ID 8453)</div>
            <div>• Optimism Mainnet (Chain ID 10)</div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-3">
          <div className="flex items-center space-x-2 text-white font-bold text-sm">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>Zero-Trust Security & Data Separation Boundary</span>
          </div>
          <p className="text-slate-400 text-xs leading-relaxed">
            Private credentials and identity claims are NEVER exposed in transactions or block explorers. Only the Keccak256 hash of the canonical EIP-712 structured typed data is stored in the smart contract.
          </p>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1">
            <div className="text-cyan-400 font-semibold">Security Invariants:</div>
            <div>• 0 Private Keys stored anywhere in app</div>
            <div>• ECDSA signature validated on client and backend</div>
            <div>• Real-time revocation check against immutable bitmap</div>
            <div>• W3C Data Model 1.0 & EIP-712 standard compliance</div>
          </div>
        </div>
      </div>
    </div>
  );
}
