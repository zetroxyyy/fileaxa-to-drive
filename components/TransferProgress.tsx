'use client';

export default function TransferProgress() {
  return (
    <div className="mb-4 p-3 bg-blue-900 text-blue-100 rounded text-sm">
      <div className="flex items-center gap-2">
        <div className="animate-spin">⚙️</div>
        <div>
          <p className="font-medium">Transferring to Drive...</p>
          <p className="text-blue-200 text-xs mt-1">
            Resolving link → Downloading → Uploading
          </p>
        </div>
      </div>
    </div>
  );
}
