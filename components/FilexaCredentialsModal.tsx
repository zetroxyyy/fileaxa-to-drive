'use client';

import { useState } from 'react';
import { encryptCredentials } from '@/lib/crypto';

interface FilexaCredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (encrypted: string) => void;
  sitePassword: string;
}

export default function FilexaCredentialsModal({
  isOpen,
  onClose,
  onSave,
  sitePassword,
}: FilexaCredentialsModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    try {
      const encrypted = encryptCredentials(
        username,
        password,
        'FILEAXA_KEY_' + sitePassword
      );
      onSave(encrypted);
      setUsername('');
      setPassword('');
      setError('');
      onClose();
    } catch (err) {
      setError('Failed to save credentials');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-4">
          FileAxa Credentials
        </h2>

        <div className="mb-4">
          <label className="block text-sm text-gray-300 mb-2">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="your_username"
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm text-gray-300 mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500"
          />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900 text-red-100 rounded text-sm">
            {error}
          </div>
        )}

        <div className="text-sm text-gray-400 mb-6 p-3 bg-gray-700 rounded">
          ✓ Credentials are encrypted locally. Never stored on server.
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
