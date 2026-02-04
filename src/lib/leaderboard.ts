import { createPublicClient, http, encodeFunctionData, type Address } from 'viem';
import { base } from 'viem/chains';

// Contract ABI (simplified for the functions we need)
const LEADERBOARD_ABI = [
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
] as const;

// Contract address (will be set after deployment)
export const LEADERBOARD_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_LEADERBOARD_CONTRACT as Address | undefined;

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

export interface LeaderboardEntry {
  address: string;
  score: number;
  timestamp: number;
}

// Get top scores from contract
export async function getTopScores(count: number = 20): Promise<LeaderboardEntry[]> {
  if (!LEADERBOARD_CONTRACT_ADDRESS) {
    console.warn('Leaderboard contract not deployed');
    return [];
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
    console.error('Failed to fetch top scores:', error);
    return [];
  }
}

// Get player's best score
export async function getPlayerBestScore(address: Address): Promise<number> {
  if (!LEADERBOARD_CONTRACT_ADDRESS) {
    return 0;
  }

  try {
    const result = await publicClient.readContract({
      address: LEADERBOARD_CONTRACT_ADDRESS,
      abi: LEADERBOARD_ABI,
      functionName: 'playerBestScore',
      args: [address],
    });

    return Number(result);
  } catch (error) {
    console.error('Failed to fetch player best score:', error);
    return 0;
  }
}

// Get player's rank
export async function getPlayerRank(address: Address): Promise<number> {
  if (!LEADERBOARD_CONTRACT_ADDRESS) {
    return 0;
  }

  try {
    const result = await publicClient.readContract({
      address: LEADERBOARD_CONTRACT_ADDRESS,
      abi: LEADERBOARD_ABI,
      functionName: 'getPlayerRank',
      args: [address],
    });

    return Number(result);
  } catch (error) {
    console.error('Failed to fetch player rank:', error);
    return 0;
  }
}

// Encode submit score call data (for wagmi useWriteContract)
export function encodeSubmitScore(score: number) {
  return encodeFunctionData({
    abi: LEADERBOARD_ABI,
    functionName: 'submitScore',
    args: [BigInt(score)],
  });
}

// Export ABI and address for wagmi hooks
export { LEADERBOARD_ABI };
