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
    timeoutMs: number = 10000
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

  async login(username: string, password: string): Promise<boolean> {
    try {
      const response = await this.fetchWithTimeout(
        'https://fileaxa.com/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept':
              'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          body: new URLSearchParams({ username, password, remember: '1' }),
          redirect: 'follow',
        },
        10000
      );

      // Extract cookies from response headers
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) {
        this.cookies = setCookie
          .split(',')
          .map((c) => c.split(';')[0].trim())
          .join('; ');
      }

      return response.ok || response.status === 302;
    } catch (error) {
      console.error('FileAxa login failed:', error);
      return false;
    }
  }

  async getDirectDownloadUrl(filePageUrl: string): Promise<FilexaFile | null> {
    try {
      const response = await this.fetchWithTimeout(
        filePageUrl,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Cookie': this.cookies,
            'Accept':
              'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        },
        10000
      );

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
      return { url: downloadUrl, filename };
    } catch (error) {
      console.error('Error extracting download URL:', error);
      return null;
    }
  }

  async resolveFileUrl(
    filexaUrl: string,
    username: string,
    password: string
  ): Promise<FilexaFile | null> {
    const loginSuccess = await this.login(username, password);
    if (!loginSuccess) {
      throw new Error('Invalid FileAxa credentials');
    }

    return await this.getDirectDownloadUrl(filexaUrl);
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
