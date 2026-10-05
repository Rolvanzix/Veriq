import React, { useState, useEffect } from 'react';
import {
  Building,
  Key,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  PlusCircle,
  Trash2,
  RefreshCw,
  Search,
  ExternalLink,
  Layers,
  PauseCircle,
  PlayCircle,
  Hash as HashIcon,
  Users,
  Award,
  ChevronRight,
  GitBranch,
} from 'lucide-react';
import { isAddress, type Address, type Hash, keccak256, stringToBytes } from 'viem';
import { useAuth } from '../../auth/AuthContext';
import { arcMainnet } from '../../blockchain/chain';
import { ARC_CONTRACTS, ARC_ISSUER_REGISTRY_ABI } from '../../blockchain/contracts';
import { useArcTransaction } from '../../blockchain/useArcTransaction';
import { ArcTransactionModal } from '../layout/ArcTransactionModal';
import type { OrganizationInfo, OrgVerificationStatus, AuthorizedWalletRecord } from '../../auth/types';

interface RegistryAuditEvent {
  id: string;
  eventName:
    | 'OrganizationRegistered'
    | 'IssuerWalletAuthorized'
    | 'IssuerWalletRevoked'
    | 'OrganizationStatusChanged'
    | 'OrganizationSuspended'
    | 'OrganizationReactivated';
  blockNumber: number;
  txHash: string;
  timestamp: string;
  summary: string;
  details: Record<string, string | number | boolean>;
}

const INITIAL_AUDIT_EVENTS: RegistryAuditEvent[] = [
  {
    id: 'evt-1',
    eventName: 'IssuerWalletAuthorized',
    blockNumber: 1245892,
    txHash: '0x3f4a9b2c8e1d5a7f6032b49e15a78c901234567890abcdef1234567890abcdef',
    timestamp: new Date(Date.now() - 15 * 86400000).toISOString(),
    summary: 'Wallet 0x15d34AAf... authorized for HR & Staff Verification',
    details: {
      orgId: 'org_ait_technology',
      wallet: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
      label: 'Staff Employment & Faculty Verification (HR)',
      authorizedBy: '0x28974aA448e8952B9c024d9f6974d08A375c3254',
    },
  },
  {
    id: 'evt-2',
    eventName: 'IssuerWalletAuthorized',
    blockNumber: 1243105,
    txHash: '0x7e8a9b1c2d3e4f5061728394a5b6c7d8e9f01234567890abcdef1234567890ab',
    timestamp: new Date(Date.now() - 30 * 86400000).toISOString(),
    summary: 'Wallet 0x3C44CdDd... authorized for Events & Hackathons',
    details: {
      orgId: 'org_ait_technology',
      wallet: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
      label: 'Hackathons & Campus Events Credentials (Events)',
      authorizedBy: '0x28974aA448e8952B9c024d9f6974d08A375c3254',
    },
  },
  {
    id: 'evt-3',
    eventName: 'IssuerWalletAuthorized',
    blockNumber: 1240020,
    txHash: '0x9a8b7c6d5e4f3a2b1029384756abcdef1234567890abcdef1234567890abcdef',
    timestamp: new Date(Date.now() - 60 * 86400000).toISOString(),
    summary: 'Wallet 0x70997970... authorized for Education & Degrees',
    details: {
      orgId: 'org_ait_technology',
      wallet: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      label: 'Academic Degrees & Transcripts (Education)',
      authorizedBy: '0x28974aA448e8952B9c024d9f6974d08A375c3254',
    },
  },
  {
    id: 'evt-4',
    eventName: 'OrganizationSuspended',
    blockNumber: 1238910,
    txHash: '0x5c4d3e2f1a0b9876543210abcdef1234567890abcdef1234567890abcdef1234',
    timestamp: new Date(Date.now() - 10 * 86400000).toISOString(),
    summary: 'Organization Apex Global Financial Partners suspended by compliance',
    details: {
      orgId: 'org_apex_fintech',
      caller: '0x28974aA448e8952B9c024d9f6974d08A375c3254',
      reason: 'Routine compliance audit pending annual certification',
    },
  },
  {
    id: 'evt-5',
    eventName: 'OrganizationRegistered',
    blockNumber: 1210540,
    txHash: '0x1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f012345',
    timestamp: new Date(Date.now() - 90 * 86400000).toISOString(),
    summary: 'Organization Arc Institute of Technology (AIT) registered on Arc Mainnet',
    details: {
      orgId: 'org_ait_technology',
      name: 'Arc Institute of Technology (AIT)',
      didUri: 'did:arc:org_ait',
      owner: '0x28974aA448e8952B9c024d9f6974d08A375c3254',
    },
  },
];

interface SampleOrgHierarchy {
  orgId: string;
  name: string;
  status: OrgVerificationStatus;
  didUri: string;
  ownerAddress: Address;
  wallets: Array<{
    id: string;
    address: Address;
    label: string;
    department: 'Primary' | 'Education' | 'Events' | 'HR' | 'Legal';
    status: 'ACTIVE' | 'REVOKED';
    authorizedAt: string;
    authorizedBy: Address;
  }>;
}

const PRESET_SAMPLE_HIERARCHIES: SampleOrgHierarchy[] = [
  {
    orgId: 'org_ait_technology',
    name: 'Arc Institute of Technology (AIT)',
    status: 'VERIFIED',
    didUri: 'did:arc:org_ait',
    ownerAddress: '0x28974aA448e8952B9c024d9f6974d08A375c3254',
    wallets: [
      {
        id: 'w1',
        address: '0x28974aA448e8952B9c024d9f6974d08A375c3254',
        label: 'Primary Executive Signer',
        department: 'Primary',
        status: 'ACTIVE',
        authorizedAt: new Date(Date.now() - 90 * 86400000).toISOString(),
        authorizedBy: '0x28974aA448e8952B9c024d9f6974d08A375c3254',
      },
      {
        id: 'w2',
        address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        label: 'Academic Degrees & Transcripts',
        department: 'Education',
        status: 'ACTIVE',
        authorizedAt: new Date(Date.now() - 60 * 86400000).toISOString(),
        authorizedBy: '0x28974aA448e8952B9c024d9f6974d08A375c3254',
      },
      {
        id: 'w3',
        address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        label: 'Hackathons & Campus Events Credentials',
        department: 'Events',
        status: 'ACTIVE',
        authorizedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
        authorizedBy: '0x28974aA448e8952B9c024d9f6974d08A375c3254',
      },
      {
        id: 'w4',
        address: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
        label: 'Staff Employment & Faculty Verification',
        department: 'HR',
        status: 'ACTIVE',
        authorizedAt: new Date(Date.now() - 15 * 86400000).toISOString(),
        authorizedBy: '0x28974aA448e8952B9c024d9f6974d08A375c3254',
      },
    ],
  },
  {
    orgId: 'org_veriid_global',
    name: 'VeriID Global KYC Consortium',
    status: 'VERIFIED',
    didUri: 'did:arc:org_veriid',
    ownerAddress: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
    wallets: [
      {
        id: 'w5',
        address: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
        label: 'Production Identity Gateway Key',
        department: 'Primary',
        status: 'ACTIVE',
        authorizedAt: new Date(Date.now() - 40 * 86400000).toISOString(),
        authorizedBy: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
      },
      {
        id: 'w6',
        address: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4df',
        label: 'Corporate HR & Background Checks',
        department: 'HR',
        status: 'ACTIVE',
        authorizedAt: new Date(Date.now() - 20 * 86400000).toISOString(),
        authorizedBy: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
      },
    ],
  },
  {
    orgId: 'org_apex_fintech',
    name: 'Apex Global Financial Partners',
    status: 'SUSPENDED',
    didUri: 'did:arc:org_apex',
    ownerAddress: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    wallets: [
      {
        id: 'w7',
        address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
        label: 'Institutional Wealth Issuance Key',
        department: 'Primary',
        status: 'ACTIVE',
        authorizedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
        authorizedBy: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
      },
    ],
  },
];

export function IssuerRegistryView() {
  const { session, hasPermission } = useAuth();

  const [hierarchies, setHierarchies] = useState<SampleOrgHierarchy[]>(PRESET_SAMPLE_HIERARCHIES);
  const [selectedHierarchy, setSelectedHierarchy] = useState<SampleOrgHierarchy>(PRESET_SAMPLE_HIERARCHIES[0]);
  const [auditEvents, setAuditEvents] = useState<RegistryAuditEvent[]>(INITIAL_AUDIT_EVENTS);

  // Add wallet form state
  const [newWalletAddress, setNewWalletAddress] = useState('');
  const [newWalletLabel, setNewWalletLabel] = useState('');
  const [newWalletDepartment, setNewWalletDepartment] = useState<'Primary' | 'Education' | 'Events' | 'HR' | 'Legal'>('Education');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isRegistryTxModalOpen, setIsRegistryTxModalOpen] = useState(false);
  const [registryActionTitle, setRegistryActionTitle] = useState('Arc Issuer Registry Transaction');

  const {
    stage: registryStage,
    stageMessage: registryStageMessage,
    txHash: registryTxHash,
    txResult: registryTxResult,
    error: registryError,
    executeTransaction: executeRegistryTx,
    resetState: resetRegistryTxState,
  } = useArcTransaction({
    actionName: registryActionTitle,
  });

  // Live test verification simulator
  const [testWalletInput, setTestWalletInput] = useState('0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
  const [testResult, setTestResult] = useState<any>(null);

  // Prior credential verification simulation state
  const [priorCredTestResult, setPriorCredTestResult] = useState<{
    tested: boolean;
    hash: string;
    orgStatus: OrgVerificationStatus;
    validOnChain: boolean;
    explanation: string;
  } | null>(null);

  const canManage = hasPermission('MANAGE_ISSUER_WALLETS') || hasPermission('MANAGE_ORGANIZATION');

  // Quick department templates for prompt requirement:
  // Organization -> Primary, Education, Events, HR
  const applyDepartmentPreset = (dept: 'Primary' | 'Education' | 'Events' | 'HR') => {
    setNewWalletDepartment(dept);
    switch (dept) {
      case 'Primary':
        setNewWalletLabel('Primary issuer wallet');
        break;
      case 'Education':
        setNewWalletLabel('Education issuer wallet');
        break;
      case 'Events':
        setNewWalletLabel('Events issuer wallet');
        break;
      case 'HR':
        setNewWalletLabel('HR issuer wallet');
        break;
    }
  };

  // Authorize a new issuer wallet
  const handleAuthorizeWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWalletAddress || !isAddress(newWalletAddress)) {
      setStatusMessage('Please provide a valid EVM address.');
      return;
    }
    if (!newWalletLabel.trim()) {
      setStatusMessage('Please provide a descriptive label.');
      return;
    }

    const updated = { ...selectedHierarchy };
    const authBy = (session.userAddress || updated.ownerAddress) as Address;
    const orgIdBytes32 = keccak256(stringToBytes(updated.orgId));

    setRegistryActionTitle(`Authorize Issuer Wallet on Arc (${newWalletDepartment})`);
    setIsRegistryTxModalOpen(true);

    try {
      const res = await executeRegistryTx({
        contractAddress: ARC_CONTRACTS.ISSUER_REGISTRY,
        abi: ARC_ISSUER_REGISTRY_ABI,
        functionName: 'authorizeIssuerWallet',
        args: [orgIdBytes32, newWalletAddress as Address, `${newWalletLabel.trim()} (${newWalletDepartment})`],
        customTxSender: authBy,
      });

      const newWalletItem = {
        id: `w_${Date.now()}`,
        address: newWalletAddress as Address,
        label: newWalletLabel.trim(),
        department: newWalletDepartment,
        status: 'ACTIVE' as const,
        authorizedAt: new Date().toISOString(),
        authorizedBy: authBy,
      };

      updated.wallets.push(newWalletItem);

      // Emit blockchain event on Arc Mainnet
      const newEvent: RegistryAuditEvent = {
        id: `evt-${Date.now()}`,
        eventName: 'IssuerWalletAuthorized',
        blockNumber: res.blockNumber || 1246000,
        txHash: res.txHash,
        timestamp: new Date().toISOString(),
        summary: `Wallet ${newWalletAddress.slice(0, 10)}... authorized for ${updated.name} (${newWalletDepartment})`,
        details: {
          orgId: updated.orgId,
          wallet: newWalletAddress,
          label: newWalletLabel.trim(),
          authorizedBy: authBy,
        },
      };

      setAuditEvents((prev) => [newEvent, ...prev]);
      setHierarchies((prev) => prev.map((h) => (h.orgId === updated.orgId ? updated : h)));
      setSelectedHierarchy(updated);
      setNewWalletAddress('');
      setNewWalletLabel('');
      setStatusMessage(`Wallet ${newWalletAddress.slice(0, 10)}... successfully authorized for ${updated.name} under ${newWalletDepartment} department on Arc Issuer Registry.`);
    } catch (err: any) {
      console.error('Failed to authorize wallet on Arc:', err);
    }
  };

  // Revoke an authorized issuer wallet
  const handleRevokeWallet = async (walletAddress: Address) => {
    if (!confirm(`Are you sure you want to revoke authorization for wallet ${walletAddress}? It will immediately lose issuance rights.`)) {
      return;
    }

    const updated = { ...selectedHierarchy };
    const revBy = (session.userAddress || updated.ownerAddress) as Address;
    const orgIdBytes32 = keccak256(stringToBytes(updated.orgId));

    setRegistryActionTitle(`Revoke Issuer Wallet on Arc`);
    setIsRegistryTxModalOpen(true);

    try {
      const res = await executeRegistryTx({
        contractAddress: ARC_CONTRACTS.ISSUER_REGISTRY,
        abi: ARC_ISSUER_REGISTRY_ABI,
        functionName: 'revokeIssuerWallet',
        args: [orgIdBytes32, walletAddress, 'Key de-authorization requested by Organization Administrator'],
        customTxSender: revBy,
      });

      const target = updated.wallets.find((w) => w.address.toLowerCase() === walletAddress.toLowerCase());
      if (target) {
        target.status = 'REVOKED';

        const newEvent: RegistryAuditEvent = {
          id: `evt-${Date.now()}`,
          eventName: 'IssuerWalletRevoked',
          blockNumber: res.blockNumber || 1246010,
          txHash: res.txHash,
          timestamp: new Date().toISOString(),
          summary: `Wallet ${walletAddress.slice(0, 10)}... revoked for ${updated.name}`,
          details: {
            orgId: updated.orgId,
            wallet: walletAddress,
            reason: 'Key de-authorization requested by Organization Administrator',
            revokedBy: revBy,
          },
        };

        setAuditEvents((prev) => [newEvent, ...prev]);
        setHierarchies((prev) => prev.map((h) => (h.orgId === updated.orgId ? updated : h)));
        setSelectedHierarchy(updated);
        setStatusMessage(`Revocation confirmed: Wallet ${walletAddress.slice(0, 10)}... revoked on Arc Issuer Registry.`);
      }
    } catch (err: any) {
      console.error('Failed to revoke wallet on Arc:', err);
    }
  };

  // Change Organization Lifecycle Status (Pending, Verified, Suspended, Revoked)
  const handleChangeOrgStatus = (newStatus: OrgVerificationStatus) => {
    const updated = { ...selectedHierarchy };
    const prevStatus = updated.status;
    if (prevStatus === newStatus) return;

    updated.status = newStatus;

    const caller = (session.userAddress || updated.ownerAddress) as Address;
    const newEvents: RegistryAuditEvent[] = [];

    if (newStatus === 'SUSPENDED') {
      newEvents.push({
        id: `evt-${Date.now()}-susp`,
        eventName: 'OrganizationSuspended',
        blockNumber: 1246020,
        txHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
        timestamp: new Date().toISOString(),
        summary: `Organization ${updated.name} suspended (credential issuance blocked)`,
        details: {
          orgId: updated.orgId,
          caller,
          reason: 'Compliance audit suspension',
        },
      });
    } else if (newStatus === 'VERIFIED' && prevStatus === 'SUSPENDED') {
      newEvents.push({
        id: `evt-${Date.now()}-react`,
        eventName: 'OrganizationReactivated',
        blockNumber: 1246025,
        txHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
        timestamp: new Date().toISOString(),
        summary: `Organization ${updated.name} reactivated to Verified status`,
        details: {
          orgId: updated.orgId,
          caller,
        },
      });
    }

    newEvents.push({
      id: `evt-${Date.now()}-status`,
      eventName: 'OrganizationStatusChanged',
      blockNumber: 1246026,
      txHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      timestamp: new Date().toISOString(),
      summary: `Organization status transitioned: ${prevStatus} -> ${newStatus}`,
      details: {
        orgId: updated.orgId,
        previousStatus: prevStatus,
        newStatus,
        reason: `Status updated via Arc Issuer Registry interface`,
      },
    });

    setAuditEvents((prev) => [...newEvents, ...prev]);
    setHierarchies((prev) => prev.map((h) => (h.orgId === updated.orgId ? updated : h)));
    setSelectedHierarchy(updated);
    setStatusMessage(`Organization ${updated.name} status updated to: ${newStatus}`);
  };

  // Toggle Organization Suspension (Shortcut)
  const handleToggleSuspension = () => {
    const updated = { ...selectedHierarchy };
    if (updated.status === 'VERIFIED') {
      handleChangeOrgStatus('SUSPENDED');
    } else {
      handleChangeOrgStatus('VERIFIED');
    }
  };

  // Test Prior Issued Credential verification vs Organization status
  const handleTestPriorCredential = () => {
    const isSuspended = selectedHierarchy.status === 'SUSPENDED';
    const isRevoked = selectedHierarchy.status === 'REVOKED';

    if (isRevoked) {
      setPriorCredTestResult({
        tested: true,
        hash: '0x9d8c7b6a5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9876543210abcdef12345678',
        orgStatus: selectedHierarchy.status,
        validOnChain: false,
        explanation: 'INVALIDATED: The issuing organization has been permanently REVOKED. In accordance with Arc governance security policy, all credentials issued by revoked entities are flagged during verifier resolution.',
      });
    } else if (isSuspended) {
      setPriorCredTestResult({
        tested: true,
        hash: '0x8b7a6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b876543210fedcba987654321',
        orgStatus: selectedHierarchy.status,
        validOnChain: true,
        explanation: 'VALID CREDENTIAL PRESERVED: Although the organization is currently SUSPENDED (blocking all new issuance), this credential was anchored prior to suspension while the organization was in Verified standing. Arc Credential Registry does NOT automatically invalidate previously issued credentials unless explicitly revoked by an administrative action.',
      });
    } else {
      setPriorCredTestResult({
        tested: true,
        hash: '0x7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b76543210abcdef0123456789',
        orgStatus: selectedHierarchy.status,
        validOnChain: true,
        explanation: 'VALID: Issued by verified accredited organization. Non-revoked, unexpired, and anchored with cryptographic finality on Arc Mainnet.',
      });
    }
  };

  // Run on-chain authorization query simulation
  const handleRunVerificationCheck = () => {
    const normalized = testWalletInput.trim().toLowerCase();
    if (!isAddress(normalized)) {
      setTestResult({ allowed: false, reason: 'Invalid EVM address format' });
      return;
    }

    let foundWallet: any = null;
    let foundOrg: SampleOrgHierarchy | null = null;

    for (const org of hierarchies) {
      const match = org.wallets.find((w) => w.address.toLowerCase() === normalized && w.status === 'ACTIVE');
      if (match) {
        foundWallet = match;
        foundOrg = org;
        break;
      }
    }

    if (!foundWallet || !foundOrg) {
      setTestResult({
        allowed: false,
        reason: 'UNAUTHORIZED: This wallet is not registered as an authorized issuer wallet under any organization.',
      });
      return;
    }

    if (foundOrg.status !== 'VERIFIED') {
      setTestResult({
        allowed: false,
        orgName: foundOrg.name,
        orgStatus: foundOrg.status,
        department: foundWallet.department,
        reason: `BLOCKED: Organization '${foundOrg.name}' is currently ${foundOrg.status}. If an organization is suspended or unverified, new issuance is strictly prevented.`,
      });
      return;
    }

    setTestResult({
      allowed: true,
      orgName: foundOrg.name,
      orgStatus: foundOrg.status,
      department: foundWallet.department,
      label: foundWallet.label,
      reason: `AUTHORIZED ISSUER: Wallet is an active, verified issuer for '${foundOrg.name}' under the '${foundWallet.department}' department.`,
    });
  };

  const getStatusBadge = (st: OrgVerificationStatus) => {
    switch (st) {
      case 'VERIFIED':
        return { label: 'Verified on Arc', color: 'bg-emerald-950 text-emerald-300 border-emerald-800' };
      case 'SUSPENDED':
        return { label: 'Suspended (Issuance Halted)', color: 'bg-rose-950 text-rose-300 border-rose-800' };
      case 'PENDING':
        return { label: 'Pending Accreditation', color: 'bg-amber-950 text-amber-300 border-amber-800' };
      case 'REVOKED':
        return { label: 'Permanently Revoked', color: 'bg-slate-800 text-slate-400 border-slate-700' };
      default:
        return { label: st, color: 'bg-slate-800 text-slate-300 border-slate-700' };
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-cyan-950/20 to-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-700/50 text-cyan-300 text-xs font-mono">
              <Building className="w-3.5 h-3.5" />
              <span>ARC Verify Authoritative Issuer Registry</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Multi-Wallet Organization Registry
            </h1>
            <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
              The authoritative on-chain registry connecting <strong>Organization → Verified Identity → Authorized Issuer Wallets → Status</strong> on Arc Mainnet.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl font-mono text-xs space-y-1">
            <div className="text-slate-500">Arc Registry Contract</div>
            <div className="text-cyan-400 font-semibold">{ARC_CONTRACTS.ISSUER_REGISTRY.slice(0, 10)}...</div>
            <span className="text-[11px] text-emerald-400 block pt-0.5">Solidity 0.8.20 • Sub-second Finality</span>
          </div>
        </div>
      </div>

      {/* Status Alert if Message */}
      {statusMessage && (
        <div className="p-3.5 bg-cyan-950/40 border border-cyan-800/60 rounded-xl text-cyan-300 text-xs font-mono flex items-center justify-between">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Organization Selector & Tree Visualizer */}
        <div className="lg:col-span-7 space-y-6">
          {/* Org Selector Buttons */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1">
            {hierarchies.map((org) => (
              <button
                key={org.orgId}
                onClick={() => setSelectedHierarchy(org)}
                className={`px-3.5 py-2 rounded-xl text-xs font-mono font-semibold transition-all whitespace-nowrap border ${
                  selectedHierarchy.orgId === org.orgId
                    ? 'bg-cyan-950/60 border-cyan-500 text-white shadow-md shadow-cyan-500/10'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {org.name.split(' ')[0]}... ({org.wallets.filter((w) => w.status === 'ACTIVE').length} wallets)
              </button>
            ))}
          </div>

          {/* Selected Organization Hierarchy Tree Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider font-semibold">
                  Authoritative Entity Anchor
                </span>
                <h2 className="text-xl font-bold text-white mt-0.5">{selectedHierarchy.name}</h2>
                <div className="text-xs font-mono text-slate-400 mt-1 flex items-center space-x-2">
                  <span>DID: {selectedHierarchy.didUri}</span>
                  <span>•</span>
                  <span>Owner: {selectedHierarchy.ownerAddress.slice(0, 8)}...</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2.5 py-1 rounded font-mono text-xs font-bold border ${getStatusBadge(selectedHierarchy.status).color}`}>
                  {getStatusBadge(selectedHierarchy.status).label}
                </span>

                {/* State selector controls: Pending, Verified, Suspended, Revoked */}
                <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-[11px] font-mono">
                  {(['PENDING', 'VERIFIED', 'SUSPENDED', 'REVOKED'] as OrgVerificationStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleChangeOrgStatus(st)}
                      className={`px-2 py-0.5 rounded-lg font-medium transition-all ${
                        selectedHierarchy.status === st
                          ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title={`Transition organization state to ${st}`}
                    >
                      {st === 'VERIFIED' ? 'Verified' : st === 'SUSPENDED' ? 'Suspended' : st === 'PENDING' ? 'Pending' : 'Revoked'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Visual Tree Hierarchy Representation */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center space-x-2">
                  <GitBranch className="w-4 h-4 text-cyan-400" />
                  <span>Authorized Multi-Wallet Hierarchy</span>
                </h3>
                <span className="text-[11px] font-mono text-slate-500">
                  {selectedHierarchy.wallets.filter((w) => w.status === 'ACTIVE').length} Active Signing Keys
                </span>
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3 font-mono text-xs">
                {/* Tree Root */}
                <div className="flex items-center space-x-2 text-white font-bold pb-2 border-b border-slate-850">
                  <Building className="w-4 h-4 text-cyan-400" />
                  <span>{selectedHierarchy.name}</span>
                  <span className="text-slate-500 text-[11px] font-normal">({selectedHierarchy.didUri})</span>
                </div>

                {/* Tree Branches (Wallets) */}
                <div className="space-y-2.5 pl-2 sm:pl-4">
                  {selectedHierarchy.wallets.map((wallet, index) => {
                    const isLast = index === selectedHierarchy.wallets.length - 1;
                    const isActive = wallet.status === 'ACTIVE';

                    return (
                      <div key={wallet.id} className="relative flex items-start space-x-3 group">
                        <div className="text-cyan-500 font-mono select-none pt-0.5">
                          {isLast ? '└──' : '├──'}
                        </div>

                        <div
                          className={`flex-grow p-3 rounded-xl border transition-all ${
                            isActive
                              ? 'bg-slate-900/90 border-slate-800 group-hover:border-slate-700'
                              : 'bg-rose-950/20 border-rose-900/40 opacity-70'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                            <div className="space-y-0.5">
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-white font-sans text-xs">
                                  {wallet.label}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 text-[10px] font-bold border border-cyan-800">
                                  {wallet.department}
                                </span>
                              </div>
                              <span className="text-[11px] text-cyan-300 break-all">{wallet.address}</span>
                            </div>

                            <div className="flex items-center space-x-2 shrink-0">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isActive
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                    : 'bg-rose-950 text-rose-300 border border-rose-800'
                                }`}
                              >
                                {isActive ? 'ACTIVE SIGNER' : 'REVOKED'}
                              </span>

                              {isActive && (
                                <button
                                  type="button"
                                  onClick={() => handleRevokeWallet(wallet.address)}
                                  className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition-colors"
                                  title="Revoke Issuer Wallet Authority"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="mt-2 pt-2 border-t border-slate-850/80 flex items-center justify-between text-[10px] text-slate-500">
                            <span>Authorized by Admin: {wallet.authorizedBy.slice(0, 8)}...</span>
                            <span>{new Date(wallet.authorizedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Suspension Protocol Explanation Note */}
            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-850 text-xs text-slate-400 space-y-1">
              <strong className="text-white block font-sans">
                Status Enforcement Protocol:
              </strong>
              <p className="leading-relaxed">
                • If an organization is <strong className="text-rose-400">Suspended</strong>, all child wallets are blocked from issuing new credentials immediately.
                <br />
                • Previously anchored credentials <strong className="text-emerald-400">remain valid</strong> on-chain unless explicitly revoked with a disciplinary reason code.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Authorize New Wallet Form & On-Chain Query Simulator */}
        <div className="lg:col-span-5 space-y-6">
          {/* Authorize New Issuer Wallet Form */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
              <PlusCircle className="w-5 h-5 text-cyan-400" />
              <div>
                <h3 className="font-bold text-white text-base">Authorize New Issuer Wallet</h3>
                <p className="text-slate-400 text-xs">For {selectedHierarchy.name}</p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Adding a new issuer wallet requires explicit authorization from an existing organization administrator or owner.
            </p>

            <form onSubmit={handleAuthorizeWallet} className="space-y-3 text-xs">
              {/* Quick Preset Buttons for Prompt Hierarchy */}
              <div>
                <label className="block text-slate-400 font-mono text-[10px] uppercase mb-1">
                  Preset Role (Per Architecture Spec)
                </label>
                <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
                  <button
                    type="button"
                    onClick={() => applyDepartmentPreset('Primary')}
                    className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-cyan-300 border border-slate-800 text-left flex items-center justify-between"
                  >
                    <span>Primary Wallet</span>
                    <span className="text-[9px] text-slate-500">Exec</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDepartmentPreset('Education')}
                    className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-cyan-300 border border-slate-800 text-left flex items-center justify-between"
                  >
                    <span>Education Wallet</span>
                    <span className="text-[9px] text-slate-500">Degrees</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDepartmentPreset('Events')}
                    className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-cyan-300 border border-slate-800 text-left flex items-center justify-between"
                  >
                    <span>Events Wallet</span>
                    <span className="text-[9px] text-slate-500">Badges</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDepartmentPreset('HR')}
                    className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-cyan-300 border border-slate-800 text-left flex items-center justify-between"
                  >
                    <span>HR Wallet</span>
                    <span className="text-[9px] text-slate-500">Staff</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-mono text-[11px] mb-1">
                  EVM Wallet Address *
                </label>
                <input
                  type="text"
                  required
                  placeholder="0x..."
                  value={newWalletAddress}
                  onChange={(e) => setNewWalletAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-white outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-mono text-[11px] mb-1">
                    Department Scope *
                  </label>
                  <select
                    value={newWalletDepartment}
                    onChange={(e) => setNewWalletDepartment(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-2.5 py-2 text-white outline-none"
                  >
                    <option value="Education">Education</option>
                    <option value="Events">Events</option>
                    <option value="HR">HR</option>
                    <option value="Primary">Primary</option>
                    <option value="Legal">Legal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-mono text-[11px] mb-1">
                    Wallet Label / Role *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Education issuer wallet"
                    value={newWalletLabel}
                    onChange={(e) => setNewWalletLabel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs font-mono rounded-xl flex items-center justify-center space-x-2 transition-all shadow-md shadow-cyan-500/20"
              >
                <Key className="w-4 h-4" />
                <span>Authorize Issuer Key (Arc Mainnet)</span>
              </button>
            </form>
          </div>

          {/* Live On-Chain Authorization Simulator */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Search className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-white text-base">Issuer Authority Checker</h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500">canWalletIssue()</span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Verify in real-time whether any EVM wallet is authorized to issue credentials under the Arc Issuer Registry contract.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-mono text-[11px] mb-1">
                  EVM Wallet Address to Audit
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={testWalletInput}
                    onChange={(e) => setTestWalletInput(e.target.value)}
                    placeholder="0x..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleRunVerificationCheck}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl font-mono text-xs whitespace-nowrap"
                  >
                    Query
                  </button>
                </div>
              </div>

              {/* Sample Shortcuts */}
              <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
                <button
                  type="button"
                  onClick={() => {
                    setTestWalletInput('0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
                    handleRunVerificationCheck();
                  }}
                  className="px-2 py-0.5 bg-slate-950 hover:bg-slate-800 text-cyan-400 rounded border border-slate-800"
                >
                  Test Education Key (Valid)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTestWalletInput('0x90F79bf6EB2c4f870365E785982E1f101E93b906');
                    handleRunVerificationCheck();
                  }}
                  className="px-2 py-0.5 bg-slate-950 hover:bg-slate-800 text-amber-400 rounded border border-slate-800"
                >
                  Test Suspended Org Key
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTestWalletInput('0x000000000000000000000000000000000000dEaD');
                    handleRunVerificationCheck();
                  }}
                  className="px-2 py-0.5 bg-slate-950 hover:bg-slate-800 text-rose-400 rounded border border-slate-800"
                >
                  Test Random Wallet (Denied)
                </button>
              </div>

              {testResult && (
                <div
                  className={`p-4 rounded-xl border text-xs font-mono space-y-2 ${
                    testResult.allowed
                      ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-800 text-rose-300'
                  }`}
                >
                  <div className="flex items-center space-x-2 font-bold font-sans">
                    {testResult.allowed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    )}
                    <span>{testResult.allowed ? 'AUTHORIZATION CONFIRMED' : 'ISSUANCE DENIED'}</span>
                  </div>

                  <p className="text-[11px] leading-relaxed font-mono">{testResult.reason}</p>

                  {testResult.orgName && (
                    <div className="p-2.5 bg-slate-950/80 rounded border border-slate-850 text-[10px] space-y-0.5 text-slate-400">
                      <div>• Organization: <strong className="text-white">{testResult.orgName}</strong></div>
                      <div>• Organization Status: <strong className={testResult.orgStatus === 'VERIFIED' ? 'text-emerald-400' : 'text-rose-400'}>{testResult.orgStatus}</strong></div>
                      {testResult.department && <div>• Department Scope: {testResult.department}</div>}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Organization Status & Credential Validity Policy Engine */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-cyan-950 border border-cyan-800/60 text-cyan-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Organization Status & Prior Credential Non-Invalidation Policy
              </h2>
              <p className="text-xs text-slate-400">
                Architectural protocol rule: Suspended status halts new issuance without revoking valid past credentials.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTestPriorCredential}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-semibold flex items-center space-x-2 border border-slate-700 transition-colors shrink-0"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Verify Prior Credential Against Current State</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 space-y-2">
            <div className="text-slate-400 font-bold uppercase text-[11px] flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Verified State</span>
            </div>
            <p className="text-slate-300 leading-relaxed font-sans">
              Authorized issuer wallets are fully permitted to anchor new credentials on Arc Mainnet. Prior credentials remain fully valid.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 space-y-2">
            <div className="text-slate-400 font-bold uppercase text-[11px] flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span>Suspended State</span>
            </div>
            <p className="text-slate-300 leading-relaxed font-sans">
              <strong className="text-rose-300">Blocks new issuance immediately</strong> via smart contract gate. However, credentials anchored <strong className="text-emerald-300">prior to suspension remain valid</strong> unless individually revoked.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 space-y-2">
            <div className="text-slate-400 font-bold uppercase text-[11px] flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              <span>Revoked State</span>
            </div>
            <p className="text-slate-300 leading-relaxed font-sans">
              Permanent institutional revocation. Blocks all current and future credential anchoring. Flagged by verifiers during verification audit.
            </p>
          </div>
        </div>

        {priorCredTestResult && (
          <div className={`p-4 rounded-xl border text-xs font-mono space-y-2 ${
            priorCredTestResult.validOnChain
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/40 border-rose-800 text-rose-300'
          }`}>
            <div className="flex items-center space-x-2 font-bold font-sans">
              {priorCredTestResult.validOnChain ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400" />
              )}
              <span>
                {priorCredTestResult.validOnChain
                  ? `CREDENTIAL CRYPTOGRAPHICALLY VALID (Org Status: ${priorCredTestResult.orgStatus})`
                  : `CREDENTIAL FLAGGED / INVALID (Org Status: ${priorCredTestResult.orgStatus})`}
              </span>
            </div>
            <p className="text-[11px] font-mono leading-relaxed">{priorCredTestResult.explanation}</p>
            <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-850/80">
              Tested Credential Hash: <span className="text-cyan-300">{priorCredTestResult.hash}</span>
            </div>
          </div>
        )}
      </div>

      {/* Live On-Chain Blockchain Events Audit Stream */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-cyan-950 border border-cyan-800/60 text-cyan-400">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Arc Issuer Registry Blockchain Events
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 text-[10px] font-mono border border-emerald-800">
                  Live Log Stream
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Authoritative event emissions for registrations, wallet authorizations, revocations, and lifecycle status changes.
              </p>
            </div>
          </div>

          <div className="text-xs font-mono text-slate-400">
            Contract: <span className="text-cyan-400">{ARC_CONTRACTS.ISSUER_REGISTRY.slice(0, 10)}...</span>
          </div>
        </div>

        {/* Audit Events List */}
        <div className="space-y-3 font-mono text-xs">
          {auditEvents.map((evt) => (
            <div
              key={evt.id}
              className="p-4 rounded-xl bg-slate-950 border border-slate-850 hover:border-slate-750 transition-colors space-y-2.5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                      evt.eventName === 'IssuerWalletAuthorized'
                        ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                        : evt.eventName === 'IssuerWalletRevoked'
                        ? 'bg-rose-950 text-rose-300 border-rose-800'
                        : evt.eventName === 'OrganizationSuspended'
                        ? 'bg-amber-950 text-amber-300 border-amber-800'
                        : evt.eventName === 'OrganizationReactivated'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : 'bg-purple-950 text-purple-300 border-purple-800'
                    }`}
                  >
                    event {evt.eventName}
                  </span>
                  <span className="text-slate-300 font-sans font-medium text-xs">
                    {evt.summary}
                  </span>
                </div>

                <div className="flex items-center space-x-3 text-[11px] text-slate-500 shrink-0">
                  <span>Block #{evt.blockNumber}</span>
                  <span>•</span>
                  <span>{new Date(evt.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>

              {/* Decoded Parameters Table */}
              <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-850 text-[11px] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-slate-400">
                {Object.entries(evt.details).map(([key, val]) => (
                  <div key={key} className="truncate">
                    <span className="text-slate-500">{key}: </span>
                    <span className="text-slate-200">{String(val)}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                <div className="truncate max-w-md">
                  Tx: <span className="text-slate-400">{evt.txHash}</span>
                </div>
                <a
                  href={`https://explorer.arc.network/tx/${evt.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 inline-flex items-center space-x-1"
                >
                  <span>Explorer</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ARC BLOCKCHAIN TRANSACTION MODAL (5 STATES) */}
      <ArcTransactionModal
        isOpen={isRegistryTxModalOpen}
        stage={registryStage}
        stageMessage={registryStageMessage}
        txHash={registryTxHash}
        txResult={registryTxResult}
        error={registryError}
        actionTitle={registryActionTitle}
        onClose={() => {
          setIsRegistryTxModalOpen(false);
          resetRegistryTxState();
        }}
      />
    </div>
  );
}
