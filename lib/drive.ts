import { google } from 'googleapis';
import { Readable } from 'stream';

const FOLDER_NAME = 'FileAxa Downloads';

export async function uploadFileToDrive(
  accessToken: string,
  fileStream: Readable,
  filename: string,
  mimeType: string = 'application/octet-stream'
): Promise<{ fileId: string; webViewLink: string }> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const drive = google.drive({ version: 'v3', auth });

  try {
    // Find or create FileAxa Downloads folder
    const folderId = await getOrCreateFolder(drive);

    // Upload file to folder
    const file = await drive.files.create(
      {
        requestBody: {
          name: filename,
          parents: [folderId],
          mimeType,
        },
        media: {
          mimeType,
          body: fileStream,
        },
      },
      {
        onUploadProgress: (event: any) => {
          const percent = Math.round((event.bytesRead / (event.bytesRead + 1)) * 100);
          console.log(`Upload progress: ${percent}%`);
        },
      }
    );

    if (!file.data.id || !file.data.webViewLink) {
      throw new Error('Failed to retrieve uploaded file details');
    }

    return {
      fileId: file.data.id,
      webViewLink: file.data.webViewLink,
    };
  } catch (error) {
    console.error('Drive upload error:', error);
    throw error;
  }
}

async function getOrCreateFolder(drive: ReturnType<typeof google.drive>): Promise<string> {
  try {
    // Search for existing folder
    const response = await drive.files.list({
      q: `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      spaces: 'drive',
      fields: 'files(id)',
      pageSize: 1,
    });

    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0].id!;
    }

    // Create new folder
    const folder = await drive.files.create({
      requestBody: {
        name: FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id',
    });

    if (!folder.data.id) {
      throw new Error('Failed to create folder');
    }

    return folder.data.id;
  } catch (error) {
    console.error('Error managing Drive folder:', error);
    throw error;
  }
}

export function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    zip: 'application/zip',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    mp4: 'video/mp4',
    mp3: 'audio/mpeg',
    txt: 'text/plain',
  };

  return mimeTypes[ext || ''] || 'application/octet-stream';
}
//Suii