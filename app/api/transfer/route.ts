import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { uploadFileToDrive, getMimeType } from '@/lib/drive';
import { FilexaClient } from '@/lib/fileaxa';
import { decryptCredentials } from '@/lib/crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filexaUrl, filename, googleAccessToken, encryptedCredentials } = body;

    if (!filexaUrl || !filename || !googleAccessToken || !encryptedCredentials) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    try {
      // Decrypt FileAxa credentials
      const { email, password } = decryptCredentials(
        encryptedCredentials,
        'FILEAXA_KEY_' + (process.env.NEXT_PUBLIC_SITE_PASSWORD || 'default')
      );

      // Step 1: Resolve FileAxa download URL
      const filexaClient = new FilexaClient();
      const fileInfo = await filexaClient.resolveFileUrl(filexaUrl, email, password);

      if (!fileInfo) {
        return NextResponse.json(
          { error: 'File not found or removed' },
          { status: 404 }
        );
      }

      // Step 2: Stream download from FileAxa
      const downloadResponse = await axios.get(fileInfo.url, {
        responseType: 'stream',
        timeout: 300000, // 5 minutes
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const mimeType = getMimeType(filename);

      // Step 3: Pipe to Google Drive
      const driveResult = await uploadFileToDrive(
        googleAccessToken,
        downloadResponse.data,
        filename,
        mimeType
      );

      return NextResponse.json({
        success: true,
        fileId: driveResult.fileId,
        webViewLink: driveResult.webViewLink,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('credentials')) {
          return NextResponse.json(
            { error: 'Invalid FileAxa credentials' },
            { status: 401 }
          );
        }
        if (error.message.includes('401') || error.message.includes('403')) {
          return NextResponse.json(
            { error: 'Google Drive authentication failed' },
            { status: 401 }
          );
        }
      }
      throw error;
    }
  } catch (error) {
    console.error('Transfer endpoint error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Transfer failed';
    return NextResponse.json(
      { error: `Transfer failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}
