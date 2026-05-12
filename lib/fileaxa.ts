import * as cheerio from 'cheerio';

interface FilexaFile {
  url: string;
  filename: string;
}

export class FilexaClient {
  private cookies: string = '';

  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeoutMs: number = 15000
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(url, {
        ...options,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  async getCsrfToken(): Promise<string> {
    try {
      console.log('Fetching CSRF token from login page...');
      const response = await this.fetchWithTimeout(
        'https://fileaxa.com/login',
        {
          method: 'GET',
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept':
              'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
          },
        },
        10000
      );

      // Save initial cookies
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) {
        this.cookies = setCookie
          .split(',')
          .map((c: string) => c.split(';')[0].trim())
          .filter((c: string) => c.includes('='))
          .join('; ');
        console.log('Initial cookies saved from CSRF page');
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      const token = $('input[name="_token"]').attr('value') || '';
      console.log('CSRF token extracted:', token ? 'yes' : 'no');
      return token;
    } catch (error) {
      console.error('Error fetching CSRF token:', error);
      return '';
    }
  }

  async login(username: string, password: string): Promise<boolean> {
    try {
      console.log('FileAxa login attempt for user:', username);
      const csrfToken = await this.getCsrfToken();

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      try {
        const response = await fetch('https://fileaxa.com/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept':
              'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Referer': 'https://fileaxa.com/login',
            'Origin': 'https://fileaxa.com',
            'Cookie': this.cookies,
          },
          body: new URLSearchParams({
            username,
            password,
            remember: '1',
            ...(csrfToken && { _token: csrfToken }),
          }),
          redirect: 'manual',
          signal: controller.signal,
        });

        clearTimeout(timeout);

        console.log('Login response status:', response.status);
        console.log(
          'Login response headers:',
          Object.fromEntries(response.headers.entries())
        );

        // Extract and save cookies
        const setCookie = response.headers.get('set-cookie');
        console.log('Set-Cookie header present:', !!setCookie);
        if (setCookie) {
          this.cookies = setCookie
            .split(',')
            .map((c: string) => c.split(';')[0].trim())
            .filter((c: string) => c.includes('='))
            .join('; ');
          console.log('Cookies updated from login response');
        }

        // Success if redirect (302) or ok (200)
        const success = response.status === 302 || response.status === 200;
        console.log('Login success:', success);
        return success;
      } finally {
        clearTimeout(timeout);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('FileAxa login TIMEOUT after 15 seconds');
      } else {
        console.error('FileAxa login failed:', error.message);
      }
      return false;
    }
  }

  async getDirectDownloadUrl(filePageUrl: string): Promise<FilexaFile | null> {
    try {
      console.log('Fetching file page:', filePageUrl);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      try {
        const response = await fetch(filePageUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Cookie': this.cookies,
            'Referer': 'https://fileaxa.com',
            'Accept':
              'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          console.error(
            'File page fetch failed with status:',
            response.status
          );
          return null;
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        let filename =
          $('meta[property="og:title"]').attr('content') ||
          $('h1').first().text().trim() ||
          'download';

        let downloadUrl =
          $('a[href*="/download"]').attr('href') ||
          $('a[download]').attr('href') ||
          $('a.btn-success').attr('href') ||
          $('a.download-btn').attr('href') ||
          '';

        if (!downloadUrl) {
          $('a').each((_: number, el: any): boolean | void => {
            const href = $(el).attr('href') || '';
            if (href.includes('download') || href.includes('/d/')) {
              downloadUrl = href;
              return false;
            }
          });
        }

        if (!downloadUrl) {
          console.error('Could not find download URL in page HTML');
          return null;
        }

        if (!downloadUrl.startsWith('http')) {
          downloadUrl = new URL(downloadUrl, 'https://fileaxa.com').toString();
        }

        filename = filename.replace(/[^a-z0-9._-]/gi, '_').substring(0, 100);
        console.log('Download URL extracted:', downloadUrl.substring(0, 50) + '...');
        console.log('Filename extracted:', filename);
        return { url: downloadUrl, filename };
      } finally {
        clearTimeout(timeout);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('File page fetch TIMEOUT after 15 seconds');
      } else {
        console.error('Error extracting download URL:', error.message);
      }
      return null;
    }
  }

  async resolveFileUrl(
    filexaUrl: string,
    username: string,
    password: string
  ): Promise<FilexaFile | null> {
    console.log('=== FILEAXA CLIENT RESOLVE START ===');
    console.log('URL:', filexaUrl);
    console.log('Username:', username);

    const loginSuccess = await this.login(username, password);
    console.log('Login success:', loginSuccess);

    if (!loginSuccess) {
      throw new Error('Invalid FileAxa credentials');
    }

    const result = await this.getDirectDownloadUrl(filexaUrl);
    console.log('Resolve result:', result ? 'success' : 'failed');
    console.log('=== FILEAXA CLIENT RESOLVE END ===');

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
