-- ARC Verify PostgreSQL / Supabase Schema
-- Off-Chain Credential Storage, Issuer Directory, and Blockchain Event Cache

-- 1. Issuers Table (Decentralized Issuer Profiles)
CREATE TABLE IF NOT EXISTS arc_issuers (
    address VARCHAR(42) PRIMARY KEY,
    organization_name VARCHAR(255) NOT NULL,
    did_uri VARCHAR(255) NOT NULL,
    metadata_hash VARCHAR(66) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- PENDING, VERIFIED, SUSPENDED, REVOKED
    contact_email VARCHAR(255),
    website VARCHAR(255),
    logo_url TEXT,
    description TEXT,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_at TIMESTAMP WITH TIME ZONE,
    credential_count INTEGER DEFAULT 0
);

-- 2. Credentials Table (Private Claims & Anchored Metadata)
-- Sensitive personal claims stored in encrypted/private JSONB off-chain
CREATE TABLE IF NOT EXISTS arc_credentials (
    id VARCHAR(128) PRIMARY KEY,
    credential_hash VARCHAR(66) NOT NULL UNIQUE, -- Anchored on Arc Mainnet
    issuer_address VARCHAR(42) NOT NULL REFERENCES arc_issuers(address),
    subject_address VARCHAR(42),
    subject_did VARCHAR(255) NOT NULL,
    schema_id VARCHAR(66) NOT NULL,
    schema_name VARCHAR(128) NOT NULL,
    claims_digest VARCHAR(66) NOT NULL,
    private_claims JSONB NOT NULL,
    issuance_date TIMESTAMP WITH TIME ZONE NOT NULL,
    expiration_date TIMESTAMP WITH TIME ZONE,
    revocation_nonce BIGINT DEFAULT 0,
    proof_signature TEXT NOT NULL,
    anchor_tx_hash VARCHAR(66),
    arc_block_number BIGINT,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, REVOKED, EXPIRED
    revocation_reason VARCHAR(64),
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credentials_subject_address ON arc_credentials(subject_address);
CREATE INDEX IF NOT EXISTS idx_credentials_issuer_address ON arc_credentials(issuer_address);
CREATE INDEX IF NOT EXISTS idx_credentials_schema ON arc_credentials(schema_id);
CREATE INDEX IF NOT EXISTS idx_credentials_hash ON arc_credentials(credential_hash);

-- 3. Verification Audit Log
CREATE TABLE IF NOT EXISTS arc_verification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credential_hash VARCHAR(66) NOT NULL,
    verifier_address VARCHAR(42),
    overall_status VARCHAR(32) NOT NULL, -- VALID, INVALID, REVOKED, EXPIRED
    step_results JSONB NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Indexer Sync State
CREATE TABLE IF NOT EXISTS arc_indexer_state (
    contract_address VARCHAR(42) PRIMARY KEY,
    last_block_synced BIGINT NOT NULL,
    last_sync_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Blockchain Event Store
CREATE TABLE IF NOT EXISTS arc_indexed_events (
    id BIGSERIAL PRIMARY KEY,
    contract_address VARCHAR(42) NOT NULL,
    event_name VARCHAR(64) NOT NULL,
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    block_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    log_index INTEGER NOT NULL,
    data JSONB NOT NULL,
    indexed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_event UNIQUE(tx_hash, log_index)
);

-- 6. Organizations (Separate from Wallet Identity)
CREATE TABLE IF NOT EXISTS arc_organizations (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    did_uri VARCHAR(255) NOT NULL UNIQUE,
    metadata_hash VARCHAR(66) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- VERIFIED, PENDING, SUSPENDED
    owner_address VARCHAR(42) NOT NULL,
    contact_email VARCHAR(255),
    website VARCHAR(255),
    credential_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Organization Administrators (Secure Application Authentication)
CREATE TABLE IF NOT EXISTS arc_organization_admins (
    id VARCHAR(64) PRIMARY KEY,
    org_id VARCHAR(64) NOT NULL REFERENCES arc_organizations(id),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    wallet_address VARCHAR(42),
    role VARCHAR(32) NOT NULL DEFAULT 'ORG_ADMIN', -- ORG_OWNER, ORG_ADMIN, VIEWER_AUDITOR
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Authorized Issuer Wallets (Organization Approval Gate)
-- A wallet becomes an authorized issuer wallet only after explicit approval by the organization
CREATE TABLE IF NOT EXISTS arc_authorized_wallets (
    id VARCHAR(64) PRIMARY KEY,
    org_id VARCHAR(64) NOT NULL REFERENCES arc_organizations(id),
    wallet_address VARCHAR(42) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'ISSUER',
    label VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, SUSPENDED, REVOKED
    approved_by VARCHAR(42) NOT NULL,
    approved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_org_wallet UNIQUE(org_id, wallet_address)
);

-- 9. Cryptographic Auth Nonces for SIWE (Sign-In with Ethereum)
CREATE TABLE IF NOT EXISTS arc_auth_nonces (
    nonce VARCHAR(64) PRIMARY KEY,
    wallet_address VARCHAR(42) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE
);

