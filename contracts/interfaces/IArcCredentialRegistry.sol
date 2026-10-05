// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IArcCredentialRegistry
 * @notice Interface for on-chain anchoring, status indexing, and revocation on Arc Mainnet.
 */
interface IArcCredentialRegistry {
    enum RevocationReason {
        None,
        Superseded,
        Compromised,
        AffiliationTerminated,
        DisciplinaryAction,
        RequestedByHolder,
        ExpiredOrInvalidated
    }

    struct CredentialRecord {
        bytes32 credentialHash;   // Keccak256 hash of canonical EIP-712 credential payload
        address issuer;           // Verified issuer address that signed & anchored
        address subject;          // Holder address (0x0 if strictly DID/anonymous subject)
        bytes32 schemaId;         // Unique identifier for credential schema (e.g. KYC, Degree)
        uint64 issuedAt;          // Arc blockchain block timestamp of anchoring
        uint64 validUntil;        // Expiration timestamp (0 if non-expiring)
        bool revoked;             // Revocation flag
        RevocationReason reason;  // Reason code if revoked
        uint64 revokedAt;         // Timestamp when revocation occurred
    }

    event CredentialAnchored(
        bytes32 indexed credentialHash,
        address indexed issuer,
        address indexed subject,
        bytes32 schemaId,
        uint64 validUntil
    );

    event BatchCredentialsAnchored(
        address indexed issuer,
        uint256 count,
        bytes32 batchMerkleRoot
    );

    event CredentialRevoked(
        bytes32 indexed credentialHash,
        address indexed issuer,
        RevocationReason reason,
        uint64 revokedAt
    );

    function anchorCredential(
        bytes32 credentialHash,
        address subject,
        uint64 validUntil,
        bytes32 schemaId
    ) external;

    function batchAnchorCredentials(
        bytes32[] calldata credentialHashes,
        address[] calldata subjects,
        uint64[] calldata validUntils,
        bytes32[] calldata schemaIds
    ) external;

    function revokeCredential(bytes32 credentialHash, RevocationReason reason) external;

    function isCredentialValid(bytes32 credentialHash)
        external
        view
        returns (
            bool isValid,
            bool isRevoked,
            bool isExpired,
            address issuer,
            address subject,
            uint64 issuedAt,
            uint64 validUntil,
            bytes32 schemaId
        );

    function getCredentialRecord(bytes32 credentialHash)
        external
        view
        returns (CredentialRecord memory);
}
