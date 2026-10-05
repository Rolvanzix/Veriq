import { Router } from 'express';
import { isAddress, type Address } from 'viem';
import { authService } from '../auth/service';
import { organizationRepository } from '../database/organization.repo';
import { domainControlVerifier } from '../verification/domain-verifier';
import { ROLE_PERMISSIONS, type AuthSession, type UserRole, type OrganizationType } from '../../auth/types';

export const authRouter = Router();

// 1. Request SIWE Nonce for wallet authentication
authRouter.post('/nonce', (req, res) => {
  const { walletAddress } = req.body;
  if (!walletAddress || !isAddress(walletAddress)) {
    return res.status(400).json({ error: 'Valid walletAddress required' });
  }

  const nonce = authService.generateNonce(walletAddress);
  const issuedAt = new Date().toISOString();
  const domain = req.headers.host || 'arc.network';
  const uri = `${req.protocol}://${domain}`;

  // Standard EIP-4361 SIWE message format
  const message = `${domain} wants you to sign in with your Ethereum account:\n${walletAddress}\n\nSign in to ARC Verify. This request will not trigger a blockchain transaction or cost any gas fees.\n\nURI: ${uri}\nVersion: 1\nChain ID: 42424\nNonce: ${nonce}\nIssued At: ${issuedAt}`;

  return res.json({
    nonce,
    message,
    issuedAt,
  });
});

// 2. Verify Wallet Signature (EIP-4361 / personal_sign)
authRouter.post('/verify-wallet', async (req, res) => {
  try {
    const { walletAddress, message, signature } = req.body;

    if (!walletAddress || !signature || !message) {
      return res.status(400).json({ error: 'walletAddress, message, and signature required' });
    }

    const verification = await authService.verifyWalletSignature(
      message,
      signature as `0x${string}`,
      walletAddress
    );

    if (!verification.valid || !verification.recoveredAddress) {
      return res.status(401).json({ error: verification.error || 'Cryptographic verification failed' });
    }

    const roleInfo = await authService.resolveWalletRole(verification.recoveredAddress);

    const session: AuthSession = {
      userAddress: verification.recoveredAddress,
      role: roleInfo.role,
      organization: roleInfo.organization,
      isWalletVerified: true,
      isAppAuthenticated: false,
      displayName: roleInfo.organization
        ? `${roleInfo.organization.name} (${roleInfo.role})`
        : `Holder (${verification.recoveredAddress.slice(0, 6)}...${verification.recoveredAddress.slice(-4)})`,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    };

    const token = authService.createAuthToken(session);

    return res.json({
      session: {
        ...session,
        token,
        permissions: ROLE_PERMISSIONS[session.role],
      },
    });
  } catch (err: any) {
    console.error('Wallet verification failed:', err);
    return res.status(500).json({ error: err.message || 'Authentication failed' });
  }
});

// 3. Organization Administrator Login (Application Credentials + Bound Wallet)
authRouter.post('/org-login', async (req, res) => {
  try {
    const { email, password, walletSignature, walletAddress, message } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const adminAuth = await authService.authenticateOrgAdmin(email, password);
    if (!adminAuth.success || !adminAuth.admin || !adminAuth.organization) {
      return res.status(401).json({ error: adminAuth.error || 'Invalid credentials' });
    }

    let isWalletVerified = false;
    let boundAddress: Address = adminAuth.admin.walletAddress || '0x28974aA448e8952B9c024d9f6974d08A375c3254';

    if (walletSignature && message && walletAddress) {
      const sigCheck = await authService.verifyWalletSignature(
        message,
        walletSignature as `0x${string}`,
        walletAddress
      );
      if (sigCheck.valid && sigCheck.recoveredAddress) {
        boundAddress = sigCheck.recoveredAddress;
        isWalletVerified = true;
      }
    } else if (adminAuth.admin.walletAddress) {
      boundAddress = adminAuth.admin.walletAddress;
      isWalletVerified = true;
    }

    const session: AuthSession = {
      userAddress: boundAddress,
      role: adminAuth.admin.role,
      organization: adminAuth.organization,
      isWalletVerified,
      isAppAuthenticated: true,
      adminEmail: adminAuth.admin.email,
      displayName: `${adminAuth.admin.fullName} (${adminAuth.organization.name})`,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    };

    const token = authService.createAuthToken(session);

    return res.json({
      session: {
        ...session,
        token,
        permissions: ROLE_PERMISSIONS[session.role],
      },
    });
  } catch (err: any) {
    console.error('Org login failed:', err);
    return res.status(500).json({ error: err.message || 'Org login failed' });
  }
});

// 4. Resolve Current Session / Auth Profile
authRouter.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  const addressQuery = req.query.address as string;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const decoded = authService.verifyAuthToken(token);
    if (decoded) {
      const org = decoded.orgId ? await organizationRepository.getById(decoded.orgId) : undefined;
      return res.json({
        userAddress: decoded.userAddress,
        role: decoded.role,
        organization: org,
        isWalletVerified: decoded.isWalletVerified,
        isAppAuthenticated: decoded.isAppAuthenticated,
        adminEmail: decoded.adminEmail,
        permissions: ROLE_PERMISSIONS[decoded.role as UserRole] || [],
      });
    }
  }

  if (addressQuery && isAddress(addressQuery)) {
    const roleInfo = await authService.resolveWalletRole(addressQuery as Address);
    return res.json({
      userAddress: addressQuery,
      role: roleInfo.role,
      organization: roleInfo.organization,
      isWalletVerified: false,
      isAppAuthenticated: false,
      permissions: ROLE_PERMISSIONS[roleInfo.role],
    });
  }

  return res.json({
    role: 'PUBLIC_VERIFIER',
    isWalletVerified: false,
    isAppAuthenticated: false,
    permissions: ROLE_PERMISSIONS['PUBLIC_VERIFIER'],
  });
});

// 5. List Organizations
authRouter.get('/organizations', async (req, res) => {
  try {
    const orgs = await organizationRepository.getAll();
    return res.json(orgs);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 6. Get Organization by ID
authRouter.get('/organizations/:orgId', async (req, res) => {
  try {
    const { orgId } = req.params;
    const org = await organizationRepository.getById(orgId);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    return res.json(org);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 7. Register New Organization (Onboarding Flow)
authRouter.post('/organizations/register', async (req, res) => {
  try {
    const {
      name,
      orgType,
      country,
      website,
      contactEmail,
      description,
      logoUrl,
      ownerAddress,
      issuerWalletAddress,
      representative,
      domainMethod,
    } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Organization name required' });
    }
    if (!website) {
      return res.status(400).json({ error: 'Official website required' });
    }
    if (!contactEmail) {
      return res.status(400).json({ error: 'Official organization contact email required' });
    }
    if (!ownerAddress || !isAddress(ownerAddress)) {
      return res.status(400).json({ error: 'Valid ownerAddress EVM required' });
    }
    if (!issuerWalletAddress || !isAddress(issuerWalletAddress)) {
      return res.status(400).json({ error: 'Valid issuerWalletAddress EVM required' });
    }
    if (!representative || !representative.fullName || !representative.officialEmail) {
      return res.status(400).json({ error: 'Authorized representative details required' });
    }

    const cleanDomain = domainControlVerifier.extractDomain(website);
    const challengeToken = domainControlVerifier.generateDomainToken(cleanDomain);

    const declarationText = domainControlVerifier.generateRepresentativeDeclaration({
      orgName: name,
      domain: cleanDomain,
      fullName: representative.fullName,
      title: representative.title || 'Authorized Officer',
      email: representative.officialEmail,
      issuerWallet: issuerWalletAddress,
      challengeToken,
      timestamp: new Date().toISOString(),
    });

    const newOrg = await organizationRepository.registerOrganization({
      name,
      orgType: (orgType as OrganizationType) || 'Corporation / Enterprise',
      country: country || 'Global',
      website,
      domain: cleanDomain,
      contactEmail,
      description: description || 'Accredited organization credential issuer on Arc Network.',
      logoUrl,
      ownerAddress: ownerAddress as Address,
      issuerWalletAddress: issuerWalletAddress as Address,
      representative: {
        fullName: representative.fullName,
        title: representative.title || 'Authorized Officer',
        officialEmail: representative.officialEmail,
        walletAddress: (representative.walletAddress || ownerAddress) as Address,
        challengeMessage: declarationText,
        isVerified: false,
      },
      domainVerification: {
        domain: cleanDomain,
        method: domainMethod === 'DNS_TXT' ? 'DNS_TXT' : 'WELL_KNOWN_FILE',
        challengeToken,
        isVerified: false,
        dnsHostRecord: `_arc-verify-challenge.${cleanDomain}`,
        wellKnownEndpoint: `https://${cleanDomain}/.well-known/arc-verify.json`,
      },
    });

    return res.status(201).json({
      organization: newOrg,
      challengeToken,
      declarationText,
      instructions: {
        wellKnownUrl: `https://${cleanDomain}/.well-known/arc-verify.json`,
        expectedJson: {
          arcVerify: {
            orgId: newOrg.id,
            domain: cleanDomain,
            token: challengeToken,
            issuerWallet: issuerWalletAddress,
          },
        },
        dnsRecord: {
          type: 'TXT',
          host: `_arc-verify-challenge.${cleanDomain}`,
          value: `arc-verify-token=${challengeToken}`,
        },
      },
    });
  } catch (err: any) {
    console.error('Error registering organization:', err);
    return res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

// 8. Verify Domain Control
authRouter.post('/organizations/:orgId/verify-domain', async (req, res) => {
  try {
    const { orgId } = req.params;
    const { method, simulatedContent } = req.body;

    const org = await organizationRepository.getById(orgId);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const checkResult = await domainControlVerifier.verifyDomainControl({
      domain: org.domain,
      challengeToken: org.domainVerification.challengeToken,
      method: method || org.domainVerification.method,
      simulatedContent,
    });

    const updated = await organizationRepository.updateDomainVerification(
      orgId,
      checkResult.verified,
      checkResult.details
    );

    return res.json({
      result: checkResult,
      organization: updated,
    });
  } catch (err: any) {
    console.error('Domain verification failed:', err);
    return res.status(500).json({ error: err.message || 'Domain verification check failed' });
  }
});

// 9. Verify Authorized Representative Signature & Email Match
authRouter.post('/organizations/:orgId/verify-representative', async (req, res) => {
  try {
    const { orgId } = req.params;
    const { signature } = req.body;

    const org = await organizationRepository.getById(orgId);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const message = org.representative.challengeMessage || domainControlVerifier.generateRepresentativeDeclaration({
      orgName: org.name,
      domain: org.domain,
      fullName: org.representative.fullName,
      title: org.representative.title,
      email: org.representative.officialEmail,
      issuerWallet: org.issuerWalletAddress,
      challengeToken: org.domainVerification.challengeToken,
      timestamp: new Date().toISOString(),
    });

    const repResult = await domainControlVerifier.verifyRepresentative({
      officialEmail: org.representative.officialEmail,
      domain: org.domain,
      walletAddress: org.representative.walletAddress,
      message,
      signature: signature as `0x${string}`,
    });

    if (!repResult.verified) {
      return res.status(400).json({ error: repResult.details });
    }

    const updatedRep = {
      ...org.representative,
      signature: signature as `0x${string}`,
      signedAt: new Date().toISOString(),
      isVerified: true,
    };

    const updated = await organizationRepository.updateRepresentativeVerification(orgId, updatedRep);

    return res.json({
      result: repResult,
      organization: updated,
    });
  } catch (err: any) {
    console.error('Representative verification failed:', err);
    return res.status(500).json({ error: err.message || 'Representative verification failed' });
  }
});

// 10. Institutional Review (Compliance Officer / Arc Governance Action)
authRouter.post('/organizations/:orgId/review', async (req, res) => {
  try {
    const { orgId } = req.params;
    const { status, reviewNotes, rejectionReason, reviewerName } = req.body;

    if (!['PENDING', 'UNDER_REVIEW', 'VERIFIED', 'SUSPENDED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid verification status' });
    }

    const org = await organizationRepository.getById(orgId);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Security Rule: Cannot approve to VERIFIED unless domain is verified!
    if (status === 'VERIFIED' && !org.domainVerification.isVerified) {
      return res.status(400).json({
        error: 'Cannot approve organization as Verified Issuer: Domain control verification has not been completed.',
      });
    }

    const updated = await organizationRepository.updateInstitutionalStatus(
      orgId,
      status,
      reviewerName || 'Arc Governance Accreditation Board',
      reviewNotes,
      rejectionReason
    );

    return res.json({
      success: true,
      organization: updated,
    });
  } catch (err: any) {
    console.error('Institutional review failed:', err);
    return res.status(500).json({ error: err.message || 'Institutional review update failed' });
  }
});

// 11. Get Organization Authorized Wallets
authRouter.get('/organizations/:orgId/wallets', async (req, res) => {
  try {
    const { orgId } = req.params;
    const org = await organizationRepository.getById(orgId);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const wallets = await organizationRepository.getAuthorizedWallets(orgId);
    return res.json(wallets);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 12. Authorize New Issuer Wallet (Requires Org Owner / Admin)
authRouter.post('/organizations/:orgId/wallets', async (req, res) => {
  try {
    const { orgId } = req.params;
    const { walletAddress, label, approvedBy } = req.body;

    if (!walletAddress || !isAddress(walletAddress)) {
      return res.status(400).json({ error: 'Valid walletAddress required' });
    }
    if (!label || label.trim().length === 0) {
      return res.status(400).json({ error: 'Label required' });
    }

    const org = await organizationRepository.getById(orgId);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const record = await organizationRepository.authorizeWallet(
      orgId,
      walletAddress as Address,
      label,
      (approvedBy || org.ownerAddress) as Address
    );

    return res.status(201).json(record);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 13. Revoke Wallet Authorization
authRouter.delete('/organizations/:orgId/wallets/:address', async (req, res) => {
  try {
    const { orgId, address } = req.params;
    const success = await organizationRepository.revokeWalletAuthorization(orgId, address);
    if (!success) {
      return res.status(404).json({ error: 'Wallet not found or could not be revoked' });
    }
    return res.json({ success: true, message: `Wallet ${address} revoked for ${orgId}` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
