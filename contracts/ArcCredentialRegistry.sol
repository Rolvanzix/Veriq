// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IArcCredentialRegistry.sol";
import "./interfaces/IArcIssuerRegistry.sol";

/**
 * @title ArcCredentialRegistry
 * @notice Production smart contract for anchoring verifiable credential digests on Arc Mainnet.
 * @dev Maintains non-repudiation, timestamps, and on-chain revocation state.
 */
contract ArcCredentialRegistry is IArcCredentialRegistry {
    address public owner;
    bool public paused;
    IArcIssuerRegistry public issuerRegistry;

    // credentialHash => CredentialRecord
    mapping(bytes32 => CredentialRecord) private _records;

    // subject address => list of anchored credential hashes
    mapping(address => bytes32[]) private _subjectCredentials;

    // issuer address => list of anchored credential hashes
    mapping(address => bytes32[]) private _issuerCredentials;

    modifier onlyOwner() {
        require(msg.sender == owner, "ArcCredentialRegistry: caller is not the owner");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "ArcCredentialRegistry: paused");
        _;
    }

    modifier onlyVerifiedIssuer() {
        if (address(issuerRegistry) != address(0)) {
            require(
                issuerRegistry.isVerifiedIssuer(msg.sender) || msg.sender == owner,
                "ArcCredentialRegistry: caller is not a verified issuer"
            );
        }
        _;
    }

    constructor(address _issuerRegistry) {
        owner = msg.sender;
        if (_issuerRegistry != address(0)) {
            issuerRegistry = IArcIssuerRegistry(_issuerRegistry);
        }
    }

    /**
     * @notice Anchors a verifiable credential digest onto Arc Mainnet.
     * @param credentialHash The Keccak256 hash of the canonical EIP-712 credential
     * @param subject The recipient address (or 0x0 if anonymous)
     * @param validUntil Expiration UNIX timestamp (0 if perpetual)
     * @param schemaId Unique identifier of the credential schema
     */
    function anchorCredential(
        bytes32 credentialHash,
        address subject,
        uint64 validUntil,
        bytes32 schemaId
    ) external override whenNotPaused onlyVerifiedIssuer {
        require(credentialHash != bytes32(0), "ArcCredentialRegistry: invalid hash");
        require(_records[credentialHash].issuedAt == 0, "ArcCredentialRegistry: already anchored");
        if (validUntil > 0) {
            require(validUntil > block.timestamp, "ArcCredentialRegistry: validUntil must be in future");
        }

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

        _issuerCredentials[msg.sender].push(credentialHash);
        if (subject != address(0)) {
            _subjectCredentials[subject].push(credentialHash);
        }

        if (address(issuerRegistry) != address(0)) {
            try issuerRegistry.recordIssuance(msg.sender) {} catch {}
        }

        emit CredentialAnchored(credentialHash, msg.sender, subject, schemaId, validUntil);
    }

    /**
     * @notice Batch anchors credentials in a single transaction for gas efficiency.
     */
    function batchAnchorCredentials(
        bytes32[] calldata credentialHashes,
        address[] calldata subjects,
        uint64[] calldata validUntils,
        bytes32[] calldata schemaIds
    ) external override whenNotPaused onlyVerifiedIssuer {
        uint256 len = credentialHashes.length;
        require(len > 0, "Empty batch");
        require(
            subjects.length == len && validUntils.length == len && schemaIds.length == len,
            "Mismatched array lengths"
        );

        for (uint256 i = 0; i < len; ) {
            bytes32 cHash = credentialHashes[i];
            require(cHash != bytes32(0), "Invalid hash in batch");
            require(_records[cHash].issuedAt == 0, "Duplicate hash in batch");

            _records[cHash] = CredentialRecord({
                credentialHash: cHash,
                issuer: msg.sender,
                subject: subjects[i],
                schemaId: schemaIds[i],
                issuedAt: uint64(block.timestamp),
                validUntil: validUntils[i],
                revoked: false,
                reason: RevocationReason.None,
                revokedAt: 0
            });

            _issuerCredentials[msg.sender].push(cHash);
            if (subjects[i] != address(0)) {
                _subjectCredentials[subjects[i]].push(cHash);
            }

            emit CredentialAnchored(cHash, msg.sender, subjects[i], schemaIds[i], validUntils[i]);
            unchecked { ++i; }
        }

        emit BatchCredentialsAnchored(msg.sender, len, keccak256(abi.encodePacked(credentialHashes)));
    }

    /**
     * @notice Revokes a previously anchored credential.
     * Only the original issuer or contract owner can revoke.
     */
    function revokeCredential(
        bytes32 credentialHash,
        RevocationReason reason
    ) external override whenNotPaused {
        CredentialRecord storage record = _records[credentialHash];
        require(record.issuedAt > 0, "ArcCredentialRegistry: credential not anchored");
        require(!record.revoked, "ArcCredentialRegistry: already revoked");
        require(
            msg.sender == record.issuer || msg.sender == owner,
            "ArcCredentialRegistry: only issuer or owner can revoke"
        );

        record.revoked = true;
        record.reason = reason;
        record.revokedAt = uint64(block.timestamp);

        emit CredentialRevoked(credentialHash, record.issuer, reason, record.revokedAt);
    }

    /**
     * @notice Pure on-chain verification check against the Arc registry.
     */
    function isCredentialValid(bytes32 credentialHash)
        external
        view
        override
        returns (
            bool isValid,
            bool isRevoked,
            bool isExpired,
            address issuer,
            address subject,
            uint64 issuedAt,
            uint64 validUntil,
            bytes32 schemaId
        )
    {
        CredentialRecord memory record = _records[credentialHash];
        if (record.issuedAt == 0) {
            return (false, false, false, address(0), address(0), 0, 0, bytes32(0));
        }

        isRevoked = record.revoked;
        isExpired = (record.validUntil > 0 && block.timestamp > record.validUntil);
        isValid = (!isRevoked && !isExpired);

        return (
            isValid,
            isRevoked,
            isExpired,
            record.issuer,
            record.subject,
            record.issuedAt,
            record.validUntil,
            record.schemaId
        );
    }

    function getCredentialRecord(bytes32 credentialHash)
        external
        view
        override
        returns (CredentialRecord memory)
    {
        return _records[credentialHash];
    }

    function getSubjectCredentials(address subject) external view returns (bytes32[] memory) {
        return _subjectCredentials[subject];
    }

    function getIssuerCredentials(address issuer) external view returns (bytes32[] memory) {
        return _issuerCredentials[issuer];
    }

    // Admin & Governance Functions
    function setIssuerRegistry(address _issuerRegistry) external onlyOwner {
        issuerRegistry = IArcIssuerRegistry(_issuerRegistry);
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        owner = newOwner;
    }
}
