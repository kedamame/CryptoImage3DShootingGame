import { createPublicClient, http, formatUnits } from 'viem';
import { base } from 'viem/chains';
import type { WalletAsset } from './game-types';

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

// Popular token addresses on Base
const KNOWN_TOKENS: { address: `0x${string}`; name: string; symbol: string; decimals: number; logo: string }[] = [
  {
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    logo: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
  },
  {
    address: '0x4200000000000000000000000000000000000006',
    name: 'Wrapped Ether',
    symbol: 'WETH',
    decimals: 18,
    logo: 'https://assets.coingecko.com/coins/images/2518/small/weth.png',
  },
  {
    address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
    name: 'Dai Stablecoin',
    symbol: 'DAI',
    decimals: 18,
    logo: 'https://assets.coingecko.com/coins/images/9956/small/Badge_Dai.png',
  },
  {
    address: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
    name: 'Coinbase Wrapped Staked ETH',
    symbol: 'cbETH',
    decimals: 18,
    logo: 'https://assets.coingecko.com/coins/images/27008/small/cbeth.png',
  },
  {
    address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
    name: 'USD Base Coin',
    symbol: 'USDbC',
    decimals: 6,
    logo: 'https://assets.coingecko.com/coins/images/31212/small/USDC.png',
  },
];

// ERC20 ABI for balanceOf
const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// ERC721 ABI for balance and token enumeration
const ERC721_ABI = [
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export async function fetchWalletAssets(address: string): Promise<WalletAsset[]> {
  const assets: WalletAsset[] = [];

  // Add native ETH
  try {
    const ethBalance = await publicClient.getBalance({ address: address as `0x${string}` });
    if (ethBalance > 0n) {
      assets.push({
        id: 'eth-native',
        type: 'token',
        name: 'Ethereum',
        symbol: 'ETH',
        imageUrl: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
        balance: formatUnits(ethBalance, 18),
        contractAddress: '0x0000000000000000000000000000000000000000',
      });
    }
  } catch (e) {
    console.error('Failed to fetch ETH balance:', e);
  }

  // Fetch known token balances
  for (const token of KNOWN_TOKENS) {
    try {
      const balance = await publicClient.readContract({
        address: token.address,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
      });

      if (balance > 0n) {
        assets.push({
          id: `token-${token.address}`,
          type: 'token',
          name: token.name,
          symbol: token.symbol,
          imageUrl: token.logo,
          balance: formatUnits(balance, token.decimals),
          contractAddress: token.address,
        });
      }
    } catch (e) {
      console.error(`Failed to fetch ${token.symbol} balance:`, e);
    }
  }

  return assets;
}

// Generate placeholder assets for demo mode
export function generateDemoAssets(): WalletAsset[] {
  const demoAssets: WalletAsset[] = [
    {
      id: 'demo-eth',
      type: 'token',
      name: 'Ethereum',
      symbol: 'ETH',
      imageUrl: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
      balance: '1.5',
      contractAddress: '0x0000000000000000000000000000000000000000',
    },
    {
      id: 'demo-usdc',
      type: 'token',
      name: 'USD Coin',
      symbol: 'USDC',
      imageUrl: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
      balance: '1000',
      contractAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    },
    {
      id: 'demo-weth',
      type: 'token',
      name: 'Wrapped Ether',
      symbol: 'WETH',
      imageUrl: 'https://assets.coingecko.com/coins/images/2518/small/weth.png',
      balance: '0.5',
      contractAddress: '0x4200000000000000000000000000000000000006',
    },
    {
      id: 'demo-dai',
      type: 'token',
      name: 'Dai',
      symbol: 'DAI',
      imageUrl: 'https://assets.coingecko.com/coins/images/9956/small/Badge_Dai.png',
      balance: '500',
      contractAddress: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
    },
    {
      id: 'demo-base',
      type: 'token',
      name: 'Base',
      symbol: 'BASE',
      imageUrl: 'https://assets.coingecko.com/coins/images/32106/small/Base_Logo.png',
      balance: '100',
      contractAddress: '0x0000000000000000000000000000000000000001',
    },
  ];

  return demoAssets;
}
