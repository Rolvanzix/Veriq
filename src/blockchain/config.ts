import { createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { arcMainnet, arcTestnet } from './chain';

export const config = createConfig({
  chains: [arcMainnet, arcTestnet],
  connectors: [
    injected({
      target() {
        return {
          id: 'injected',
          name: 'Arc / Web3 Wallet',
          provider: typeof window !== 'undefined' ? (window as any).ethereum : undefined,
        };
      },
    }),
  ],
  transports: {
    [arcMainnet.id]: http('https://rpc.arc.network'),
    [arcTestnet.id]: http('https://testnet-rpc.arc.network'),
  },
  ssr: false,
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
