'use client';

import { useState } from 'react';
import TransferProgress from './TransferProgress';

interface Credentials {
  username: string;
  password: string;
}

interface FileCardProps {
  id: string;
  title: string;
  filexaUrl: string;
  addedAt: string;
  filexaCredentials: Credentials | null;
  googleAccessToken: string;
  onTransferComplete?: () => void;
}

interface TransferStatus {
  stage: 'idle' | 'resolving' | 'uploading';
  success: boolean;
  fileId?: string;
  webViewLink?: string;
  error?: string;
}

export default function FileCard({
  id: _id,
  title,
  filexaUrl,
  addedAt,
  filexaCredentials,
  googleAccessToken,
  onTransferComplete,
}: FileCardProps) {
  const [transferring, setTransferring] = useState(false);
  const [status, setStatus] = useState<TransferStatus>({
    stage: 'idle',
    success: false,
  });

  const handleTransfer = async () => {
    if (!filexaCredentials) {
      setStatus({
        stage: 'idle',
        success: false,
        error: 'FileAxa credentials not set',
      });
      return;
    }

    setTransferring(true);
    setStatus({ stage: 'resolving', success: false });

    try {
      // Step 1: Resolve FileAxa URL to get direct download link
      const resolveResponse = await fetch('/api/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filexaUrl,
          username: filexaCredentials.username,
          password: filexaCredentials.password,
        }),
      });

      if (!resolveResponse.ok) {
        const responseText = await resolveResponse.text();
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          throw new Error(responseText || 'Failed to resolve file');
        }
        throw new Error(errorData.error || 'Failed to resolve file');
      }

      const resolveData = await resolveResponse.json();
      const { directUrl, filename } = resolveData;

      // Step 2: Upload to Google Drive
      setStatus({ stage: 'uploading', success: false });

      const driveResponse = await uploadToGoogleDrive(
        directUrl,
        filename,
        googleAccessToken
      );

      setStatus({
        stage: 'uploading',
        success: true,
        fileId: driveResponse.fileId,
        webViewLink: driveResponse.webViewLink,
      });
      onTransferComplete?.();
    } catch (error) {
      setStatus({
        stage: 'idle',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setTransferring(false);
    }
  };

  const uploadToGoogleDrive = async (
    directUrl: string,
    filename: string,
    accessToken: string
  ): Promise<{ fileId: string; webViewLink: string }> => {
    try {
      // Fetch file as blob
      const fileResponse = await fetch(directUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!fileResponse.ok) {
        throw new Error('Failed to download file');
      }

      const blob = await fileResponse.blob();

      // Create multipart form data
      const metadata = {
        name: filename,
        parents: ['root'],
      };

      const form = new FormData();
      form.append(
        'metadata',
        new Blob([JSON.stringify(metadata)], { type: 'application/json' })
      );
      form.append('file', blob);

      // Upload to Google Drive
      const uploadResponse = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: form,
        }
      );

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Upload failed: ${errorText}`);
      }

      const result = await uploadResponse.json();
      return {
        fileId: result.id,
        webViewLink: result.webViewLink,
      };
    } catch (error) {
      console.error('Google Drive upload error:', error);
      throw error;
    }
  };

  const date = new Date(addedAt);
  const formattedDate = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  });

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white mb-2 break-words line-clamp-2">
          {title}
        </h3>
        <p className="text-sm text-gray-400">{formattedDate}</p>
      </div>

      <div className="mb-4">
        <a
          href={filexaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 text-sm truncate block"
          title={filexaUrl}
        >
          View on FileAxa →
        </a>
      </div>

      {transferring && (
        <div className="mb-4 p-3 bg-blue-900 text-blue-100 rounded text-sm">
          <div className="flex items-center gap-2">
            <div className="animate-spin">⚙️</div>
            <div>
              <p className="font-medium">
                {status.stage === 'resolving'
                  ? 'Resolving FileAxa link...'
                  : 'Uploading to Google Drive...'}
              </p>
              <p className="text-blue-200 text-xs mt-1">
                {status.stage === 'resolving'
                  ? 'Getting direct download URL'
                  : 'Uploading file to Drive'}
              </p>
            </div>
          </div>
        </div>
      )}

      {!transferring && status.success && (
        <div className="p-3 rounded mb-4 text-sm bg-green-900 text-green-100">
          <div className="flex items-center justify-between gap-2">
            <span>Done ✓ Sent to Drive</span>
            {status.webViewLink && (
              <a
                href={status.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-300 hover:text-blue-200 underline whitespace-nowrap"
              >
                View
              </a>
            )}
          </div>
        </div>
      )}

      {!transferring && status.error && (
        <div className="p-3 rounded mb-4 text-sm bg-red-900 text-red-100">
          <span>{status.error}</span>
        </div>
      )}

      <button
        onClick={handleTransfer}
        disabled={transferring}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded transition-colors"
      >
        {transferring ? 'Sending to Drive...' : 'Download to Drive'}
      </button>
    </div>
  );
}
