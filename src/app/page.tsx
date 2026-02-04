'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useFarcaster } from '@/components/FarcasterSDK';
import { fetchWalletAssets, WalletAsset } from '@/lib/wallet-assets';
import { getTopScores, LEADERBOARD_CONTRACT_ADDRESS, LEADERBOARD_ABI, LeaderboardEntry } from '@/lib/leaderboard';
import GameUI from '@/components/game/GameUI';

// Dynamic import for Game component (no SSR for PixiJS)
const Game = dynamic(() => import('@/components/game/Game'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4 animate-bounce">🎮</div>
        <p className="text-secondary loading-dots">Loading game</p>
      </div>
    </div>
  ),
});

export default function HomePage() {
  const { address, isConnected } = useAccount();
  const { avatarUrl } = useFarcaster();

  // Game state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [gameKey, setGameKey] = useState(0);

  // Wallet assets
  const [walletAssets, setWalletAssets] = useState<WalletAsset[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);

  // Leaderboard
  const [highScores, setHighScores] = useState<LeaderboardEntry[]>([]);
  const [hasSubmittedScore, setHasSubmittedScore] = useState(false);

  // Contract write
  const { writeContract, data: txHash, isPending: isSubmittingScore } = useWriteContract();
  const { isSuccess: txSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // Fetch wallet assets when connected
  useEffect(() => {
    if (address) {
      setIsLoadingAssets(true);
      fetchWalletAssets(address)
        .then(assets => {
          setWalletAssets(assets);
          console.log('Loaded wallet assets:', assets);
        })
        .catch(err => console.error('Failed to fetch wallet assets:', err))
        .finally(() => setIsLoadingAssets(false));
    }
  }, [address]);

  // Fetch leaderboard
  useEffect(() => {
    getTopScores(20)
      .then(scores => setHighScores(scores))
      .catch(err => console.error('Failed to fetch leaderboard:', err));
  }, [txSuccess]); // Refresh after successful submission

  // Handle tx success
  useEffect(() => {
    if (txSuccess) {
      setHasSubmittedScore(true);
    }
  }, [txSuccess]);

  // Start game
  const handleStart = useCallback(() => {
    setIsPlaying(true);
    setIsGameOver(false);
    setScore(0);
    setLives(3);
    setLevel(1);
    setHasSubmittedScore(false);
    setGameKey(prev => prev + 1);
  }, []);

  // Game over callback
  const handleGameOver = useCallback((finalScore: number) => {
    setScore(finalScore);
    setIsPlaying(false);
    setIsGameOver(true);
  }, []);

  // Score update callback
  const handleScoreUpdate = useCallback((newScore: number) => {
    setScore(newScore);
    setLevel(Math.floor(newScore / 1000) + 1);
  }, []);

  // Submit score to blockchain
  const handleSubmitScore = useCallback(() => {
    if (!LEADERBOARD_CONTRACT_ADDRESS || !address || score === 0) {
      console.warn('Cannot submit score: contract not deployed or no score');
      return;
    }

    writeContract({
      address: LEADERBOARD_CONTRACT_ADDRESS,
      abi: LEADERBOARD_ABI,
      functionName: 'submitScore',
      args: [BigInt(score)],
    });
  }, [address, score, writeContract]);

  return (
    <main className="w-screen h-screen overflow-hidden relative">
      {/* Loading overlay when fetching assets */}
      {isLoadingAssets && (
        <div className="absolute inset-0 z-50 flex items-center justify-center glass">
          <div className="text-center">
            <div className="text-4xl mb-4 animate-spin">💎</div>
            <p className="text-secondary loading-dots">Loading your tokens & NFTs</p>
          </div>
        </div>
      )}

      {/* Game */}
      {isPlaying && !isGameOver && (
        <Game
          key={gameKey}
          walletAssets={walletAssets}
          playerAvatarUrl={avatarUrl}
          onGameOver={handleGameOver}
          onScoreUpdate={handleScoreUpdate}
        />
      )}

      {/* UI overlay */}
      <GameUI
        score={score}
        lives={lives}
        level={level}
        isPlaying={isPlaying}
        isGameOver={isGameOver}
        onStart={handleStart}
        onRestart={handleStart}
        highScores={highScores}
        isSubmittingScore={isSubmittingScore}
        onSubmitScore={handleSubmitScore}
        hasSubmittedScore={hasSubmittedScore}
      />
    </main>
  );
}
