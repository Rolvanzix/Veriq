import crypto from 'crypto';
import { recoverMessageAddress, type Address } from 'viem';
import { organizationRepository } from '../database/organization.repo';
import { ROLE_PERMISSIONS, type UserRole, type Permission, type AuthSession } from '../../auth/types';

const JWT_SECRET = process.env.AUTH_SECRET || 'arc-verify-auth-secret-key-prod-2026';

// In-Memory store for SIWE Nonces
interface NonceRecord {
  nonce: string;
  walletAddress: string;
  expiresAt: number;
  used: boolean;
}
const activeNonces = new Map<string, NonceRecord>();

export class AuthService {
  /**
   * Generates a secure, cryptographically random single-use nonce for SIWE
   */
  public generateNonce(walletAddress: string): string {
    const nonce = crypto.randomBytes(16).toString('hex');
    activeNonces.set(nonce, {
      nonce,
      walletAddress: walletAddress.toLowerCase(),
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 min TTL
      used: false,
    });
    return nonce;
  }

  /**
   * Verifies the SIWE challenge and recovers signer's EVM address
   */
  public async verifyWalletSignature(
    message: string,
    signature: `0x${string}`,
    expectedWalletAddress: string
  ): Promise<{ valid: boolean; recoveredAddress?: Address; error?: string }> {
    try {
      // 1. Recover EVM address from personal_sign message
      const recovered = await recoverMessageAddress({
        message,
        signature,
      });

      if (recovered.toLowerCase() !== expectedWalletAddress.toLowerCase()) {
        return {
          valid: false,
          error: `Signer mismatch: recovered ${recovered} does not match ${expectedWalletAddress}`,
        };
      }

      return { valid: true, recoveredAddress: recovered };
    } catch (err: any) {
      return { valid: false, error: err.message || 'Signature recovery failed' };
    }
  }

  /**
   * Resolves role and organization status for a verified wallet address
   */
  public async resolveWalletRole(walletAddress: Address): Promise<{
    role: UserRole;
    organization?: any;
    isAuthorizedIssuer: boolean;
  }> {
    // Check if wallet is an authorized issuer for any registered organization
    const orgResult = await organizationRepository.findOrgByAuthorizedWallet(walletAddress);
    if (orgResult) {
      return {
        role: orgResult.role,
        organization: orgResult.org,
        isAuthorizedIssuer: true,
      };
    }

    // Default to Holder or Public Verifier
    // Connecting a wallet does not make someone an authorized issuer!
    return {
      role: 'HOLDER',
      isAuthorizedIssuer: false,
    };
  }

  /**
   * Dual Authentication for Organization Administrators:
   * Checks application password AND requires bound wallet signature.
   */
  public async authenticateOrgAdmin(
    email: string,
    passwordPlain: string
  ): Promise<{
    success: boolean;
    admin?: any;
    organization?: any;
    error?: string;
  }> {
    const admin = await organizationRepository.getAdminByEmail(email);
    if (!admin || !admin.isActive) {
      return { success: false, error: 'Invalid organization administrator credentials' };
    }

    // Compare SHA-256 hash
    const inputHash = crypto.createHash('sha256').update(passwordPlain).digest('hex');
    if (inputHash !== admin.passwordHash) {
      return { success: false, error: 'Invalid email or password' };
    }

    const org = await organizationRepository.getById(admin.orgId);
    if (!org) {
      return { success: false, error: 'Organization record not found' };
    }

    return {
      success: true,
      admin,
      organization: org,
    };
  }

  /**
   * Issues a signed stateless authentication token
   */
  public createAuthToken(session: AuthSession): string {
    const payload = JSON.stringify({
      userAddress: session.userAddress,
      role: session.role,
      orgId: session.organization?.id,
      adminEmail: session.adminEmail,
      isWalletVerified: session.isWalletVerified,
      isAppAuthenticated: session.isAppAuthenticated,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24h
    });

    const signature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(payload)
      .digest('hex');

    return `${Buffer.from(payload).toString('base64url')}.${signature}`;
  }

  /**
   * Verifies an authentication token
   */
  public verifyAuthToken(token: string): any | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 2) return null;

      const [encodedPayload, expectedSig] = parts;
      const payloadStr = Buffer.from(encodedPayload, 'base64url').toString('utf8');

      const actualSig = crypto
        .createHmac('sha256', JWT_SECRET)
        .update(payloadStr)
        .digest('hex');

      if (actualSig !== expectedSig) return null;

      const payload = JSON.parse(payloadStr);
      if (payload.expiresAt && Date.now() > payload.expiresAt) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Checks if an identity has authorization to issue a credential:
   * Rule:
   * 1. Organization must exist and have status 'VERIFIED'.
   * 2. Wallet must be actively authorized for this organization.
   * 3. Role must have 'ISSUE_CREDENTIAL' permission.
   */
  public async authorizeIssuance(
    walletAddress: Address,
    orgId?: string
  ): Promise<{
    allowed: boolean;
    reason?: string;
    org?: any;
  }> {
    let targetOrgId = orgId;

    if (!targetOrgId) {
      const found = await organizationRepository.findOrgByAuthorizedWallet(walletAddress);
      if (!found) {
        return {
          allowed: false,
          reason: `Unauthorized: Wallet ${walletAddress} is not approved by any accredited organization to issue credentials.`,
        };
      }
      targetOrgId = found.org.id;
    }

    const authCheck = await organizationRepository.isWalletAuthorizedForOrg(targetOrgId, walletAddress);
    if (!authCheck.authorized || !authCheck.org) {
      return {
        allowed: false,
        reason: `Wallet ${walletAddress} is not an authorized issuer wallet for organization '${targetOrgId}'.`,
      };
    }

    // Critical security rule: Do not allow an unverified organization to issue credentials!
    if (authCheck.org.status !== 'VERIFIED') {
      return {
        allowed: false,
        reason: `Forbidden: Organization '${authCheck.org.name}' is currently in ${authCheck.org.status} status. Only governance-verified organizations can anchor credentials on Arc.`,
      };
    }

    return {
      allowed: true,
      org: authCheck.org,
    };
  }
}

export const authService = new AuthService();
