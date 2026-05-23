import { getAccessToken } from './firebaseAuth';

export const backupToDrive = async (data: any, fileName: string) => {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error('Not authenticated with Google');

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
  };

  const fileData = new Blob([JSON.stringify(data)], { type: 'application/json' });

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', fileData);

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: form,
  });

  if (!response.ok) {
    throw new Error('Failed to upload to Google Drive');
  }
  
  return await response.json();
};

export const listBackupFilesInDrive = async () => {
    const accessToken = await getAccessToken();
    if (!accessToken) throw new Error('Not authenticated with Google');
  
    const q = "mimeType='application/json' and name contains 'backup_gudang'";
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&orderBy=createdTime desc&spaces=drive`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  
    if (!res.ok) throw new Error('Failed to list files');
    const data = await res.json();
    return data.files || [];
};

export const restoreFromDrive = async (fileId: string) => {
    const accessToken = await getAccessToken();
    if (!accessToken) throw new Error('Not authenticated with Google');
  
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  
    if (!res.ok) throw new Error('Failed to download file');
    const data = await res.json();
    return data;
};
