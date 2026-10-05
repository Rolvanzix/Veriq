import { defineChain } from 'viem';

/**
 * Arc Mainnet EVM Chain Definition
 * Native high-throughput Layer-1 with sub-second finality and deterministic state verification.
 */
export const arcMainnet = defineChain({
  id: 42424,
  name: 'Arc Mainnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Arc',
    symbol: 'ARC',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.arc.network'],
      webSocket: ['wss://ws.arc.network'],
    },
    public: {
      http: ['https://rpc.arc.network'],
      webSocket: ['wss://ws.arc.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'ArcScan',
      url: 'https://explorer.arc.network',
    },
  },
  contracts: {
    multicall3: {
      address: '0xca11bde05977b3631167028862be2a173976ca11',
      blockCreated: 1,
    },
  },
});

/**
 * Arc Testnet EVM Chain Definition for Staging & Integration Testing
 */
export const arcTestnet = defineChain({
  id: 42420,
  name: 'Arc Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Testnet Arc',
    symbol: 'tARC',
  },
  rpcUrls: {
    default: {
      http: ['https://testnet-rpc.arc.network'],
    },
    public: {
      http: ['https://testnet-rpc.arc.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'ArcScan Testnet',
      url: 'https://testnet-explorer.arc.network',
    },
  },
  testnet: true,
});
