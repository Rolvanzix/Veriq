// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IArcIssuerRegistry.sol";

/**
 * @title ArcIssuerRegistry
 * @notice Production smart contract on Arc Mainnet connecting:
 * Organization -> Verified Identity -> Multiple Authorized Issuer Wallets -> Lifecycle Status
 * @dev Enforces multi-wallet authorization, suspension gates, and audit event trails.
 */
contract ArcIssuerRegistry is IArcIssuerRegistry {
    address public owner;
    address public pendingOwner;
    bool public paused;

    // orgId => Organization
    mapping(bytes32 => Organization) private _organizations;

    // orgId => admin address => bool
    mapping(bytes32 => mapping(address => bool)) private _orgAdmins;

    // wallet address => IssuerWalletInfo
    mapping(address => IssuerWalletInfo) private _issuerWallets;

    // orgId => list of wallet addresses
    mapping(bytes32 => address[]) private _orgWalletList;

    // List of registered organization IDs
    bytes32[] private _allOrgIds;

    // Whitelist of authorized registry callers (e.g., ArcCredentialRegistry contract)
    mapping(address => bool) public authorizedCallers;

    modifier onlyOwner() {
        require(msg.sender == owner, "ArcIssuerRegistry: caller is not governance owner");
        _;
    }

    modifier onlyAuthorized() {
        require(msg.sender == owner || authorizedCallers[msg.sender], "ArcIssuerRegistry: unauthorized caller");
        _;
    }

    modifier onlyOrgAdmin(bytes32 orgId) {
        require(_organizations[orgId].registeredAt > 0, "ArcIssuerRegistry: organization not found");
        require(
            msg.sender == owner ||
            msg.sender == _organizations[orgId].owner ||
            _orgAdmins[orgId][msg.sender],
            "ArcIssuerRegistry: caller is not an organization administrator or owner"
        );
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "ArcIssuerRegistry: contract is paused");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Registers a new organization in Pending status.
     * @param orgId Deterministic unique identifier (e.g. keccak256 hash of DID)
     * @param name Official organization legal name
     * @param didUri Organization DID URI (e.g. did:arc:org_ait)
     * @param metadataHash Legal entity verification digest (IPFS CID hash)
     * @param initialIssuerWallet First designated issuer wallet to bind
     * @param initialWalletLabel Descriptive label for the initial wallet (e.g. "Primary Key")
     */
    function registerOrganization(
        bytes32 orgId,
        string calldata name,
        string calldata didUri,
        bytes32 metadataHash,
        address initialIssuerWallet,
        string calldata initialWalletLabel
    ) external override whenNotPaused {
        require(orgId != bytes32(0), "ArcIssuerRegistry: invalid orgId");
        require(bytes(name).length > 0, "ArcIssuerRegistry: empty name");
        require(bytes(didUri).length > 0, "ArcIssuerRegistry: empty DID URI");
        require(_organizations[orgId].registeredAt == 0, "ArcIssuerRegistry: organization already registered");

        _organizations[orgId] = Organization({
            orgId: orgId,
            name: name,
            didUri: didUri,
            metadataHash: metadataHash,
            owner: msg.sender,
            status: OrgStatus.Pending,
            registeredAt: uint64(block.timestamp),
            verifiedAt: 0,
            credentialCount: 0
        });

        _orgAdmins[orgId][msg.sender] = true;
        _allOrgIds.push(orgId);

        emit OrganizationRegistered(orgId, name, didUri, msg.sender, metadataHash);

        if (initialIssuerWallet != address(0)) {
            _issuerWallets[initialIssuerWallet] = IssuerWalletInfo({
                orgId: orgId,
                label: bytes(initialWalletLabel).length > 0 ? initialWalletLabel : "Primary Issuer Wallet",
                isAuthorized: true,
                authorizedAt: uint64(block.timestamp),
                authorizedBy: msg.sender
            });
            _orgWalletList[orgId].push(initialIssuerWallet);

            emit IssuerWalletAuthorized(
                orgId,
                initialIssuerWallet,
                _issuerWallets[initialIssuerWallet].label,
                msg.sender
            );
        }
    }

    /**
     * @notice Governance function to verify, suspend, or revoke an organization.
     */
    function setOrganizationStatus(
        bytes32 orgId,
        OrgStatus newStatus,
        string calldata reason
    ) external override onlyOwner {
        Organization storage org = _organizations[orgId];
        require(org.registeredAt > 0, "ArcIssuerRegistry: organization not found");

        OrgStatus previous = org.status;
        org.status = newStatus;

        if (newStatus == OrgStatus.Verified && org.verifiedAt == 0) {
            org.verifiedAt = uint64(block.timestamp);
        }

        emit OrganizationStatusChanged(orgId, previous, newStatus, reason);
    }

    /**
     * @notice Suspends an organization, immediately halting new credential issuance.
     * Can be invoked by contract owner (compliance) or by the organization's own owner/admin.
     */
    function suspendOrganization(bytes32 orgId, string calldata reason) external override {
        Organization storage org = _organizations[orgId];
        require(org.registeredAt > 0, "ArcIssuerRegistry: organization not found");
        require(
            msg.sender == owner ||
            msg.sender == org.owner ||
            _orgAdmins[orgId][msg.sender],
            "ArcIssuerRegistry: unauthorized to suspend"
        );
        require(org.status == OrgStatus.Verified, "ArcIssuerRegistry: can only suspend verified org");

        org.status = OrgStatus.Suspended;
        emit OrganizationSuspended(orgId, msg.sender, reason);
        emit OrganizationStatusChanged(orgId, OrgStatus.Verified, OrgStatus.Suspended, reason);
    }

    /**
     * @notice Reactivates a suspended organization to Verified status.
     */
    function reactivateOrganization(bytes32 orgId) external override {
        Organization storage org = _organizations[orgId];
        require(org.registeredAt > 0, "ArcIssuerRegistry: organization not found");
        require(
            msg.sender == owner ||
            msg.sender == org.owner ||
            _orgAdmins[orgId][msg.sender],
            "ArcIssuerRegistry: unauthorized to reactivate"
        );
        require(org.status == OrgStatus.Suspended, "ArcIssuerRegistry: org is not suspended");

        org.status = OrgStatus.Verified;
        emit OrganizationReactivated(orgId, msg.sender);
        emit OrganizationStatusChanged(orgId, OrgStatus.Suspended, OrgStatus.Verified, "Reactivated");
    }

    /**
     * @notice Authorizes a new issuer wallet under an organization.
     * Example: Primary issuer wallet, Education issuer wallet, Events issuer wallet, HR issuer wallet.
     * Requires authorization from an existing organization administrator or owner.
     */
    function authorizeIssuerWallet(
        bytes32 orgId,
        address wallet,
        string calldata label
    ) external override whenNotPaused onlyOrgAdmin(orgId) {
        require(wallet != address(0), "ArcIssuerRegistry: zero address");
        require(bytes(label).length > 0, "ArcIssuerRegistry: empty label");
        require(_organizations[orgId].status != OrgStatus.Revoked, "ArcIssuerRegistry: organization revoked");

        // Prevent wallet conflict with a different active organization
        IssuerWalletInfo storage existing = _issuerWallets[wallet];
        if (existing.isAuthorized && existing.orgId != orgId) {
            revert("ArcIssuerRegistry: wallet already active under another organization");
        }

        bool isNew = (existing.authorizedAt == 0);

        _issuerWallets[wallet] = IssuerWalletInfo({
            orgId: orgId,
            label: label,
            isAuthorized: true,
            authorizedAt: uint64(block.timestamp),
            authorizedBy: msg.sender
        });

        if (isNew) {
            _orgWalletList[orgId].push(wallet);
        }

        emit IssuerWalletAuthorized(orgId, wallet, label, msg.sender);
    }

    /**
     * @notice Revokes an issuer wallet's authorization.
     * Requires authorization from an existing organization administrator or owner.
     */
    function revokeIssuerWallet(
        bytes32 orgId,
        address wallet,
        string calldata reason
    ) external override onlyOrgAdmin(orgId) {
        IssuerWalletInfo storage info = _issuerWallets[wallet];
        require(info.orgId == orgId, "ArcIssuerRegistry: wallet does not belong to this org");
        require(info.isAuthorized, "ArcIssuerRegistry: wallet not active");

        info.isAuthorized = false;

        emit IssuerWalletRevoked(orgId, wallet, reason, msg.sender);
    }

    /**
     * @notice Designates an additional administrator for the organization.
     */
    function setOrganizationAdmin(
        bytes32 orgId,
        address admin,
        bool isAuthorized
    ) external override onlyOrgAdmin(orgId) {
        require(admin != address(0), "ArcIssuerRegistry: zero address");
        _orgAdmins[orgId][admin] = isAuthorized;
        emit OrganizationAdminUpdated(orgId, admin, isAuthorized, msg.sender);
    }

    /**
     * @notice Records an anchored credential issuance against the organization's metrics.
     */
    function recordIssuance(address issuerWallet) external override onlyAuthorized {
        IssuerWalletInfo memory info = _issuerWallets[issuerWallet];
        if (info.isAuthorized && info.orgId != bytes32(0)) {
            _organizations[info.orgId].credentialCount += 1;
            emit CredentialCountIncremented(info.orgId, issuerWallet, _organizations[info.orgId].credentialCount);
        }
    }

    // --- View Functions ---

    /**
     * @notice Primary check for credential anchoring:
     * A wallet is authorized ONLY if:
     * 1. The wallet is registered and active for an organization.
     * 2. The organization's status is strictly Verified.
     * If the organization is Suspended, Revoked, or Pending, issuance is blocked.
     */
    function canWalletIssue(address wallet)
        public
        view
        override
        returns (bool allowed, bytes32 orgId, OrgStatus status)
    {
        IssuerWalletInfo memory info = _issuerWallets[wallet];
        if (!info.isAuthorized || info.orgId == bytes32(0) || paused) {
            return (false, bytes32(0), OrgStatus.Pending);
        }

        Organization memory org = _organizations[info.orgId];
        bool isAllowed = (info.isAuthorized && org.status == OrgStatus.Verified && !paused);

        return (isAllowed, info.orgId, org.status);
    }

    /**
     * @notice Backwards-compatible check for ArcCredentialRegistry
     */
    function isVerifiedIssuer(address wallet) external view override returns (bool) {
        (bool allowed, , ) = canWalletIssue(wallet);
        return allowed;
    }

    function getOrganization(bytes32 orgId)
        external
        view
        override
        returns (Organization memory)
    {
        return _organizations[orgId];
    }

    function getOrganizationIssuerWallets(bytes32 orgId)
        external
        view
        override
        returns (address[] memory)
    {
        return _orgWalletList[orgId];
    }

    function getWalletOrganization(address wallet)
        external
        view
        override
        returns (bytes32 orgId, string memory label, bool isAuthorized)
    {
        IssuerWalletInfo memory info = _issuerWallets[wallet];
        return (info.orgId, info.label, info.isAuthorized);
    }

    function isOrganizationAdmin(bytes32 orgId, address account) external view returns (bool) {
        return (account == owner || account == _organizations[orgId].owner || _orgAdmins[orgId][account]);
    }

    function totalOrganizations() external view returns (uint256) {
        return _allOrgIds.length;
    }

    function getOrgIdAtIndex(uint256 index) external view returns (bytes32) {
        require(index < _allOrgIds.length, "Index out of bounds");
        return _allOrgIds[index];
    }

    // --- Admin Governance Controls ---
    function setAuthorizedCaller(address caller, bool authorized) external onlyOwner {
        authorizedCallers[caller] = authorized;
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        pendingOwner = newOwner;
    }

    function acceptOwnership() external {
        require(msg.sender == pendingOwner, "Not pending owner");
        owner = pendingOwner;
        pendingOwner = address(0);
    }
}
