'use client';

import { useEffect, useState, type ReactNode, createContext, useContext } from 'react';

interface FarcasterContextType {
  isInMiniApp: boolean;
  isLoading: boolean;
  userFid: number | null;
  username: string | null;
  avatarUrl: string | null;
}

const FarcasterContext = createContext<FarcasterContextType>({
  isInMiniApp: false,
  isLoading: true,
  userFid: null,
  username: null,
  avatarUrl: null,
});

export const useFarcaster = () => useContext(FarcasterContext);

export function FarcasterSDK({ children }: { children: ReactNode }) {
  const [isInMiniApp, setIsInMiniApp] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userFid, setUserFid] = useState<number | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk');
        const isMiniApp = await sdk.isInMiniApp();
        setIsInMiniApp(isMiniApp);
        console.log('Is in Mini App:', isMiniApp);

        if (isMiniApp) {
          const context = await sdk.context;
          if (context?.user) {
            setUserFid(context.user.fid);
            setUsername(context.user.username || null);
            setAvatarUrl(context.user.pfpUrl || null);
          }
          sdk.actions.ready({});
        }
      } catch (error) {
        console.error('Farcaster SDK error:', error);
        try {
          const { sdk } = await import('@farcaster/miniapp-sdk');
          sdk.actions.ready({});
        } catch (e) {
          console.error('Failed to call ready:', e);
        }
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  return (
    <FarcasterContext.Provider value={{ isInMiniApp, isLoading, userFid, username, avatarUrl }}>
      {children}
    </FarcasterContext.Provider>
  );
}
