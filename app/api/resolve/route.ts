import { NextRequest, NextResponse } from 'next/server';
import { FilexaClient } from '@/lib/fileaxa';
import { decryptCredentials } from '@/lib/crypto';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

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
      const { username, password } = decryptCredentials(
        encryptedCredentials,
        'FILEAXA_KEY_' + (process.env.NEXT_PUBLIC_SITE_PASSWORD || 'default')
      );

      const client = new FilexaClient();
      const result = await client.resolveFileUrl(filexaUrl, username, password);

      if (!result) {
        return NextResponse.json(
          { error: 'File not found or removed' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        directUrl: result.url,
        filename: result.filename,
      });
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
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to resolve file';
    return NextResponse.json(
      { error: `Failed to resolve file: ${errorMessage}` },
      { status: 500 }
    );
  }
}
