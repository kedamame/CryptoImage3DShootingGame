import { http, createConfig, createStorage } from 'wagmi';
import { base } from 'wagmi/chains';
import { coinbaseWallet, injected } from 'wagmi/connectors';

export const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '';

export const config = createConfig({
  chains: [base],
  connectors: [
    // Mini App (Farcaster wallet)
    injected({ shimDisconnect: true }),
    // Web (Coinbase Wallet)
    coinbaseWallet({ appName: 'CryptoImageShootingGame', preference: 'all' }),
  ],
  transports: {
    [base.id]: http(),
  },
  ssr: true,
  storage: createStorage({
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  }),
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
