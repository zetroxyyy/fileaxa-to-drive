import { NextRequest, NextResponse } from 'next/server';
import { FilexaClient } from '@/lib/fileaxa';

export const dynamic = 'force-dynamic';
export const maxDuration = 90;

export async function POST(request: NextRequest) {
  console.log('=== RESOLVE START ===');
  
  try {
    const body = await request.json();
    const { filexaUrl, username, password } = body;

    console.log('filexaUrl:', filexaUrl);
    console.log('username:', username);
    console.log('password:', password ? '[REDACTED]' : 'missing');

    if (!filexaUrl || !username || !password) {
      console.log('Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: filexaUrl, username, password' },
        { status: 400 }
      );
    }

    console.log('Attempting FileAxa login...');
    const client = new FilexaClient();
    const result = await client.resolveFileUrl(filexaUrl, username, password);

    console.log('Login result:', result ? 'success' : 'failed');

    if (!result) {
      console.log('Could not resolve download URL - timeout or FileAza error');
      return NextResponse.json(
        { error: 'Could not resolve download URL. FileAza may be slow or require login.' },
        { status: 500 }
      );
    }

    console.log('Resolve result:', { url: result.url.substring(0, 50) + '...', filename: result.filename });
    console.log('=== RESOLVE SUCCESS ===');
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('=== RESOLVE ERROR ===');
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
