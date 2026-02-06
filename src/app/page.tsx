'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useAccount, useConnect, useDisconnect, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi';
import { baseSepolia, base } from 'wagmi/chains';
import { USE_TESTNET } from '@/lib/wagmi';
import { useFarcaster } from '@/components/FarcasterSDK';
import { useGameStore } from '@/lib/game-engine';
import { GameUI, StartScreen, LeaderboardUI } from '@/components/game/GameUI';
import { fetchQuickAssets, fetchAllTokens, generateDemoAssets } from '@/lib/wallet-assets';
import type { WalletAsset } from '@/lib/game-types';
import {
  getTopScores,
  submitScoreLocal,
  prepareSubmitScoreTransaction,
  LEADERBOARD_CONTRACT_ADDRESS,
  type LeaderboardEntry,
} from '@/lib/leaderboard';

// Dynamic import for 3D component (no SSR)
const Game3D = dynamic(() => import('@/components/game/Game3D'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-pop-dark">
      <div className="text-pop-yellow loading-pulse font-game">Loading 3D...</div>
    </div>
  ),
});

// Dynamic import for texture preloading
const preloadTextures = async (imageUrls: string[]): Promise<void> => {
  const { preloadTextures: preload } = await import('@/components/game/Game3D');
  return preload(imageUrls);
};

export default function Home() {
  const { isInMiniApp, isLoading: farcasterLoading, user, provider } = useFarcaster();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();

  const {
    isPlaying,
    isGameOver,
    score,
    startGame,
    setWalletAssets,
    setPlayerAvatar,
  } = useGameStore();

  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [isPreloadingImages, setIsPreloadingImages] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState('');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardScores, setLeaderboardScores] = useState<LeaderboardEntry[]>([]);
  const [hasSubmittedScore, setHasSubmittedScore] = useState(false);
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  const isSubmittingRef = useRef(false); // Prevent duplicate tx submissions

  // Contract write for on-chain score submission
  const { writeContract, data: txHash } = useWriteContract();
  const { isLoading: isTxPending, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Quick load: Get NFTs and known tokens fast for immediate game start
  const loadQuickAssets = useCallback(async (): Promise<WalletAsset[]> => {
    setIsLoadingAssets(true);
    setLoadingProgress('Loading assets...');
    let assets: WalletAsset[] = [];
    try {
      if (address) {
        assets = await fetchQuickAssets(address);
        if (assets.length === 0) {
          assets = generateDemoAssets();
        }
      } else {
        assets = generateDemoAssets();
      }
      setWalletAssets(assets);
    } catch (error) {
      console.error('Failed to quick load assets:', error);
      assets = generateDemoAssets();
      setWalletAssets(assets);
    } finally {
      setIsLoadingAssets(false);
    }
    return assets;
  }, [address, setWalletAssets]);

  // Background load: Fetch additional tokens via Alchemy API
  const loadMoreAssetsInBackground = useCallback(async () => {
    if (!address) return;
    try {
      console.log('Background: Loading more tokens...');
      const moreTokens = await fetchAllTokens(address);
      if (moreTokens.length > 0) {
        // Merge with existing assets, avoiding duplicates
        const currentAssets = useGameStore.getState().walletAssets;
        const existingIds = new Set(currentAssets.map(a => a.id));
        const newAssets = moreTokens.filter(a => !existingIds.has(a.id));
        if (newAssets.length > 0) {
          console.log(`Background: Adding ${newAssets.length} new tokens`);
          setWalletAssets([...currentAssets, ...newAssets]);
        }
      }
    } catch (error) {
      console.error('Background asset loading failed:', error);
    }
  }, [address, setWalletAssets]);

  // Set player avatar from Farcaster
  useEffect(() => {
    if (user?.pfpUrl) {
      setPlayerAvatar(user.pfpUrl);
    }
  }, [user, setPlayerAvatar]);

  // Load leaderboard
  useEffect(() => {
    const loadLeaderboard = async () => {
      const scores = await getTopScores(20);
      setLeaderboardScores(scores);
    };
    loadLeaderboard();
  }, [isGameOver, isTxSuccess]);

  // Handle game over - save score locally (automatic)
  useEffect(() => {
    if (isGameOver && score > 0 && !hasSubmittedScore) {
      setHasSubmittedScore(true);
      // Submit to local storage only (always works, no tx required)
      const playerAddress = address || `demo-${Date.now()}`;
      submitScoreLocal(playerAddress, score);
    }
  }, [isGameOver, score, hasSubmittedScore, address]);

  // Manual on-chain score submission (user triggered)
  const handleSubmitOnChain = async () => {
    if (isSubmittingRef.current) return;
    if (!isConnected || !address) return;
    if (LEADERBOARD_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') return;

    isSubmittingRef.current = true;

    try {
      // Auto-switch to the correct chain before sending transaction
      const targetChainId = USE_TESTNET ? baseSepolia.id : base.id;
      await switchChainAsync({ chainId: targetChainId });
    } catch (error) {
      console.warn('Failed to switch chain:', error);
    }

    writeContract({
      address: LEADERBOARD_CONTRACT_ADDRESS,
      abi: [
        {
          inputs: [{ name: 'score', type: 'uint256' }],
          name: 'submitScore',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
      ],
      functionName: 'submitScore',
      args: [BigInt(score)],
    });
  };

  // Reset submitted flag when starting new game
  useEffect(() => {
    if (isPlaying) {
      setHasSubmittedScore(false);
      isSubmittingRef.current = false; // Reset ref for new game
      setShowLeaderboard(false);
    }
  }, [isPlaying]);

  // Handle wallet connection
  const handleConnect = async () => {
    if (isInMiniApp) {
      // In Mini App, try to connect with injected (Farcaster wallet)
      const injectedConnector = connectors.find((c) => c.id === 'injected');
      if (injectedConnector) {
        connect({ connector: injectedConnector });
      }
    } else {
      // Show wallet options for web
      setShowWalletOptions(true);
    }
  };

  // Connect to specific wallet
  const connectToWallet = (connectorId: string) => {
    const connector = connectors.find((c) => c.id === connectorId);
    if (connector) {
      connect({ connector });
      setShowWalletOptions(false);
    }
  };

  // Get wallet display name
  const getWalletName = (id: string) => {
    switch (id) {
      case 'injected': return 'Browser Wallet';
      case 'coinbaseWalletSDK': return 'Coinbase Wallet';
      case 'metaMaskSDK': return 'MetaMask';
      case 'walletConnect': return 'WalletConnect';
      default: return id;
    }
  };

  // Handle game start with fast loading and background preloading
  const handleStartGame = async () => {
    setIsPreloadingImages(true);
    setLoadingProgress('Loading assets...');

    try {
      // Quick load: Get NFTs and known tokens (fast)
      const assets = await loadQuickAssets();

      // Preload only the first 10 images to start quickly
      setLoadingProgress('Loading images...');
      const imageUrls = assets
        .slice(0, 10) // Only preload first 10 for quick start
        .map(asset => asset.imageUrl)
        .filter(url => url && url.length > 0);

      if (imageUrls.length > 0) {
        await preloadTextures(imageUrls);
      }

      setLoadingProgress('Starting...');
      startGame();

      // Background: Load more tokens and preload remaining images
      setTimeout(() => {
        // Load more assets in background
        loadMoreAssetsInBackground();

        // Preload remaining images in background
        const remainingUrls = assets
          .slice(10)
          .map(asset => asset.imageUrl)
          .filter(url => url && url.length > 0);
        if (remainingUrls.length > 0) {
          preloadTextures(remainingUrls);
        }
      }, 1000);

    } catch (error) {
      console.error('Failed to start game:', error);
      startGame(); // Start anyway with fallback
    } finally {
      setIsPreloadingImages(false);
      setLoadingProgress('');
    }
  };

  const isLoading = farcasterLoading || isLoadingAssets || isPreloadingImages;

  return (
    <main className="w-screen h-screen overflow-hidden relative">
      {/* 3D Game Canvas */}
      <Game3D />

      {/* Game UI Overlay */}
      <GameUI />

      {/* Start Screen */}
      {!isPlaying && !isGameOver && (
        <StartScreen
          onStart={handleStartGame}
          isConnected={isConnected}
          onConnect={handleConnect}
          isLoading={isLoading}
        />
      )}

      {/* Image Loading Overlay */}
      {isPreloadingImages && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-50">
          <div className="text-pop-yellow text-xl mb-4 font-game">Loading Game</div>
          <div className="w-64 h-2 bg-pop-dark rounded-full overflow-hidden mb-4">
            <div className="h-full bg-pop-yellow animate-pulse" style={{ width: '100%' }} />
          </div>
          <div className="text-white/70 text-sm">{loadingProgress}</div>
        </div>
      )}

      {/* Game Over Screen */}
      {isGameOver && !showLeaderboard && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center pointer-events-auto z-40">
          <div className="game-panel p-8 text-center max-w-sm mx-4">
            <h2 className="text-pop-red text-2xl mb-2 font-game">GAME OVER</h2>
            <div className="text-pop-yellow text-4xl mb-6 font-game">
              {score.toLocaleString()}
            </div>

            {/* Score submission status */}
            <div className="mb-6 text-sm">
              {isTxPending && (
                <div className="flex items-center justify-center gap-2 text-pop-yellow">
                  <div className="w-4 h-4 border-2 border-pop-yellow border-t-transparent rounded-full animate-spin" />
                  Submitting score on-chain...
                </div>
              )}
              {isTxSuccess && (
                <div className="text-pop-green flex items-center justify-center gap-2">
                  Score recorded on-chain!
                </div>
              )}
              {!isTxPending && !isTxSuccess && (
                <div className="text-white/50">
                  Score saved locally
                </div>
              )}
            </div>

            <div className="space-y-3">
              {/* On-chain submission button - only show if connected and not already submitted */}
              {isConnected && !isTxPending && !isTxSuccess && LEADERBOARD_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000' && (
                <button
                  onClick={handleSubmitOnChain}
                  className="btn-pop w-full bg-gradient-to-b from-pop-green to-emerald-600"
                >
                  RECORD ON BLOCKCHAIN
                </button>
              )}
              <button
                onClick={() => setShowLeaderboard(true)}
                className="btn-pop w-full"
              >
                VIEW LEADERBOARD
              </button>
              <button
                onClick={() => {
                  setHasSubmittedScore(false);
                  isSubmittingRef.current = false;
                  handleStartGame();
                }}
                className="btn-pop w-full bg-gradient-to-b from-pop-cyan to-pop-blue"
              >
                PLAY AGAIN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <LeaderboardUI
        scores={leaderboardScores}
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        currentScore={isGameOver ? score : undefined}
      />

      {/* Wallet Selection Modal */}
      {showWalletOptions && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center pointer-events-auto z-50">
          <div className="game-panel p-6 max-w-sm w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-pop-yellow text-xl">Connect Wallet</h2>
              <button
                onClick={() => setShowWalletOptions(false)}
                className="text-white/70 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-3">
              {connectors.map((connector) => (
                <button
                  key={connector.id}
                  onClick={() => connectToWallet(connector.id)}
                  className="w-full p-4 bg-pop-dark/80 hover:bg-pop-gray/50 rounded-lg text-white text-left flex items-center gap-3 transition-colors"
                >
                  <div className="w-8 h-8 bg-pop-blue rounded-lg flex items-center justify-center text-lg">
                    {connector.id === 'coinbaseWalletSDK' && '🔵'}
                    {connector.id === 'metaMaskSDK' && '🦊'}
                    {connector.id === 'walletConnect' && '🔗'}
                    {connector.id === 'injected' && '💼'}
                  </div>
                  <span>{getWalletName(connector.id)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Transaction pending indicator */}
      {isTxPending && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 game-panel text-pop-yellow text-xs">
          Submitting score on-chain...
        </div>
      )}

      {/* Leaderboard button (when playing) */}
      {isPlaying && !showLeaderboard && (
        <button
          onClick={() => setShowLeaderboard(true)}
          className="absolute bottom-20 right-4 game-panel px-3 py-2 text-white text-xs pointer-events-auto"
        >
          🏆
        </button>
      )}

      {/* Connection status */}
      {isConnected && !isPlaying && (
        <div className="absolute top-4 right-4 game-panel text-xs">
          <div className="text-pop-green mb-1">Connected</div>
          <div className="text-white/70 truncate max-w-[100px]">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </div>
          <button
            onClick={() => disconnect()}
            className="text-pop-red text-xs mt-2 hover:underline"
          >
            Disconnect
          </button>
        </div>
      )}

      {/* Farcaster user info */}
      {user && !isPlaying && (
        <div className="absolute top-4 left-4 game-panel text-xs flex items-center gap-2">
          {user.pfpUrl && (
            <img
              src={user.pfpUrl}
              alt=""
              className="w-8 h-8 rounded-full"
            />
          )}
          <div>
            <div className="text-white">{user.displayName || user.username}</div>
            <div className="text-white/50">@{user.username}</div>
          </div>
        </div>
      )}
    </main>
  );
}
