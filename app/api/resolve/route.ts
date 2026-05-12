import { NextRequest, NextResponse } from 'next/server';
import { FilexaClient } from '@/lib/fileaxa';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filexaUrl, username, password } = body;

    console.log('Resolve API received:', { filexaUrl, hasUsername: !!username, hasPassword: !!password });

    if (!filexaUrl || !username || !password) {
      return NextResponse.json(
        { error: 'Missing required fields: filexaUrl, username, password' },
        { status: 400 }
      );
    }

    const client = new FilexaClient();
    const result = await client.resolveFileUrl(filexaUrl, username, password);

    if (!result) {
      return NextResponse.json(
        { error: 'Could not resolve download URL' },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Resolve error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
