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

export default function Home() {
  const { data: session, status } = useSession();

  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [links, setLinks] = useState<Link[]>([]);
  const [_loading, setLoading] = useState(true);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [credentialsModal, setCredentialsModal] = useState(false);
  const [filexaCredentials, setFilexaCredentials] = useState<{
    username: string;
    password: string;
  } | null>(null);
  const [linkError, setLinkError] = useState('');

  // Check password on mount
  useEffect(() => {
    const savedAuth = localStorage.getItem('siteAuth');
    if (savedAuth) {
      setAuthenticated(true);
    }
    setLoading(false);
  }, []);

  // Load links from localStorage
  useEffect(() => {
    if (authenticated) {
      try {
        const saved = localStorage.getItem('fileaxa_links');
        if (saved) {
          const parsed = JSON.parse(saved);
          // Deduplicate by filexaUrl
          const unique = parsed.filter(
            (link: Link, index: number, self: Link[]) =>
              index === self.findIndex((l) => l.filexaUrl === link.filexaUrl)
          );
          setLinks(unique);
          // Save deduped list back
          if (unique.length < parsed.length) {
            localStorage.setItem('fileaxa_links', JSON.stringify(unique));
          }
        }
      } catch (error) {
        console.error('Failed to load links:', error);
      }
    }
  }, [authenticated]);

  // Check for credentials
  useEffect(() => {
    if (authenticated) {
      const saved = localStorage.getItem('filexaCredentials');
      if (saved) {
        try {
          setFilexaCredentials(JSON.parse(saved));
        } catch (error) {
          console.error('Failed to parse credentials:', error);
        }
      }
    }
  }, [authenticated]);

  const checkPassword = (input: string) => {
    const correctPassword = process.env.NEXT_PUBLIC_SITE_PASSWORD || 'admin';
    return input === correctPassword;
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (checkPassword(password)) {
      localStorage.setItem('siteAuth', 'true');
      setAuthenticated(true);
      setPassword('');
      setPasswordError('');
    } else {
      setPasswordError('Incorrect password');
      setPassword('');
    }
  };

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLinkTitle || !newLinkUrl) {
      setLinkError('Please fill in all fields');
      return;
    }

    try {
      const newLink: Link = {
        id: Date.now().toString(),
        title: newLinkTitle,
        filexaUrl: newLinkUrl,
        addedAt: new Date().toISOString(),
      };

      const updatedLinks = [...links, newLink];
      setLinks(updatedLinks);
      localStorage.setItem('fileaxa_links', JSON.stringify(updatedLinks));
      setNewLinkTitle('');
      setNewLinkUrl('');
      setLinkError('');
    } catch (error) {
      setLinkError('Error adding link');
    }
  };

  const handleSaveCredentials = (creds: { username: string; password: string }) => {
    localStorage.setItem('filexaCredentials', JSON.stringify(creds));
    setFilexaCredentials(creds);
  };

  const handleTransferComplete = () => {
    // Links are stored in localStorage, no need to refresh from API
    // This callback is just for UI updates if needed
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
            Change NEXT_PUBLIC_SITE_PASSWORD in Railway variables
          </p>
        </div>
      </div>
    );
  }

  const hasCredentials = !!filexaCredentials;
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
              className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-medium rounded transition-colors whitespace-nowrap\"
            >
              Add Link
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
                filexaCredentials={filexaCredentials}
                googleAccessToken={session?.user?.accessToken || ''}
                onTransferComplete={handleTransferComplete}
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
        sitePassword={process.env.NEXT_PUBLIC_SITE_PASSWORD || ''}
      />
    </div>
  );
}
