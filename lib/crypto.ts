// Client-safe encryption utilities (no Node.js dependencies)

export function encryptCredentials(
  username: string,
  password: string,
  key: string
): string {
  const json = JSON.stringify({ username, password });
  const buf = Array.from(json).map(c => c.charCodeAt(0));
  const encrypted = buf.map((b, i) => b ^ key.charCodeAt(i % key.length));
  return btoa(String.fromCharCode(...encrypted));
}

export function decryptCredentials(
  encrypted: string,
  key: string
): { username: string; password: string } {
  try {
    const buf = Array.from(atob(encrypted)).map(c => c.charCodeAt(0));
    const decrypted = buf.map((b, i) => b ^ key.charCodeAt(i % key.length));
    const json = String.fromCharCode(...decrypted);
    return JSON.parse(json);
  } catch {
    throw new Error('Failed to decrypt credentials');
  }
}