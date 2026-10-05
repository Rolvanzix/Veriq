// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IArcIssuerRegistry
 * @notice Authoritative registry connecting Organization -> Verified Identity -> Authorized Issuer Wallets -> Status
 */
interface IArcIssuerRegistry {
    enum OrgStatus {
        Pending,   // Registered, awaiting domain-control and institutional review
        Verified,  // Fully accredited on Arc Mainnet, allowed to issue credentials
        Suspended, // Temporarily suspended, new credential issuance blocked
        Revoked    // Permanently revoked, all issuance blocked
    }

    struct Organization {
        bytes32 orgId;           // Unique identifier (keccak256 hash of DID or slug)
        string name;             // Legal entity / organization name
        string didUri;           // e.g. did:arc:org_ait
        bytes32 metadataHash;    // IPFS/Arweave legal entity metadata digest
        address owner;           // Primary organization owner address
        OrgStatus status;        // Verification lifecycle state
        uint64 registeredAt;     // Initial registration timestamp
        uint64 verifiedAt;       // Timestamp when verified by Arc governance
        uint256 credentialCount; // Total credentials anchored by this organization
    }

    struct IssuerWalletInfo {
        bytes32 orgId;           // Organization this wallet belongs to
        string label;            // e.g. "Primary", "Education", "Events", "HR"
        bool isAuthorized;       // Active authorization flag
        uint64 authorizedAt;     // Timestamp authorized
        address authorizedBy;    // Admin who granted authorization
    }

    // --- Events ---
    event OrganizationRegistered(
        bytes32 indexed orgId,
        string name,
        string didUri,
        address indexed owner,
        bytes32 metadataHash
    );

    event OrganizationStatusChanged(
        bytes32 indexed orgId,
        OrgStatus previousStatus,
        OrgStatus newStatus,
        string reason
    );

    event OrganizationSuspended(
        bytes32 indexed orgId,
        address indexed caller,
        string reason
    );

    event OrganizationReactivated(
        bytes32 indexed orgId,
        address indexed caller
    );

    event IssuerWalletAuthorized(
        bytes32 indexed orgId,
        address indexed wallet,
        string label,
        address indexed authorizedBy
    );

    event IssuerWalletRevoked(
        bytes32 indexed orgId,
        address indexed wallet,
        string reason,
        address indexed revokedBy
    );

    event OrganizationAdminUpdated(
        bytes32 indexed orgId,
        address indexed admin,
        bool isAuthorized,
        address indexed updatedBy
    );

    event CredentialCountIncremented(
        bytes32 indexed orgId,
        address indexed issuerWallet,
        uint256 newTotal
    );

    // --- State-Modifying Functions ---
    function registerOrganization(
        bytes32 orgId,
        string calldata name,
        string calldata didUri,
        bytes32 metadataHash,
        address initialIssuerWallet,
        string calldata initialWalletLabel
    ) external;

    function setOrganizationStatus(
        bytes32 orgId,
        OrgStatus newStatus,
        string calldata reason
    ) external;

    function suspendOrganization(bytes32 orgId, string calldata reason) external;

    function reactivateOrganization(bytes32 orgId) external;

    function authorizeIssuerWallet(
        bytes32 orgId,
        address wallet,
        string calldata label
    ) external;

    function revokeIssuerWallet(
        bytes32 orgId,
        address wallet,
        string calldata reason
    ) external;

    function setOrganizationAdmin(
        bytes32 orgId,
        address admin,
        bool isAuthorized
    ) external;

    function recordIssuance(address issuerWallet) external;

    // --- View Functions ---
    function isVerifiedIssuer(address wallet) external view returns (bool);

    function canWalletIssue(address wallet)
        external
        view
        returns (bool allowed, bytes32 orgId, OrgStatus status);

    function getOrganization(bytes32 orgId) external view returns (Organization memory);

    function getOrganizationIssuerWallets(bytes32 orgId) external view returns (address[] memory);

    function getWalletOrganization(address wallet)
        external
        view
        returns (bytes32 orgId, string memory label, bool isAuthorized);
}
