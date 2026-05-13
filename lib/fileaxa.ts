import * as cheerio from 'cheerio';

export class FilexaClient {
  private cookies: Record<string, string> = {};

  private getCookieString(): string {
    return Object.entries(this.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  private parseCookies(setCookieHeader: string | null): void {
    if (!setCookieHeader) return;
    setCookieHeader.split(',').forEach((cookie) => {
      const parts = cookie.split(';')[0].trim();
      const eqIndex = parts.indexOf('=');
      if (eqIndex > 0) {
        const key = parts.substring(0, eqIndex).trim();
        const value = parts.substring(eqIndex + 1).trim();
        if (key) this.cookies[key] = value;
      }
    });
  }

  async getCsrfToken(signal?: AbortSignal): Promise<string> {
    const startTime = Date.now();
    try {
      console.log(`[getCsrfToken] Fetching login page...`);
      const res = await fetch('https://fileaxa.com/login', {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept':
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal,
      });
      console.log(`[getCsrfToken] Fetch completed in ${Date.now() - startTime}ms`);
      
      // Parse ALL set-cookie headers
      const rawHeaders = res.headers.getSetCookie?.() || [];
      rawHeaders.forEach((c: string) => this.parseCookies(c));
      // Also try single header
      this.parseCookies(res.headers.get('set-cookie'));

      const html = await res.text();
      console.log(`[getCsrfToken] HTML parsed in ${Date.now() - startTime}ms (${html.length} bytes)`);
      
      const $ = cheerio.load(html);
      const token =
        $('input[name="_token"]').attr('value') ||
        $('meta[name="csrf-token"]').attr('content') ||
        '';
      console.log(`[getCsrfToken] Completed in ${Date.now() - startTime}ms, token: ${token ? 'found' : 'not found'}`);
      return token;
    } catch (e: any) {
      console.error(`[getCsrfToken] Error after ${Date.now() - startTime}ms:`, e.message);
      return '';
    }
  }

  async login(username: string, password: string, signal?: AbortSignal): Promise<boolean> {
    const startTime = Date.now();
    console.log(`[login] Starting CSRF token fetch...`);
    const token = await this.getCsrfToken(signal);
    console.log(`[login] CSRF took ${Date.now() - startTime}ms, token: ${token ? 'found' : 'not found'}`);
    try {
      const body = new URLSearchParams();
      body.append('username', username);
      body.append('password', password);
      body.append('remember', '1');
      if (token) body.append('_token', token);

      console.log(`[login] Starting login POST at ${Date.now() - startTime}ms...`);

      const res = await fetch('https://fileaxa.com/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept':
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://fileaxa.com/login',
          'Origin': 'https://fileaxa.com',
          'Cookie': this.getCookieString(),
        },
        body,
        redirect: 'manual',
        signal,
      });

      const rawHeaders = res.headers.getSetCookie?.() || [];
      rawHeaders.forEach((c: string) => this.parseCookies(c));
      this.parseCookies(res.headers.get('set-cookie'));

      console.log(`[login] POST completed in ${Date.now() - startTime}ms, status: ${res.status}`);
      console.log('Cookies after login:', this.getCookieString());

      const hasCookies = Object.keys(this.cookies).length > 0;
      return res.status === 302 || res.status === 200 || hasCookies;
    } catch (e: any) {
      console.error(`[login] Error after ${Date.now() - startTime}ms:`, e.message);
      return false;
    }
  }

  async getDirectDownloadUrl(
    filePageUrl: string,
    signal?: AbortSignal
  ): Promise<{ url: string; filename: string } | null> {
    const startTime = Date.now();
    try {
      console.log('Fetching file page with cookies:', this.getCookieString());
      const res = await fetch(filePageUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept':
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Referer': 'https://fileaxa.com',
          'Cookie': this.getCookieString(),
        },
        signal,
      });

      const html = await res.text();
      console.log('File page HTML length:', html.length);

      const $ = cheerio.load(html);
      let downloadUrl = '';
      let filename = '';

      filename =
        $('meta[property="og:title"]').attr('content') ||
        $('h1').first().text().trim() ||
        $('title').text().trim() ||
        'download';

      // Try multiple selectors for download link
      const selectors = [
        'a[href*="/download/"]',
        'a[href*="download"]',
        'a[download]',
        'a.btn-success',
        'a.btn-primary',
        'a.download-btn',
        'a.btn[href*="fileaxa"]',
        '.download-link a',
        '#download-link',
      ];

      for (const sel of selectors) {
        const el = $(sel).first();
        if (el.length) {
          downloadUrl = el.attr('href') || '';
          if (downloadUrl) {
            console.log('Found download URL with selector:', sel, downloadUrl);
            break;
          }
        }
      }

      // Search all links
      if (!downloadUrl) {
        $('a').each((_: number, el: any): void => {
          const href = $(el).attr('href') || '';
          if (href && (href.includes('/download') || href.includes('/dl/'))) {
            downloadUrl = href;
          }
        });
      }

      // Log page for debugging
      if (!downloadUrl) {
        console.log('No download URL found. Page excerpt:', html.substring(0, 2000));
      }

      if (!downloadUrl) return null;

      if (!downloadUrl.startsWith('http')) {
        downloadUrl = new URL(downloadUrl, 'https://fileaxa.com').toString();
      }

      filename = filename
        .replace(/[^a-z0-9._\-\s]/gi, '_')
        .trim()
        .substring(0, 100);
      console.log(`getDirectDownloadUrl completed in ${Date.now() - startTime}ms`);
      return { url: downloadUrl, filename };
    } catch (e: any) {
      console.error('getDirectDownloadUrl error:', e.message, `after ${Date.now() - startTime}ms`);
      return null;
    }
  }

  async resolveFileUrl(
    filexaUrl: string,
    username: string,
    password: string
  ): Promise<{ url: string; filename: string } | null> {
    console.log('=== resolveFileUrl START ===');
    const overallStart = Date.now();
    // Single global timeout for entire operation: 70 seconds
    // This keeps the request under typical HTTP gateway limits.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.error(`resolveFileUrl: Global timeout fired after ${Date.now() - overallStart}ms`);
      controller.abort();
    }, 70000);

    try {
      console.log(`[${Date.now() - overallStart}ms] Starting login...`);
      const loginOk = await this.login(username, password, controller.signal);
      console.log(`[${Date.now() - overallStart}ms] Login result:`, loginOk);
      if (!loginOk) {
        console.error('resolveFileUrl: Login failed or timed out');
        return null;
      }
      
      console.log(`[${Date.now() - overallStart}ms] Starting getDirectDownloadUrl...`);
      const result = await this.getDirectDownloadUrl(filexaUrl, controller.signal);
      console.log(`[${Date.now() - overallStart}ms] Resolve result:`, result);
      return result;
    } finally {
      console.log(`=== resolveFileUrl END (total: ${Date.now() - overallStart}ms) ===`);
      clearTimeout(timeoutId);
    }
  }
}

// export function decryptCredentials(encrypted: string, key: string): {
//   email: string;
//   password: string;
// } {
//   try {
//     const buf = Buffer.from(encrypted, 'base64');
//     const decrypted = Buffer.allocUnsafe(buf.length);

//     for (let i = 0; i < buf.length; i++) {
//       decrypted[i] = buf[i] ^ key.charCodeAt(i % key.length);
//     }

//     const json = decrypted.toString('utf-8');
//     return JSON.parse(json);
//   } catch {
//     throw new Error('Failed to decrypt credentials');
//   }
// }

// export function encryptCredentials(
//   email: string,
//   password: string,
//   key: string
// ): string {
//   const json = JSON.stringify({ email, password });
//   const buf = Buffer.from(json, 'utf-8');
//   const encrypted = Buffer.allocUnsafe(buf.length);

//   for (let i = 0; i < buf.length; i++) {
//     encrypted[i] = buf[i] ^ key.charCodeAt(i % key.length);
//   }

//   return encrypted.toString('base64');
// }
