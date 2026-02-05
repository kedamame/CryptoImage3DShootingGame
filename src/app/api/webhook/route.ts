import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Webhook received:', body);

    // Handle different webhook events from Farcaster
    const { event, data } = body;

    switch (event) {
      case 'miniapp.launched':
        console.log('Mini app launched by:', data?.user?.fid);
        break;
      case 'miniapp.closed':
        console.log('Mini app closed');
        break;
      default:
        console.log('Unknown event:', event);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Webhook endpoint active' });
}
