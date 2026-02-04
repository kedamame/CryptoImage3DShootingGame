'use client';

import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues
const GameUI = dynamic(() => import('@/components/game/GameUI'), {
  ssr: false,
  loading: () => (
    <div className="w-screen h-screen bg-darker flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-12 h-12 border-4 border-secondary border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-secondary text-lg">Loading...</p>
      </div>
    </div>
  ),
});

export default function Home() {
  return (
    <main className="w-screen h-screen overflow-hidden">
      <GameUI />
    </main>
  );
}
