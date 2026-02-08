'use client';

import { useEffect, useState, useRef, type ReactNode, createContext, useContext } from 'react';

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

  // Dynamically import SDK inside useEffect to avoid SSR issues
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    import('@farcaster/miniapp-sdk').then(({ sdk }) => {
      // Call ready() immediately to dismiss splash screen
      sdk.actions.ready();
      console.log('Farcaster SDK ready() called');

      // Then load context asynchronously
      sdk.isInMiniApp().then(async (isMiniApp) => {
        setIsInMiniApp(isMiniApp);
        console.log('Is in Mini App:', isMiniApp);

        if (isMiniApp) {
          try {
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

            try {
              const ethProvider = await sdk.wallet.getEthereumProvider();
              if (ethProvider) {
                setProvider(ethProvider);
                // Expose as window.ethereum so wagmi injected() connector can use it
                if (typeof window !== 'undefined') {
                  (window as any).ethereum = ethProvider;
                }
              }
            } catch (e) {
              console.log('Wallet provider not available:', e);
            }
          } catch (error) {
            console.error('Farcaster SDK context error:', error);
          }
        }

        setIsLoading(false);
      }).catch((error) => {
        console.error('Farcaster isInMiniApp error:', error);
        setIsLoading(false);
      });
    }).catch((error) => {
      console.error('Failed to load Farcaster SDK:', error);
      setIsLoading(false);
    });
  }, []);

  return (
    <FarcasterContext.Provider value={{ isInMiniApp, isLoading, user, provider }}>
      {children}
    </FarcasterContext.Provider>
  );
}
