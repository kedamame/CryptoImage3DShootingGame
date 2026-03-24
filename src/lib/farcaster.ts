'use client';

import { useEffect, useState, useRef } from 'react';

interface FarcasterUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}

interface FarcasterState {
  isInMiniApp: boolean;
  isLoading: boolean;
  user: FarcasterUser | null;
}

/**
 * Hook to detect Farcaster miniapp environment and load user context.
 * In a standard browser, this resolves immediately with isInMiniApp=false.
 * Inside Farcaster, it calls sdk.actions.ready() and loads user profile.
 */
export function useFarcasterMiniApp(): FarcasterState {
  const [state, setState] = useState<FarcasterState>({
    isInMiniApp: false,
    isLoading: true,
    user: null,
  });
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    import('@farcaster/miniapp-sdk')
      .then(async ({ sdk }) => {
        const isMiniApp = await sdk.isInMiniApp();
        if (!isMiniApp) {
          setState({ isInMiniApp: false, isLoading: false, user: null });
          return;
        }

        // Dismiss Farcaster splash screen
        sdk.actions.ready();

        // Expose Farcaster wallet as window.ethereum for wagmi injected() connector
        try {
          const ethProvider = await sdk.wallet.getEthereumProvider();
          if (ethProvider && typeof window !== 'undefined') {
            (window as any).ethereum = ethProvider;
          }
        } catch {
          // Wallet provider not available in this context
        }

        // Load user profile
        let user: FarcasterUser | null = null;
        try {
          const context = await sdk.context;
          if (context?.user) {
            const u = context.user as any;
            user = {
              fid: u.fid,
              username: u.username,
              displayName: u.displayName,
              pfpUrl: u.pfpUrl,
            };
          }
        } catch {
          // Context not available
        }

        setState({ isInMiniApp: true, isLoading: false, user });
      })
      .catch(() => {
        // SDK failed to load — not in Farcaster environment
        setState({ isInMiniApp: false, isLoading: false, user: null });
      });
  }, []);

  return state;
}
