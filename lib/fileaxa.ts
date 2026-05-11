import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import { CookieJar } from 'tough-cookie';
import { HttpCookieAgent, HttpsCookieAgent } from 'http-cookie-agent/http';

interface FilexaFile {
  url: string;
  filename: string;
}

export class FilexaClient {
  private axiosInstance: AxiosInstance;
  private cookieJar: CookieJar;

  constructor() {
    this.cookieJar = new CookieJar();
    this.axiosInstance = axios.create({
      httpAgent: new HttpCookieAgent({ cookies: { jar: this.cookieJar } }),
      httpsAgent: new HttpsCookieAgent({ cookies: { jar: this.cookieJar } }),
      timeout: 10000,
    });
  }

  async login(email: string, password: string): Promise<boolean> {
    try {
      const response = await this.axiosInstance.post(
        'https://fileaxa.com/login',
        new URLSearchParams({
          email,
          password,
          remember: '1',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        }
      );

      return response.status === 200;
    } catch (error) {
      console.error('FileAxa login failed:', error);
      return false;
    }
  }

  async getDirectDownloadUrl(filePageUrl: string): Promise<FilexaFile | null> {
    try {
      const response = await this.axiosInstance.get(filePageUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const $ = cheerio.load(response.data);

      let filename = '';
      let downloadUrl = '';

      // Try to find filename in meta tags or header
      filename =
        $('meta[property="og:title"]').attr('content') ||
        $('h1').first().text().trim() ||
        'download';

      // Look for download button/link - FileAxa patterns:
      // 1. Direct download link in button or <a> tag
      downloadUrl =
        $('a[href*="/download"]').attr('href') ||
        $('a[download]').attr('href') ||
        $('button[onclick*="download"]').attr('onclick') ||
        '';

      // If found onclick, extract URL from it
      if (downloadUrl.includes('window.location')) {
        const match = downloadUrl.match(/'([^']+)'|"([^"]+)"/);
        downloadUrl = match ? match[1] || match[2] : '';
      }

      // Look for form submissions with file URL
      if (!downloadUrl) {
        const form = $('form[method="POST"]').first();
        if (form.length) {
          const action = form.attr('action');
          downloadUrl = action || '';
        }
      }

      if (!downloadUrl) {
        console.error('Could not find download URL in page HTML');
        return null;
      }

      // Ensure absolute URL
      if (!downloadUrl.startsWith('http')) {
        downloadUrl = new URL(downloadUrl, 'https://fileaxa.com').toString();
      }

      // Clean filename
      filename = filename.replace(/[^a-z0-9._-]/gi, '_').substring(0, 100);

      return { url: downloadUrl, filename };
    } catch (error) {
      console.error('Error extracting download URL:', error);
      return null;
    }
  }

  async resolveFileUrl(
    filexaUrl: string,
    email: string,
    password: string
  ): Promise<FilexaFile | null> {
    const loginSuccess = await this.login(email, password);
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
