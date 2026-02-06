'use client';

import { useEffect, useState, useRef, type ReactNode, createContext, useContext } from 'react';
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
  provider: any | null;
}

const FarcasterContext = createContext<FarcasterContextType>({
  isInMiniApp: false,
  isLoading: true,
  user: null,
  provider: null,
});

export const useFarcaster = () => useContext(FarcasterContext);

export function FarcasterSDK({ children }: { children: ReactNode }) {
  const [isInMiniApp, setIsInMiniApp] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<FarcasterUser | null>(null);
  const [provider, setProvider] = useState<any>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const initSDK = async () => {
      try {
        // First, call ready() to dismiss the splash screen
        await sdk.actions.ready();
        console.log('Farcaster SDK ready() called');
      } catch (error) {
        console.error('Failed to call ready():', error);
      }

      try {
        // Check if we're in a mini app
        const isMiniApp = await sdk.isInMiniApp();
        setIsInMiniApp(isMiniApp);
        console.log('Is in Mini App:', isMiniApp);

        if (isMiniApp) {
          // Get context and user data
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

          // Get wallet provider without overriding window.ethereum
          try {
            const ethProvider = await sdk.wallet.getEthereumProvider();
            if (ethProvider) {
              setProvider(ethProvider);
              console.log('Farcaster wallet provider obtained');
            }
          } catch (e) {
            console.log('Wallet provider not available:', e);
          }
        }
      } catch (error) {
        console.error('Farcaster SDK context error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initSDK();
  }, []);

  return (
    <FarcasterContext.Provider value={{ isInMiniApp, isLoading, user, provider }}>
      {children}
    </FarcasterContext.Provider>
  );
}
