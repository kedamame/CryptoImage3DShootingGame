import { http, createConfig, createStorage } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { coinbaseWallet, injected, walletConnect, metaMask } from 'wagmi/connectors';

export const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '';

// Set to true for testnet, false for mainnet
export const USE_TESTNET = false;

export const config = createConfig({
  chains: USE_TESTNET ? [baseSepolia, base] : [base, baseSepolia],
  connectors: [
    // Mini App (Farcaster wallet) - injected wallets
    injected({ shimDisconnect: true }),
    // Coinbase Wallet
    coinbaseWallet({ appName: 'CryptoImageShootingGame', preference: 'all' }),
    // MetaMask
    metaMask({ shimDisconnect: true }),
    // WalletConnect (supports many wallets: Rainbow, Trust, Zerion, etc.)
    ...(projectId ? [walletConnect({ projectId, showQrModal: true })] : []),
  ],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
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
