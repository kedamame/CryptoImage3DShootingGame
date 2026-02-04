'use client';

import { type ReactNode, useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, useReconnect } from 'wagmi';
import { config } from '@/lib/wagmi';
import { FarcasterSDK } from '@/components/FarcasterSDK';

function WagmiReconnect() {
  const { reconnect } = useReconnect();
  useEffect(() => {
    reconnect();
  }, [reconnect]);
  return null;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 60 * 1000 } },
      })
  );

  return (
    <FarcasterSDK>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <WagmiReconnect />
          {children}
        </QueryClientProvider>
      </WagmiProvider>
    </FarcasterSDK>
  );
}
