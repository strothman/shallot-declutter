export interface UploadResult {
  fileId: string;
  webViewLink: string;
  isSimulated?: boolean;
}

const DRIVE_FILES_ENDPOINT = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_ENDPOINT = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

/**
 * Initiates Google OAuth2 popup to obtain access token for Google Drive
 */
export async function requestGoogleDriveAuth(clientId: string): Promise<string> {
  if (!clientId || clientId.trim() === '') {
    throw new Error('Google Client ID is not configured. Please add it in Settings.');
  }

  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google Identity Services script is still loading. Please check your internet connection and try again.');
  }

  return new Promise((resolve, reject) => {
    try {
      const client = window.google!.accounts.oauth2.initTokenClient({
        client_id: clientId.trim(),
        scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email',
        callback: (response) => {
          if (response.error) {
            reject(new Error(response.error_description || response.error));
            return;
          }
          if (response.access_token) {
            resolve(response.access_token);
          } else {
            reject(new Error('No access token returned from Google'));
          }
        },
      });

      client.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Navigates or creates a nested folder structure in Google Drive
 * e.g., "Shallot-Declutter/Medical/EOBs/2026"
 */
export async function findOrCreateFolderPath(
  folderPath: string,
  accessToken: string
): Promise<string> {
  const parts = folderPath.split('/').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) {
    return 'root';
  }

  let parentId = 'root';

  for (const part of parts) {
    // Search if folder exists in this parent
    const query = encodeURIComponent(
      `mimeType = 'application/vnd.google-apps.folder' and name = '${part}' and '${parentId}' in parents and trashed = false`
    );

    const searchRes = await fetch(`${DRIVE_FILES_ENDPOINT}?q=${query}&fields=files(id,name)`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!searchRes.ok) {
      throw new Error(`Drive folder search failed: ${searchRes.statusText}`);
    }

    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      parentId = searchData.files[0].id;
    } else {
      // Create folder
      const createRes = await fetch(DRIVE_FILES_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: part,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentId],
        }),
      });

      if (!createRes.ok) {
        throw new Error(`Drive folder creation failed: ${createRes.statusText}`);
      }

      const createData = await createRes.json();
      parentId = createData.id;
    }
  }

  return parentId;
}

/**
 * Uploads a compiled PDF to the resolved Google Drive folder
 */
export async function uploadPdfToDrive(options: {
  pdfBlob: Blob;
  filename: string;
  folderPath: string;
  accessToken?: string;
}): Promise<UploadResult> {
  const { pdfBlob, filename, folderPath, accessToken } = options;

  // Demo / local mode fallback if no token
  if (!accessToken) {
    // Trigger download of the nicely named PDF to user's device
    const blobUrl = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    return {
      fileId: `local-demo-${Date.now()}`,
      webViewLink: blobUrl,
      isSimulated: true,
    };
  }

  // 1. Resolve target folder in Google Drive
  const parentFolderId = await findOrCreateFolderPath(folderPath, accessToken);

  // 2. Perform multipart upload
  const metadata = {
    name: filename,
    mimeType: 'application/pdf',
    parents: [parentFolderId],
  };

  const boundary = '-------ShallotDeclutterBoundary' + Math.random().toString(36).substring(2);
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`;
  const mediaHeader = `${delimiter}Content-Type: application/pdf\r\n\r\n`;

  // Read blob as binary array
  const pdfArrayBuffer = await pdfBlob.arrayBuffer();

  const multipartBody = new Blob(
    [metadataPart, mediaHeader, new Uint8Array(pdfArrayBuffer), closeDelimiter],
    { type: `multipart/related; boundary=${boundary}` }
  );

  const uploadRes = await fetch(`${DRIVE_UPLOAD_ENDPOINT}&fields=id,name,webViewLink`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`Google Drive Upload failed: ${uploadRes.status} - ${err}`);
  }

  const uploadData = await uploadRes.json();
  return {
    fileId: uploadData.id,
    webViewLink: uploadData.webViewLink || `https://drive.google.com/file/d/${uploadData.id}/view`,
    isSimulated: false,
  };
}
