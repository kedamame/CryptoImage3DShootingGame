import type { Metadata, Viewport } from 'next';
import { AppProvider } from '@/components/providers/AppProvider';
import './globals.css';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://crypto-shooting.vercel.app';

const miniAppEmbed = {
  version: '1',
  imageUrl: `${APP_URL}/og-image.svg`,
  button: {
    title: 'Play Now!',
    action: {
      type: 'launch_miniapp',
      name: 'CryptoImageShootingGame',
      url: APP_URL,
      splashImageUrl: `${APP_URL}/splash.svg`,
      splashBackgroundColor: '#1a1a2e',
    },
  },
};

export const metadata: Metadata = {
  title: 'CryptoImageShootingGame',
  description: 'Shoot your wallet tokens and NFTs in this fun 3D shooting game!',
  openGraph: {
    title: 'CryptoImageShootingGame',
    description: 'Shoot your wallet tokens and NFTs in this fun 3D shooting game!',
    type: 'website',
    images: ['/og-image.svg'],
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
  themeColor: '#1a1a2e',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
