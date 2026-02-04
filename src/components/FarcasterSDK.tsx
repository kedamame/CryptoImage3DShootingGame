'use client';

import { useEffect, useState, type ReactNode, createContext, useContext } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FarcasterContext = any;

interface FarcasterContextType {
  isInMiniApp: boolean;
  isLoading: boolean;
  context: FarcasterContext | null;
  userFid: number | null;
  userName: string | null;
  userAvatar: string | null;
}

const FarcasterContext = createContext<FarcasterContextType>({
  isInMiniApp: false,
  isLoading: true,
  context: null,
  userFid: null,
  userName: null,
  userAvatar: null,
});

export const useFarcaster = () => useContext(FarcasterContext);

export function FarcasterSDK({ children }: { children: ReactNode }) {
  const [isInMiniApp, setIsInMiniApp] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [context, setContext] = useState<FarcasterContext | null>(null);
  const [userFid, setUserFid] = useState<number | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const isMiniApp = await sdk.isInMiniApp();
        setIsInMiniApp(isMiniApp);
        console.log('Is in Mini App:', isMiniApp);

        if (isMiniApp) {
          const ctx = await sdk.context;
          setContext(ctx);

          if (ctx?.user) {
            setUserFid(ctx.user.fid);
            setUserName(ctx.user.username || ctx.user.displayName || null);
            setUserAvatar(ctx.user.pfpUrl || null);
          }

          sdk.actions.ready({});
        }
      } catch (error) {
        console.error('Farcaster SDK error:', error);
        try {
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
    <FarcasterContext.Provider
      value={{ isInMiniApp, isLoading, context, userFid, userName, userAvatar }}
    >
      {children}
    </FarcasterContext.Provider>
  );
}
