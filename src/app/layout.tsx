import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/components/providers/AppProvider';

const inter = Inter({ subsets: ['latin'], variable: '--font-game' });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://crypto-shooting.vercel.app';

const miniAppEmbed = {
  version: '1',
  imageUrl: `${APP_URL}/og-image.png`,
  button: {
    title: 'Play Now!',
    action: {
      type: 'launch_miniapp',
      name: 'CryptoShooter',
      url: APP_URL,
      splashImageUrl: `${APP_URL}/splash.png`,
      splashBackgroundColor: '#1A1A2E',
    },
  },
};

export const metadata: Metadata = {
  title: 'CryptoImageShootingGame - Shoot Your Tokens!',
  description: 'A fun 2.5D shooting game where your wallet tokens and NFTs become enemies!',
  openGraph: {
    title: 'CryptoImageShootingGame',
    description: 'Shoot your wallet tokens and NFTs in this fun 2.5D game!',
    type: 'website',
    images: ['/og-image.png'],
  },
  other: {
    'fc:miniapp': JSON.stringify(miniAppEmbed),
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1A1A2E',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
