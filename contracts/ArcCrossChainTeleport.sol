// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IArcCrossChainTeleport.sol";
import "./interfaces/IArcCredentialRegistry.sol";

/**
 * @title ArcCrossChainTeleport
 * @notice Cross-chain messaging adapter that enables foreign EVM rollups and chains
 * (e.g., Ethereum Mainnet, Arbitrum One, Optimism, Base, Polygon) to query and verify
 * Arc-anchored verifiable credentials without having to maintain replicated state.
 */
contract ArcCrossChainTeleport is IArcCrossChainTeleport {
    address public owner;
    IArcCredentialRegistry public credentialRegistry;

    // Supported remote destination chains (e.g. 1 = Ethereum, 42161 = Arbitrum, 8453 = Base)
    mapping(uint32 => bool) public supportedRemoteChains;
    mapping(bytes32 => CrossChainRequest) public requests;

    uint256 public dispatchFee = 0.001 ether;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor(address _credentialRegistry) {
        owner = msg.sender;
        credentialRegistry = IArcCredentialRegistry(_credentialRegistry);
        
        // Pre-enable major EVM ecosystems for cross-chain verification
        supportedRemoteChains[1] = true;     // Ethereum Mainnet
        supportedRemoteChains[42161] = true; // Arbitrum One
        supportedRemoteChains[8453] = true;  // Base
        supportedRemoteChains[10] = true;    // Optimism
    }

    /**
     * @notice Dispatches an authenticated verification state proof to a destination chain.
     */
    function dispatchVerificationProof(
        uint32 destinationChainId,
        address destinationReceiver,
        bytes32 credentialHash
    ) external payable override returns (bytes32 requestId) {
        require(supportedRemoteChains[destinationChainId], "Destination chain not supported");
        require(msg.value >= dispatchFee, "Insufficient dispatch fee");
        require(destinationReceiver != address(0), "Invalid receiver");

        (bool isValid, , , , , , , ) = credentialRegistry.isCredentialValid(credentialHash);

        requestId = keccak256(
            abi.encodePacked(
                block.timestamp,
                msg.sender,
                destinationChainId,
                destinationReceiver,
                credentialHash
            )
        );

        requests[requestId] = CrossChainRequest({
            requestId: requestId,
            destinationChainId: destinationChainId,
            destinationReceiver: destinationReceiver,
            credentialHash: credentialHash,
            verifier: msg.sender,
            timestamp: uint64(block.timestamp)
        });

        emit CrossChainVerificationDispatched(
            requestId,
            destinationChainId,
            destinationReceiver,
            credentialHash,
            isValid
        );

        return requestId;
    }

    function setSupportedChain(uint32 chainId, bool supported) external onlyOwner {
        supportedRemoteChains[chainId] = supported;
    }

    function setDispatchFee(uint256 newFee) external onlyOwner {
        dispatchFee = newFee;
    }

    function withdrawFees(address payable recipient) external onlyOwner {
        recipient.transfer(address(this).balance);
    }
}
