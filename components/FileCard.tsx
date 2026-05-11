'use client';

import { useState } from 'react';
import TransferProgress from './TransferProgress';

interface FileCardProps {
  id: string;
  title: string;
  filexaUrl: string;
  addedAt: string;
  encryptedCredentials: string;
  googleAccessToken: string;
  onTransferComplete?: () => void;
}

export default function FileCard({
  _id,
  title,
  filexaUrl,
  addedAt,
  encryptedCredentials,
  googleAccessToken,
  onTransferComplete,
}: FileCardProps) {
  const [transferring, setTransferring] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    fileId?: string;
    webViewLink?: string;
    error?: string;
  } | null>(null);

  const handleTransfer = async () => {
    setTransferring(true);
    setResult(null);

    try {
      const response = await fetch('/api/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filexaUrl,
          filename: title,
          googleAccessToken,
          encryptedCredentials,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          fileId: data.fileId,
          webViewLink: data.webViewLink,
        });
        onTransferComplete?.();
      } else {
        setResult({
          success: false,
          error: data.error || 'Transfer failed',
        });
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setTransferring(false);
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

      {transferring && <TransferProgress />}

      {result && !transferring && (
        <div
          className={`p-3 rounded mb-4 text-sm ${
            result.success
              ? 'bg-green-900 text-green-100'
              : 'bg-red-900 text-red-100'
          }`}
        >
          {result.success ? (
            <div className="flex items-center justify-between gap-2">
              <span>✓ Uploaded to Drive!</span>
              {result.webViewLink && (
                <a
                  href={result.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-300 hover:text-blue-200 underline whitespace-nowrap"
                >
                  View
                </a>
              )}
            </div>
          ) : (
            <span>{result.error}</span>
          )}
        </div>
      )}

      <button
        onClick={handleTransfer}
        disabled={transferring}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded transition-colors"
      >
        {transferring ? 'Transferring...' : 'Download to Drive'}
      </button>
    </div>
  );
}
