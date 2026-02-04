import type { Metadata, Viewport } from 'next';
import { AppProvider } from '@/components/providers/AppProvider';
import './globals.css';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://crypto-shooter.vercel.app';

const miniAppEmbed = {
  version: '1',
  imageUrl: `${APP_URL}/og-image.svg`,
  button: {
    title: 'Play Now!',
    action: {
      type: 'launch_miniapp',
      name: 'CryptoShooter',
      url: APP_URL,
      splashImageUrl: `${APP_URL}/splash.svg`,
      splashBackgroundColor: '#0F0F1A',
    },
  },
};

export const metadata: Metadata = {
  title: 'CryptoShooter - 3D Shooting Game',
  description: 'A 3D shooting game where your wallet assets become enemies! Built for Farcaster Mini Apps.',
  openGraph: {
    title: 'CryptoShooter - 3D Shooting Game',
    description: 'Your wallet assets become enemies in this action-packed 3D shooter!',
    type: 'website',
    images: ['/og-image.svg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CryptoShooter - 3D Shooting Game',
    description: 'Your wallet assets become enemies in this action-packed 3D shooter!',
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
  themeColor: '#0F0F1A',
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="safe-area-inset">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
