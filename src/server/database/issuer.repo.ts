import { getDb } from './client';

export interface IssuerRecord {
  address: string;
  organizationName: string;
  didUri: string;
  metadataHash: string;
  status: 'PENDING' | 'VERIFIED' | 'SUSPENDED' | 'REVOKED';
  contactEmail?: string;
  website?: string;
  logoUrl?: string;
  description?: string;
  registeredAt: string;
  verifiedAt?: string;
  credentialCount: number;
}

// In-Memory store for fast fallback & dev isolation
const inMemoryIssuers = new Map<string, IssuerRecord>([
  [
    '0x28974aa448e8952b9c024d9f6974d08a375c3254',
    {
      address: '0x28974aA448e8952B9c024d9f6974d08A375c3254',
      organizationName: 'Arc Foundation & Core Authority',
      didUri: 'did:arc:0x28974aA448e8952B9c024d9f6974d08A375c3254',
      metadataHash: '0x12b5f8e6c4a30e8c8942b083d91f1a4e528b7e2837f6a7d903e1cb72e01f56a8',
      status: 'VERIFIED',
      contactEmail: 'accreditation@arc.network',
      website: 'https://arc.network',
      description: 'Official genesis accreditation authority and governance body of Arc Network.',
      registeredAt: new Date(Date.now() - 90 * 86400000).toISOString(),
      verifiedAt: new Date(Date.now() - 85 * 86400000).toISOString(),
      credentialCount: 1420,
    },
  ],
  [
    '0x90f79bf6eb2c4f870365e785982e1f101e93b906',
    {
      address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
      organizationName: 'International Academic & Degree Consortium',
      didUri: 'did:arc:0x90F79bf6EB2c4f870365E785982E1f101E93b906',
      metadataHash: '0x37a1f59de109bb4578b87c42735160912189cdfb016259049c6baeeef099e2da',
      status: 'VERIFIED',
      contactEmail: 'credentials@academic-consortium.org',
      website: 'https://academic-consortium.org',
      description: 'Accredited higher-education degree, diploma, and transcript issuing authority.',
      registeredAt: new Date(Date.now() - 45 * 86400000).toISOString(),
      verifiedAt: new Date(Date.now() - 40 * 86400000).toISOString(),
      credentialCount: 582,
    },
  ],
  [
    '0x15d34aaf54267db7d7c367839aaf71a00a2c6a65',
    {
      address: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
      organizationName: 'VeriID Global Identity & KYC Provider',
      didUri: 'did:arc:0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
      metadataHash: '0x9a8f27801be64816c891630c72ba18561cda58309a473210d24bf4859a6d015c',
      status: 'VERIFIED',
      contactEmail: 'compliance@veriid-global.com',
      website: 'https://veriid-global.com',
      description: 'Institutional decentralized identity verification, AML compliance, and biometric proofs.',
      registeredAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      verifiedAt: new Date(Date.now() - 28 * 86400000).toISOString(),
      credentialCount: 319,
    },
  ],
]);

export const issuerRepository = {
  async getAll(): Promise<IssuerRecord[]> {
    const db = getDb();
    if (db.isPostgresConnected) {
      try {
        const res = await db.query('SELECT * FROM arc_issuers ORDER BY credential_count DESC');
        return res.rows;
      } catch (err) {
        console.warn('DB query error, fallback to memory:', err);
      }
    }
    return Array.from(inMemoryIssuers.values());
  },

  async getByAddress(address: string): Promise<IssuerRecord | null> {
    const normalized = address.toLowerCase();
    const db = getDb();
    if (db.isPostgresConnected) {
      try {
        const res = await db.query('SELECT * FROM arc_issuers WHERE LOWER(address) = $1', [normalized]);
        if (res.rows.length > 0) return res.rows[0];
      } catch (err) {
        console.warn('DB query error, fallback to memory:', err);
      }
    }
    return inMemoryIssuers.get(normalized) || null;
  },

  async upsert(issuer: IssuerRecord): Promise<IssuerRecord> {
    const normalized = issuer.address.toLowerCase();
    inMemoryIssuers.set(normalized, { ...issuer, address: issuer.address });

    const db = getDb();
    if (db.isPostgresConnected) {
      try {
        await db.query(
          `INSERT INTO arc_issuers (address, organization_name, did_uri, metadata_hash, status, contact_email, website, description, registered_at, verified_at, credential_count)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (address) DO UPDATE SET
             organization_name = EXCLUDED.organization_name,
             did_uri = EXCLUDED.did_uri,
             metadata_hash = EXCLUDED.metadata_hash,
             status = EXCLUDED.status,
             credential_count = arc_issuers.credential_count + 1`,
          [
            issuer.address,
            issuer.organizationName,
            issuer.didUri,
            issuer.metadataHash,
            issuer.status,
            issuer.contactEmail,
            issuer.website,
            issuer.description,
            issuer.registeredAt,
            issuer.verifiedAt,
            issuer.credentialCount,
          ]
        );
      } catch (err) {
        console.warn('DB upsert error:', err);
      }
    }
    return issuer;
  },

  async incrementCredentialCount(address: string): Promise<void> {
    const normalized = address.toLowerCase();
    const existing = inMemoryIssuers.get(normalized);
    if (existing) {
      existing.credentialCount += 1;
    }
  },
};
