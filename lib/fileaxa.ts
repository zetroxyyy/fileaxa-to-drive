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

  async getCsrfToken(): Promise<string> {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch('https://fileaxa.com/login', {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept':
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: controller.signal,
      });
      // Parse ALL set-cookie headers
      const rawHeaders = res.headers.getSetCookie?.() || [];
      rawHeaders.forEach((c: string) => this.parseCookies(c));
      // Also try single header
      this.parseCookies(res.headers.get('set-cookie'));

      const html = await res.text();
      const $ = cheerio.load(html);
      const token =
        $('input[name="_token"]').attr('value') ||
        $('meta[name="csrf-token"]').attr('content') ||
        '';
      console.log('CSRF token:', token ? 'found' : 'not found');
      console.log('Cookies after GET:', this.getCookieString());
      return token;
    } catch (e: any) {
      console.error('getCsrfToken error:', e.message);
      return '';
    }
  }

  async login(username: string, password: string): Promise<boolean> {
    const token = await this.getCsrfToken();
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 15000);
    try {
      const body = new URLSearchParams();
      body.append('username', username);
      body.append('password', password);
      body.append('remember', '1');
      if (token) body.append('_token', token);

      console.log('Attempting login with cookie:', this.getCookieString());

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
        signal: controller.signal,
      });

      const rawHeaders = res.headers.getSetCookie?.() || [];
      rawHeaders.forEach((c: string) => this.parseCookies(c));
      this.parseCookies(res.headers.get('set-cookie'));

      console.log('Login status:', res.status);
      console.log('Cookies after login:', this.getCookieString());

      const hasCookies = Object.keys(this.cookies).length > 0;
      return res.status === 302 || res.status === 200 || hasCookies;
    } catch (e: any) {
      console.error('Login error:', e.message);
      return false;
    }
  }

  async getDirectDownloadUrl(
    filePageUrl: string
  ): Promise<{ url: string; filename: string } | null> {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 15000);
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
        signal: controller.signal,
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
      return { url: downloadUrl, filename };
    } catch (e: any) {
      console.error('getDirectDownloadUrl error:', e.message);
      return null;
    }
  }

  async resolveFileUrl(
    filexaUrl: string,
    username: string,
    password: string
  ): Promise<{ url: string; filename: string } | null> {
    console.log('=== resolveFileUrl START ===');
    const loginOk = await this.login(username, password);
    console.log('Login result:', loginOk);
    if (!loginOk) throw new Error('Invalid FileAxa credentials');
    const result = await this.getDirectDownloadUrl(filexaUrl);
    console.log('Resolve result:', result);
    return result;
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
