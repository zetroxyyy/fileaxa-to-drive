'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import FileCard from '@/components/FileCard';
import FilexaCredentialsModal from '@/components/FilexaCredentialsModal';

interface Link {
  id: string;
  title: string;
  filexaUrl: string;
  addedAt: string;
}

const SITE_PASSWORD = process.env.NEXT_PUBLIC_SITE_PASSWORD || 'change_me_123';

export default function Home() {
  const { data: session, status } = useSession();

  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [addingLink, setAddingLink] = useState(false);
  const [credentialsModal, setCredentialsModal] = useState(false);
  const [encryptedCredentials, setEncryptedCredentials] = useState('');
  const [linkError, setLinkError] = useState('');

  // Check password on mount
  useEffect(() => {
    const savedAuth = localStorage.getItem('siteAuth');
    if (savedAuth) {
      setAuthenticated(true);
    }
    setLoading(false);
  }, []);

  // Load links
  useEffect(() => {
    if (authenticated) {
      fetchLinks();
    }
  }, [authenticated]);

  // Check for credentials
  useEffect(() => {
    if (authenticated) {
      const saved = localStorage.getItem('filexaCredentials');
      if (saved) {
        setEncryptedCredentials(saved);
      }
    }
  }, [authenticated]);

  const fetchLinks = async () => {
    try {
      const response = await fetch('/api/links');
      const data = await response.json();
      setLinks(data);
    } catch (error) {
      console.error('Failed to fetch links:', error);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === SITE_PASSWORD) {
      localStorage.setItem('siteAuth', 'true');
      setAuthenticated(true);
      setPassword('');
      setPasswordError('');
    } else {
      setPasswordError('Incorrect password');
      setPassword('');
    }
  };

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLinkTitle || !newLinkUrl) {
      setLinkError('Please fill in all fields');
      return;
    }

    setAddingLink(true);
    try {
      const response = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newLinkTitle,
          filexaUrl: newLinkUrl,
        }),
      });

      if (response.ok) {
        const newLink = await response.json();
        setLinks([...links, newLink]);
        setNewLinkTitle('');
        setNewLinkUrl('');
        setLinkError('');
      } else {
        setLinkError('Failed to add link');
      }
    } catch (error) {
      setLinkError('Error adding link');
    } finally {
      setAddingLink(false);
    }
  };

  const handleSaveCredentials = (encrypted: string) => {
    localStorage.setItem('filexaCredentials', encrypted);
    setEncryptedCredentials(encrypted);
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg p-8 max-w-sm w-full border border-gray-700">
          <h1 className="text-3xl font-bold text-white mb-2">My File Vault</h1>
          <p className="text-gray-400 mb-6">Private file transfer tool</p>

          <form onSubmit={handlePasswordSubmit}>
            <div className="mb-4">
              <label className="block text-sm text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                autoFocus
              />
            </div>

            {passwordError && (
              <div className="mb-4 p-3 bg-red-900 text-red-100 rounded text-sm">
                {passwordError}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Unlock
            </button>
          </form>

          <p className="text-xs text-gray-500 mt-6 text-center">
            Change SITE_PASSWORD in .env.local for security
          </p>
        </div>
      </div>
    );
  }

  const hasCredentials = !!encryptedCredentials;
  const isGoogleConnected = status === 'authenticated' && session?.user?.accessToken;

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-white">My File Vault</h1>
              <p className="text-sm text-gray-400">
                FileAxa → Google Drive transfer
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap justify-end">
              {/* FileAxa Status */}
              <button
                onClick={() => setCredentialsModal(true)}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  hasCredentials
                    ? 'bg-green-900 text-green-100 hover:bg-green-800'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {hasCredentials ? '✓ FileAxa' : 'FileAxa Login'}
              </button>

              {/* Google Drive Status */}
              {isGoogleConnected ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-900 text-green-100 rounded text-sm">
                  <img
                    src={session?.user?.image || ''}
                    alt="Avatar"
                    className="w-6 h-6 rounded-full"
                  />
                  <span>{session?.user?.email}</span>
                  <button
                    onClick={() => signOut()}
                    className="text-xs ml-2 hover:text-red-200"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => signIn('google')}
                  className="px-4 py-2 rounded text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                >
                  Connect Drive
                </button>
              )}

              {/* Logout */}
              <button
                onClick={() => {
                  localStorage.removeItem('siteAuth');
                  setAuthenticated(false);
                }}
                className="px-4 py-2 rounded text-sm font-medium bg-red-900 hover:bg-red-800 text-red-100 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Add Link Form */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Add New Link</h2>
          <form onSubmit={handleAddLink} className="flex gap-4 flex-wrap">
            <input
              type="text"
              placeholder="File title"
              value={newLinkTitle}
              onChange={(e) => setNewLinkTitle(e.target.value)}
              className="flex-1 min-w-[200px] bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white placeholder-gray-500"
            />
            <input
              type="url"
              placeholder="FileAxa URL"
              value={newLinkUrl}
              onChange={(e) => setNewLinkUrl(e.target.value)}
              className="flex-1 min-w-[200px] bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white placeholder-gray-500"
            />
            <button
              type="submit"
              disabled={addingLink}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-medium rounded transition-colors whitespace-nowrap"
            >
              {addingLink ? 'Adding...' : 'Add Link'}
            </button>
          </form>
          {linkError && (
            <div className="mt-3 p-3 bg-red-900 text-red-100 rounded text-sm">
              {linkError}
            </div>
          )}
        </div>

        {/* Status Checks */}
        {(!hasCredentials || !isGoogleConnected) && (
          <div className="mb-8 p-4 bg-yellow-900 text-yellow-100 rounded-lg border border-yellow-700">
            <p className="font-medium mb-2">Setup Required:</p>
            <ul className="text-sm space-y-1">
              {!hasCredentials && <li>• Enter your FileAxa credentials</li>}
              {!isGoogleConnected && <li>• Connect your Google Drive account</li>}
            </ul>
          </div>
        )}

        {/* Files Grid */}
        {links.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No links yet</p>
            <p className="text-gray-500 text-sm mt-2">
              Add a FileAxa link above to get started
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {links.map((link) => (
              <FileCard
                key={link.id}
                id={link.id}
                title={link.title}
                filexaUrl={link.filexaUrl}
                addedAt={link.addedAt}
                encryptedCredentials={encryptedCredentials}
                googleAccessToken={session?.user?.accessToken || ''}
                onTransferComplete={fetchLinks}
              />
            ))}
          </div>
        )}
      </main>

      {/* FileAxa Credentials Modal */}
      <FilexaCredentialsModal
        isOpen={credentialsModal}
        onClose={() => setCredentialsModal(false)}
        onSave={handleSaveCredentials}
        sitePassword={SITE_PASSWORD}
      />
    </div>
  );
}
