import { createPublicClient, http, encodeFunctionData, type Address } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { USE_TESTNET } from './wagmi';

// Deployed contract addresses
// Testnet (Base Sepolia) - update after deploying to testnet
export const LEADERBOARD_CONTRACT_ADDRESS_TESTNET = '0x706D7aDC1ff32fEFbe70EF1Df2bA1d5777662E2C' as Address;
// Mainnet (Base) - update after deploying to mainnet
export const LEADERBOARD_CONTRACT_ADDRESS_MAINNET = '0x706D7aDC1ff32fEFbe70EF1Df2bA1d5777662E2C' as Address;

// Use the appropriate address based on network
export const LEADERBOARD_CONTRACT_ADDRESS = USE_TESTNET
  ? LEADERBOARD_CONTRACT_ADDRESS_TESTNET
  : LEADERBOARD_CONTRACT_ADDRESS_MAINNET;

// ABI for the leaderboard contract
export const LEADERBOARD_ABI = [
  {
    inputs: [{ name: 'score', type: 'uint256' }],
    name: 'submitScore',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'count', type: 'uint256' }],
    name: 'getTopScores',
    outputs: [
      {
        components: [
          { name: 'player', type: 'address' },
          { name: 'score', type: 'uint256' },
          { name: 'timestamp', type: 'uint256' },
        ],
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'player', type: 'address' }],
    name: 'playerBestScore',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'player', type: 'address' }],
    name: 'getPlayerRank',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getLeaderboardSize',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const publicClient = createPublicClient({
  chain: USE_TESTNET ? baseSepolia : base,
  transport: http(),
});

export interface LeaderboardEntry {
  address: string;
  score: number;
  timestamp: number;
}

// Local storage fallback for demo/testing
const LOCAL_STORAGE_KEY = 'crypto_shooting_leaderboard';

function getLocalLeaderboard(): LeaderboardEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLocalLeaderboard(entries: LeaderboardEntry[]) {
  if (typeof window === 'undefined') return;
  try {
    // Keep only top 100
    const sorted = entries.sort((a, b) => b.score - a.score).slice(0, 100);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sorted));
  } catch {
    // Ignore storage errors
  }
}

export async function getTopScores(count: number = 10): Promise<LeaderboardEntry[]> {
  // Check if contract is deployed
  if (LEADERBOARD_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
    // Use local storage fallback
    return getLocalLeaderboard().slice(0, count);
  }

  try {
    const result = await publicClient.readContract({
      address: LEADERBOARD_CONTRACT_ADDRESS,
      abi: LEADERBOARD_ABI,
      functionName: 'getTopScores',
      args: [BigInt(count)],
    });

    return result.map((entry) => ({
      address: entry.player,
      score: Number(entry.score),
      timestamp: Number(entry.timestamp),
    }));
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
    return getLocalLeaderboard().slice(0, count);
  }
}

export async function getPlayerBestScore(address: string): Promise<number> {
  if (LEADERBOARD_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
    const local = getLocalLeaderboard();
    const playerEntry = local.find((e) => e.address.toLowerCase() === address.toLowerCase());
    return playerEntry?.score || 0;
  }

  try {
    const result = await publicClient.readContract({
      address: LEADERBOARD_CONTRACT_ADDRESS,
      abi: LEADERBOARD_ABI,
      functionName: 'playerBestScore',
      args: [address as Address],
    });
    return Number(result);
  } catch (error) {
    console.error('Failed to fetch player best score:', error);
    return 0;
  }
}

export async function getPlayerRank(address: string): Promise<number> {
  if (LEADERBOARD_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
    const local = getLocalLeaderboard();
    const index = local.findIndex((e) => e.address.toLowerCase() === address.toLowerCase());
    return index >= 0 ? index + 1 : 0;
  }

  try {
    const result = await publicClient.readContract({
      address: LEADERBOARD_CONTRACT_ADDRESS,
      abi: LEADERBOARD_ABI,
      functionName: 'getPlayerRank',
      args: [address as Address],
    });
    return Number(result);
  } catch (error) {
    console.error('Failed to fetch player rank:', error);
    return 0;
  }
}

// Prepare transaction data for submitting score
export function prepareSubmitScoreTransaction(score: number) {
  return {
    to: LEADERBOARD_CONTRACT_ADDRESS,
    data: encodeFunctionData({
      abi: LEADERBOARD_ABI,
      functionName: 'submitScore',
      args: [BigInt(score)],
    }),
  };
}

// Submit score to local storage (for demo mode)
export function submitScoreLocal(address: string, score: number) {
  const entries = getLocalLeaderboard();

  // Check if player already has a better score
  const existingIndex = entries.findIndex(
    (e) => e.address.toLowerCase() === address.toLowerCase()
  );

  if (existingIndex >= 0) {
    if (entries[existingIndex].score >= score) {
      return; // Don't update if existing score is higher
    }
    entries.splice(existingIndex, 1);
  }

  entries.push({
    address,
    score,
    timestamp: Date.now(),
  });

  saveLocalLeaderboard(entries);
}
