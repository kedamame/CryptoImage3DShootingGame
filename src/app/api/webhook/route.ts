import { NextRequest, NextResponse } from 'next/server';

// Webhook endpoint for Farcaster Mini App events
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Log the webhook event for debugging
    console.log('Webhook received:', JSON.stringify(body, null, 2));

    // Handle different event types
    const { event, data } = body;

    switch (event) {
      case 'miniapp.opened':
        console.log('Mini App opened by user:', data?.fid);
        break;

      case 'miniapp.closed':
        console.log('Mini App closed by user:', data?.fid);
        break;

      case 'frame.added':
        console.log('Frame added:', data);
        break;

      case 'frame.removed':
        console.log('Frame removed:', data);
        break;

      case 'notifications.enabled':
        console.log('Notifications enabled for user:', data?.fid);
        break;

      case 'notifications.disabled':
        console.log('Notifications disabled for user:', data?.fid);
        break;

      default:
        console.log('Unknown event type:', event);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'CryptoShooter Webhook' });
}
