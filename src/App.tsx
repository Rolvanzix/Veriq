import React, { useState, useEffect } from 'react';
import { Web3Provider } from './blockchain/provider';
import { AuthProvider } from './auth/AuthContext';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { IssuerView } from './components/issuer/IssuerView';
import { HolderView } from './components/holder/HolderView';
import { VerifierView } from './components/verifier/VerifierView';
import { IssuerRegistryView } from './components/issuer-registry/IssuerRegistryView';
import { InstitutionalReviewQueue } from './components/onboarding/InstitutionalReviewQueue';
import { ArchitectureView } from './components/architecture/ArchitectureView';

export function AppContent() {
  const getInitialTab = () => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'verifier' || params.get('payload')) {
        return 'verifier';
      }
      if (params.get('mode') === 'holder' || params.get('tab') === 'holder') {
        return 'holder';
      }
    }
    return 'issuer';
  };

  const [activeTab, setActiveTab] = useState<'issuer' | 'holder' | 'verifier' | 'registry' | 'verification_queue' | 'architecture'>(getInitialTab);
  const [mockAccount, setMockAccount] = useState<string | undefined>(undefined);
  const [verifierPayloadUrl, setVerifierPayloadUrl] = useState<string | undefined>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('payload')) {
        return window.location.href;
      }
    }
    return undefined;
  });

  const handleNavigateToVerifier = (payloadUrl: string) => {
    setVerifierPayloadUrl(payloadUrl);
    setActiveTab('verifier');
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col justify-between selection:bg-cyan-500/30 selection:text-cyan-200">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mockAccount={mockAccount}
        setMockAccount={setMockAccount}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 flex-grow w-full">
        {activeTab === 'issuer' && (
          <IssuerView
            currentAddress={mockAccount}
            onNavigateToVerifier={handleNavigateToVerifier}
            onNavigateToHolder={(holderAddress) => {
              if (holderAddress) setMockAccount(holderAddress);
              setActiveTab('holder');
            }}
          />
        )}
        {activeTab === 'holder' && (
          <HolderView
            currentAddress={mockAccount}
            onNavigateToVerifier={handleNavigateToVerifier}
          />
        )}
        {activeTab === 'verifier' && (
          <VerifierView initialPayloadUrl={verifierPayloadUrl} />
        )}
        {activeTab === 'registry' && <IssuerRegistryView />}
        {activeTab === 'verification_queue' && <InstitutionalReviewQueue />}
        {activeTab === 'architecture' && <ArchitectureView />}
      </main>

      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <Web3Provider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Web3Provider>
  );
}
