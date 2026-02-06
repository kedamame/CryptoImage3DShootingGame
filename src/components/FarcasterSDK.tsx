'use client';

import { useEffect, useState, type ReactNode, createContext, useContext } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

interface FarcasterUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  custodyAddress?: string;
}

interface FarcasterContextType {
  isInMiniApp: boolean;
  isLoading: boolean;
  user: FarcasterUser | null;
  connectWallet: () => Promise<void>;
}

const FarcasterContext = createContext<FarcasterContextType>({
  isInMiniApp: false,
  isLoading: true,
  user: null,
  connectWallet: async () => {},
});

export const useFarcaster = () => useContext(FarcasterContext);

export function FarcasterSDK({ children }: { children: ReactNode }) {
  const [isInMiniApp, setIsInMiniApp] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<FarcasterUser | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        // Always call ready() first to dismiss splash screen
        // This should be called as early as possible
        sdk.actions.ready({});
        console.log('Farcaster SDK ready() called');

        const isMiniApp = await sdk.isInMiniApp();
        setIsInMiniApp(isMiniApp);
        console.log('Is in Mini App:', isMiniApp);

        if (isMiniApp) {
          const context = await sdk.context;
          console.log('Farcaster context:', context);

          if (context?.user) {
            const userData = context.user as any;
            setUser({
              fid: userData.fid,
              username: userData.username,
              displayName: userData.displayName,
              pfpUrl: userData.pfpUrl,
              custodyAddress: userData.custodyAddress,
            });
          }
        }
      } catch (error) {
        console.error('Farcaster SDK error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const connectWallet = async () => {
    if (!isInMiniApp) return;

    try {
      const provider = await sdk.wallet.getEthereumProvider();
      if (provider) {
        (window as any).ethereum = provider;
      }
    } catch (error) {
      console.error('Failed to get Farcaster wallet provider:', error);
    }
  };

  return (
    <FarcasterContext.Provider value={{ isInMiniApp, isLoading, user, connectWallet }}>
      {children}
    </FarcasterContext.Provider>
  );
}
