import { http, createConfig, createStorage, cookieStorage } from 'wagmi';
import { base } from 'wagmi/chains';
import { coinbaseWallet, injected, walletConnect } from 'wagmi/connectors';

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '552cb507950acde889580c9b094b668f';

export const config = createConfig({
  chains: [base],
  connectors: [
    injected({ shimDisconnect: true }),
    coinbaseWallet({ appName: 'Crypto Shooting Game', preference: 'all' }),
    walletConnect({ projectId, showQrModal: true }),
  ],
  transports: {
    [base.id]: http(),
  },
  multiInjectedProviderDiscovery: true,
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
