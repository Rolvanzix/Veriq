import { getAddress, isAddress, keccak256, stringToBytes } from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { arcMainnet, arcTestnet } from '../src/blockchain/chain';
import { ARC_CONTRACTS, ARC_CREDENTIAL_REGISTRY_ABI, ARC_ISSUER_REGISTRY_ABI } from '../src/blockchain/contracts';
import {
  computeCredentialHash,
  computeSchemaId,
  recoverCredentialIssuer,
  ARC_EIP712_DOMAIN,
  ARC_CREDENTIAL_EIP712_TYPES,
  type ArcEip712CredentialPayload,
} from '../src/blockchain/eip712';
import { computeCanonicalClaimsDigest } from '../src/verification/canonical';
import {
  assertArcNetwork,
  parseArcBlockchainError,
  ARC_ISOLATED_CONFIG,
} from '../src/blockchain/arcNetwork';

async function runTestSuite() {
  console.log('====================================================');
  console.log(' ARC VERIFY BLOCKCHAIN INTEGRATION TEST SUITE');
  console.log(' Target Network: Arc Mainnet (Chain ID: 42424)');
  console.log(' Deterministic Finality & EVM Standards');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(name: string, condition: boolean, extra?: string) {
    total++;
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name} ${extra ? `-> ${extra}` : ''}`);
    }
  }

  // 1. Arc Network Isolation
  console.log('--- TEST GROUP 1: ARC NETWORK ISOLATION ---');
  const ethCheck = assertArcNetwork(1);
  assert('Rejects Ethereum Mainnet (Chain ID 1)', !ethCheck.isArc && !ethCheck.isMainnet);

  const sepCheck = assertArcNetwork(11155111);
  assert('Rejects Sepolia Testnet (Chain ID 11155111)', !sepCheck.isArc);

  const mainnetCheck = assertArcNetwork(42424);
  assert('Accepts Arc Mainnet (Chain ID 42424)', mainnetCheck.isArc && mainnetCheck.isMainnet);

  assert('Arc Mainnet native currency is ARC', arcMainnet.nativeCurrency.symbol === 'ARC');
  assert('Arc Mainnet chain ID is 42424', arcMainnet.id === 42424);

  // 2. Canonical Hashing & Off-Chain Privacy
  console.log('\n--- TEST GROUP 2: CANONICAL RFC 8785 CLAIMS HASHING ---');
  const claims1 = { degree: 'M.S. Distributed Systems', gpa: '3.94', honors: 'Summa Cum Laude' };
  const claims2 = { honors: 'Summa Cum Laude', gpa: '3.94', degree: 'M.S. Distributed Systems' };

  const digest1 = computeCanonicalClaimsDigest(claims1);
  const digest2 = computeCanonicalClaimsDigest(claims2);

  assert('RFC 8785 canonical string equality regardless of key order', digest1.canonicalString === digest2.canonicalString);
  assert('Deterministic Keccak256 digest equality', digest1.claimsDigest === digest2.claimsDigest);
  assert('Generates salted per-field blinding disclosure commitments', Object.keys(digest1.salts).length === 3);

  // 3. EIP-712 Signing & Signer Recovery
  console.log('\n--- TEST GROUP 3: EIP-712 CRYPTOGRAPHIC SIGNING & RECOVERY ---');
  const testPrivKey = generatePrivateKey();
  const testAccount = privateKeyToAccount(testPrivKey);

  const samplePayload: ArcEip712CredentialPayload = {
    credentialId: 'urn:arc:credential:test-101',
    schemaId: computeSchemaId('UniversityDegreeCredential'),
    issuer: testAccount.address,
    subject: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    claimsDigest: digest1.claimsDigest,
    validFrom: 1727980000n,
    validUntil: 1827980000n,
    revocationNonce: 0n,
  };

  const credHash = computeCredentialHash(samplePayload);
  assert('Computes 32-byte credential hash', credHash.startsWith('0x') && credHash.length === 66);

  const signature = await testAccount.signTypedData({
    domain: ARC_EIP712_DOMAIN(arcMainnet.id, ARC_CONTRACTS.CREDENTIAL_REGISTRY),
    types: ARC_CREDENTIAL_EIP712_TYPES,
    primaryType: 'ArcCredential',
    message: {
      credentialId: samplePayload.credentialId,
      schemaId: samplePayload.schemaId,
      issuer: samplePayload.issuer,
      subject: samplePayload.subject,
      claimsDigest: samplePayload.claimsDigest,
      validFrom: samplePayload.validFrom,
      validUntil: samplePayload.validUntil,
      revocationNonce: samplePayload.revocationNonce,
    },
  });

  const recovered = await recoverCredentialIssuer(samplePayload, signature, arcMainnet.id);
  assert('Recovers exact issuing ECDSA address from EIP-712 signature', recovered.toLowerCase() === testAccount.address.toLowerCase());

  // 4. Contract ABIs & Solidity Integration
  console.log('\n--- TEST GROUP 4: CONTRACT INTERFACES & ABIs ---');
  const credentialRegistryFunctions = ARC_CREDENTIAL_REGISTRY_ABI.filter((f) => f.type === 'function').map((f) => f.name);
  assert('ArcCredentialRegistry includes anchorCredential', credentialRegistryFunctions.includes('anchorCredential'));
  assert('ArcCredentialRegistry includes batchAnchorCredentials', credentialRegistryFunctions.includes('batchAnchorCredentials'));
  assert('ArcCredentialRegistry includes revokeCredential', credentialRegistryFunctions.includes('revokeCredential'));
  assert('ArcCredentialRegistry includes isCredentialValid', credentialRegistryFunctions.includes('isCredentialValid'));
  assert('ArcCredentialRegistry includes getCredentialRecord', credentialRegistryFunctions.includes('getCredentialRecord'));

  const issuerRegistryFunctions = ARC_ISSUER_REGISTRY_ABI.filter((f) => f.type === 'function').map((f) => f.name);
  assert('ArcIssuerRegistry includes registerOrganization', issuerRegistryFunctions.includes('registerOrganization'));
  assert('ArcIssuerRegistry includes authorizeIssuerWallet', issuerRegistryFunctions.includes('authorizeIssuerWallet'));
  assert('ArcIssuerRegistry includes revokeIssuerWallet', issuerRegistryFunctions.includes('revokeIssuerWallet'));
  assert('ArcIssuerRegistry includes setOrganizationStatus', issuerRegistryFunctions.includes('setOrganizationStatus'));

  // 5. Error Classification & Handling
  console.log('\n--- TEST GROUP 5: ERROR HANDLING & CLASSIFICATION ---');
  const rejError = parseArcBlockchainError(new Error('User rejected the transaction signature.'), 42424);
  assert('Classifies user cancellation as REJECTED_SIGNATURE', rejError.category === 'REJECTED_SIGNATURE');

  const gasError = parseArcBlockchainError(new Error('insufficient USDC balance for transaction gas fee on Arc'), 42424);
  assert('Classifies gas depletion as INSUFFICIENT_GAS_USDC', gasError.category === 'INSUFFICIENT_GAS_USDC');

  const netError = parseArcBlockchainError(new Error('Wrong chain'), 1);
  assert('Classifies wrong chain as WRONG_NETWORK', netError.category === 'WRONG_NETWORK');

  const authError = parseArcBlockchainError(new Error('ArcCredentialRegistry: caller is not a verified issuer'), 42424);
  assert('Classifies unauthorized revert as UNAUTHORIZED_ISSUER', authError.category === 'UNAUTHORIZED_ISSUER');

  // 6. Holder Credential Statuses & Public Verification Links
  console.log('\n--- TEST GROUP 6: HOLDER STATUSES & PUBLIC NO-WALLET LINK ---');
  const { resolveCredentialStatus } = await import('../src/components/holder/holderStatus');
  const { generateVerificationLink, decodeCredentialFromUrlPayload, encodeCredentialToUrlPayload } = await import('../src/verification/qr');

  // 6a. Active status
  const activeCred: any = {
    id: 'test-1',
    issuanceDate: new Date(Date.now() - 5 * 86400000).toISOString(),
    expirationDate: new Date(Date.now() + 100 * 86400000).toISOString(),
    credentialSubject: { claims: {} },
    blockchainRecord: { status: 'ANCHORED' },
  };
  const activeRes = resolveCredentialStatus(activeCred);
  assert('Resolves ✓ Active status correctly', activeRes.type === 'ACTIVE' && activeRes.symbol === '✓');

  // 6b. Expiring soon status
  const expiringCred: any = {
    id: 'test-2',
    issuanceDate: new Date(Date.now() - 350 * 86400000).toISOString(),
    expirationDate: new Date(Date.now() + 10 * 86400000).toISOString(),
    credentialSubject: { claims: {} },
    blockchainRecord: { status: 'ANCHORED' },
  };
  const expiringRes = resolveCredentialStatus(expiringCred);
  assert('Resolves ⚠ Expiring status for credentials expiring within 30 days', expiringRes.type === 'EXPIRING' && expiringRes.symbol === '⚠');

  // 6c. Expired status
  const expiredCred: any = {
    id: 'test-3',
    issuanceDate: new Date(Date.now() - 90 * 86400000).toISOString(),
    expirationDate: new Date(Date.now() - 10 * 86400000).toISOString(),
    credentialSubject: { claims: {} },
    blockchainRecord: { status: 'EXPIRED' },
  };
  const expiredRes = resolveCredentialStatus(expiredCred);
  assert('Resolves ⚠ Expired status for lapsed credentials', expiredRes.type === 'EXPIRED' && expiredRes.symbol === '⚠');

  // 6d. Suspended status
  const suspendedCred: any = {
    id: 'test-4',
    issuanceDate: new Date(Date.now() - 20 * 86400000).toISOString(),
    credentialSubject: { claims: {} },
    blockchainRecord: { status: 'SUSPENDED' },
  };
  const suspendedRes = resolveCredentialStatus(suspendedCred);
  assert('Resolves ⏸ Suspended status for held credentials', suspendedRes.type === 'SUSPENDED' && suspendedRes.symbol === '⏸');

  // 6e. Revoked status
  const revokedCred: any = {
    id: 'test-5',
    issuanceDate: new Date(Date.now() - 60 * 86400000).toISOString(),
    credentialSubject: { claims: { revocationReason: 'AffiliationTerminated' } },
    blockchainRecord: { status: 'REVOKED' },
  };
  const revokedRes = resolveCredentialStatus(revokedCred);
  assert('Resolves ✕ Revoked status for revoked credentials', revokedRes.type === 'REVOKED' && revokedRes.symbol === '✕');

  // 6f. Public verification link encoding/decoding without requiring wallet
  const encodedPayload = encodeCredentialToUrlPayload(activeCred);
  const decodedCred = decodeCredentialFromUrlPayload(encodedPayload);
  assert('Encodes and decodes self-contained verifiable presentation without wallet', decodedCred?.id === 'test-1');

  const pubLink = generateVerificationLink(activeCred, 'https://arcverify.network');
  assert('Public verification link points to verifier mode with encoded payload', pubLink.includes('mode=verifier') && pubLink.includes('payload='));

  // Summary
  console.log('\n====================================================');
  console.log(` RESULTS: ${passed}/${total} TESTS PASSED (${((passed / total) * 100).toFixed(0)}%)`);
  console.log('====================================================\n');

  if (passed === total) {
    console.log('>> ALL TESTS PASSED SUCCESSFULLY. Ready for Arc Mainnet Deployment.');
    process.exit(0);
  } else {
    console.error('>> SOME TESTS FAILED.');
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Test suite execution error:', err);
  process.exit(1);
});
