// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IArcCrossChainTeleport
 * @notice Modular cross-chain communication adapter for Arc Mainnet credential verification proofs.
 * Enables foreign chains (Ethereum, Arbitrum, Base, Optimism) to verify Arc credentials via secure relays.
 */
interface IArcCrossChainTeleport {
    struct CrossChainRequest {
        bytes32 requestId;
        uint32 destinationChainId;
        address destinationReceiver;
        bytes32 credentialHash;
        address verifier;
        uint64 timestamp;
    }

    event CrossChainVerificationDispatched(
        bytes32 indexed requestId,
        uint32 indexed destinationChainId,
        address indexed destinationReceiver,
        bytes32 credentialHash,
        bool isValid
    );

    function dispatchVerificationProof(
        uint32 destinationChainId,
        address destinationReceiver,
        bytes32 credentialHash
    ) external payable returns (bytes32 requestId);
}
