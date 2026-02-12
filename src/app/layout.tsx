import type { Metadata, Viewport } from 'next';
import { AppProvider } from '@/components/providers/AppProvider';
import './globals.css';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://crypto-image3-d-shooting-game.vercel.app';

const miniAppEmbed = {
  version: '1',
  imageUrl: `${APP_URL}/og-image.png`,
  button: {
    title: 'Play Now!',
    action: {
      type: 'launch_frame',
      name: 'Crypto Shooting Game',
      url: APP_URL,
      splashImageUrl: `${APP_URL}/splash.png`,
      splashBackgroundColor: '#1a1a2e',
    },
  },
};

export const metadata: Metadata = {
  title: 'Crypto Shooting Game',
  description: 'Shoot your wallet tokens and NFTs in this fun shooting game!',
  openGraph: {
    title: 'Crypto Shooting Game',
    description: 'Shoot your wallet tokens and NFTs in this fun shooting game!',
    type: 'website',
    images: ['/og-image.png'],
  },
  other: {
    'fc:miniapp': JSON.stringify(miniAppEmbed),
    'base:app_id': '698d7eddb3590846b3839905',
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
