import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import type { Address } from 'viem';
import { useAuth } from '../../auth/AuthContext';
import { IssuerDashboard } from './IssuerDashboard';
import { IssuanceWizard } from './IssuanceWizard';
import type { ArcVerifiableCredential } from '../../verification/types';

interface IssuerViewProps {
  currentAddress?: string;
  onOpenAuthModal?: () => void;
  onNavigateToVerifier?: (payloadUrl: string) => void;
  onNavigateToHolder?: (holderAddress: string) => void;
}

export function IssuerView({
  currentAddress,
  onOpenAuthModal,
  onNavigateToVerifier,
  onNavigateToHolder,
}: IssuerViewProps) {
  const { session } = useAuth();
  const { address: wagmiAddress } = useAccount();

  const effectiveAddress = (session.userAddress || currentAddress || wagmiAddress || '0x28974aA448e8952B9c024d9f6974d08A375c3254') as Address;

  const [viewMode, setViewMode] = useState<'dashboard' | 'wizard'>('dashboard');
  const [credentials, setCredentials] = useState<ArcVerifiableCredential[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCredentials();
  }, [effectiveAddress]);

  const fetchCredentials = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/credentials/by-issuer/${effectiveAddress}`);
      if (res.ok) {
        const data = await res.json();
        setCredentials(data);
      }
    } catch (err) {
      console.error('Failed to fetch issuer credentials:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleIssuedSuccess = (newCred: ArcVerifiableCredential) => {
    setCredentials((prev) => [newCred, ...prev]);
    fetchCredentials();
  };

  if (viewMode === 'wizard') {
    return (
      <IssuanceWizard
        onCancel={() => setViewMode('dashboard')}
        onIssuedSuccess={handleIssuedSuccess}
        onNavigateToVerifier={onNavigateToVerifier}
        onNavigateToHolder={onNavigateToHolder}
        currentAddress={effectiveAddress}
      />
    );
  }

  return (
    <IssuerDashboard
      credentials={credentials}
      loading={loading}
      onRefresh={fetchCredentials}
      onCreateCredentialClick={() => setViewMode('wizard')}
      onNavigateToVerifier={onNavigateToVerifier}
      onNavigateToHolder={onNavigateToHolder}
      currentAddress={effectiveAddress}
    />
  );
}
