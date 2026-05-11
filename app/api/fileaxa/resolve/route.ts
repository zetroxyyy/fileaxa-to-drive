import { NextRequest, NextResponse } from 'next/server';
import { FilexaClient } from '@/lib/fileaxa';
import { decryptCredentials } from '@/lib/crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filexaUrl, encryptedCredentials } = body;

    if (!filexaUrl || !encryptedCredentials) {
      return NextResponse.json(
        { error: 'Missing filexaUrl or credentials' },
        { status: 400 }
      );
    }

    try {
      const { email, password } = decryptCredentials(
        encryptedCredentials,
        'FILEAXA_KEY_' + (process.env.NEXT_PUBLIC_SITE_PASSWORD || 'default')
      );

      const client = new FilexaClient();
      const result = await client.resolveFileUrl(filexaUrl, email, password);

      if (!result) {
        return NextResponse.json(
          { error: 'File not found or removed' },
          { status: 404 }
        );
      }

      return NextResponse.json(result);
    } catch (error) {
      if (error instanceof Error && error.message.includes('credentials')) {
        return NextResponse.json(
          { error: 'Invalid FileAxa credentials' },
          { status: 401 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Resolve endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to resolve file URL' },
      { status: 500 }
    );
  }
}
