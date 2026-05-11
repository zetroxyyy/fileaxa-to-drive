# My File Vault

A private, full-stack Next.js 14 application for transferring files from FileAxa directly to Google Drive.

## Features

- 🔐 **Password-protected access** - Simple hardcoded password gate
- 📋 **Link management** - Save and organize FileAxa links
- 🔑 **Secure credentials** - FileAxa credentials encrypted with client-side encryption
- ☁️ **Google Drive integration** - OAuth 2.0 with Google Drive API
- ⚡ **Streaming transfers** - Files streamed directly without disk storage
- 📱 **Responsive design** - Dark theme, mobile-friendly UI

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Auth**: next-auth (Google OAuth)
- **APIs**: Google Drive API, FileAxa
- **Deployment**: Vercel (free tier)

## Setup

### 1. Prerequisites

- Node.js 18+ installed
- Google Cloud Project with OAuth credentials
- FileAxa premium account

### 2. Environment Variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SITE_PASSWORD=your_chosen_password
NEXTAUTH_SECRET=generate_with_openssl_rand_hex_32
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

To generate `NEXTAUTH_SECRET`:
```bash
openssl rand -hex 32
```

### 3. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable Google Drive API
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Client Secret to `.env.local`

### 4. Installation & Running

```bash
npm install

# Development
npm run dev

# Production build
npm run build
npm start
```

Visit `http://localhost:3000` and enter your password.

## Usage

1. **Unlock**: Enter your site password
2. **Connect Google Drive**: Click "Connect Drive" button
3. **Enter FileAxa Credentials**: Click "FileAxa Login" to enter your premium credentials (encrypted locally)
4. **Add Links**: Paste FileAxa URLs with titles
5. **Transfer**: Click "Download to Drive" to stream files to your Google Drive

## How It Works

### Transfer Pipeline

1. Client encrypts FileAxa credentials locally
2. User clicks "Download to Drive"
3. Server receives encrypted credentials + FileAxa URL + Google access token
4. Server decrypts FileAxa credentials
5. Server authenticates with FileAxa and extracts direct download link
6. Server streams file download from FileAxa
7. Server pipes stream directly to Google Drive upload
8. File appears in "FileAxa Downloads" folder in Google Drive
9. Client receives shareable link

**No files are stored on disk** - pure streaming pipeline.

## Security Notes

- Site password is stored in `.env.local` (change it!)
- FileAxa credentials are encrypted client-side before sending to server
- Google OAuth token stored in next-auth session (secure, HttpOnly cookie)
- Never run production without HTTPS
- Keep `.env.local` secret and never commit it

## Deployment to Vercel

1. Push to GitHub
2. Connect repo to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy
5. Update `NEXTAUTH_URL` to your Vercel domain

## Troubleshooting

**"Invalid FileAxa credentials"**
- Check email/password are correct for FileAxa premium account
- FileAxa may have updated login mechanism (update cheerio selectors in `/lib/fileaxa.ts`)

**"File not found or removed"**
- FileAxa link may be expired or file was deleted
- Try opening the link in browser directly to verify it works

**"Google Drive authentication failed"**
- Reauthenticate by clicking Google Drive button
- Check if OAuth credentials are still valid in Google Cloud Console

**Transfer stalls**
- May be slow network or large file
- Check browser console for errors
- Increase timeout in `/app/api/transfer/route.ts` if needed

## File Structure

```
/app
  /api/auth/[...nextauth]/route.ts    - Google OAuth
  /api/fileaxa/resolve/route.ts       - FileAxa URL extraction
  /api/transfer/route.ts              - Core transfer pipeline
  /api/links/route.ts                 - Link management
  /page.tsx                           - Main UI & password gate
  /layout.tsx                         - Root layout
  globals.css                         - Tailwind setup

/components
  FileCard.tsx                        - File display card
  FilexaCredentialsModal.tsx          - Credentials input
  TransferProgress.tsx                - Transfer status

/lib
  fileaxa.ts                          - FileAxa client & encryption
  drive.ts                            - Google Drive helpers

/data
  links.json                          - Persisted file links
```

## License

MIT
