import { getAccessToken } from './firebaseAuth';

/**
 * Searches for an existing "Database Inventaris Gudang" spreadsheet in the user's Google Drive.
 * If not found, creates a new one with two tabs: "Aset (Inventory)" and "Riwayat Mutasi (Logs)",
 * and returns its spreadsheetId.
 */
export const findOrCreateSpreadsheet = async (): Promise<string> => {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error('Not authenticated with Google');

  const sheetName = 'Database Inventaris Gudang';

  // 1. Search for existing spreadsheet
  const q = `mimeType='application/vnd.google-apps.spreadsheet' and name='${sheetName}' and trashed=false`;
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&spaces=drive&fields=files(id,name)`;
  
  const searchRes = await fetch(searchUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!searchRes.ok) {
    throw new Error('Gagal memeriksa file Spreadsheet di Google Drive Anda.');
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // 2. Spreadsheet not found, create a new one with two structured tabs
  const createUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
  const createBody = {
    properties: {
      title: sheetName,
    },
    sheets: [
      {
        properties: {
          title: 'Aset (Inventory)',
        },
      },
      {
        properties: {
          title: 'Riwayat Mutasi (Logs)',
        },
      },
    ],
  };

  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(createBody),
  });

  if (!createRes.ok) {
    throw new Error('Gagal membuat Spreadsheet baru di Google Drive.');
  }

  const createData = await createRes.json();
  return createData.spreadsheetId;
};

/**
 * Clears old data and writes fresh inventory items + history logs to the Spreadsheet.
 */
export const syncDataToSpreadsheet = async (
  spreadsheetId: string,
  inventory: any[],
  logs: any[]
): Promise<void> => {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error('Not authenticated with Google');

  // Format the values for "Aset (Inventory)" to match the user's uploaded layout exactly
  const inventoryHeaders = [
    'SKU/Barcode',
    'Nama Aset',
    'Kategori',
    'Nomor Seri',
    'Nomor Popor',
    'Pemegang',
    'Status',
    'Tanggal Registrasi',
    'Keterangan',
  ];

  const inventoryRows = inventory.map(item => {
    // Keep date clean and formatted nicely
    let regDate = item.date || item.registerDate;
    if (!regDate) {
      try {
        regDate = new Date().toISOString();
      } catch (e) {
        regDate = '';
      }
    }
    return [
      item.id || '',
      item.name || '',
      item.category || '',
      item.serial || '',
      item.popor || '',
      item.holder || '-',
      item.status || 'Di Gudang',
      regDate,
      item.note || '',
    ];
  });

  const inventoryData = [inventoryHeaders, ...inventoryRows];

  // Format the values for "Riwayat Mutasi (Logs)"
  const logsHeaders = [
    'Waktu Log',
    'SKU / ID',
    'Nama Aset',
    'Tipe Transaksi',
    'Peminjam / Pemegang',
    'Operator Penginput',
    'Catatan / Sesi Opname',
  ];

  const logsRows = logs.map(log => [
    `${log.fullDate || ''} ${log.time || ''}`,
    log.id || '',
    log.name || '',
    log.type === 'IN' ? 'KEMBALI (CHECK-IN)' : log.type === 'OUT' ? 'KELUAR (CHECK-OUT)' : log.type === 'EDIT' ? 'PERUBAHAN DATA' : 'REGISTRASI',
    log.holder || '-',
    log.operator || '',
    log.sessionName || '-',
  ]);

  const logsData = [logsHeaders, ...logsRows];

  // 1. Clear both tabs completely before writing newest state
  const rangesToClear = ['Aset (Inventory)!A1:Z5000', 'Riwayat Mutasi (Logs)!A1:Z10000'];
  for (const range of rangesToClear) {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  // 2. Write Inventory Data
  const writeInventoryRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('Aset (Inventory)!A1')}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: inventoryData,
      }),
    }
  );

  if (!writeInventoryRes.ok) {
    throw new Error('Gagal menyinkronkan data Aset ke Google Sheets.');
  }

  // 3. Write Logs Data
  const writeLogsRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('Riwayat Mutasi (Logs)!A1')}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: logsData,
      }),
    }
  );

  if (!writeLogsRes.ok) {
    throw new Error('Gagal menyinkronkan Riwayat Mutasi ke Google Sheets.');
  }
};

/**
 * Fetches inventory data from the Google Spreadsheet (Active "Aset (Inventory)" sheet)
 * and reconstructs the list of Items to enable Bidirectional Sync.
 */
export const pullDataFromSpreadsheet = async (spreadsheetId: string): Promise<any[]> => {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error('Not authenticated with Google');

  const range = 'Aset (Inventory)!A1:Z5000';
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error('Gagal mengambil data dari Google Sheets. Pastikan spreadsheet Anda valid.');
  }

  const data = await res.json();
  const rows = data.values;
  if (!rows || rows.length <= 1) {
    return []; // No items or only headers
  }

  const header = rows[0];
  const items: any[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0]) continue; // Skip rows without SKU/Barcode

    const sku = String(row[0]).trim();
    const name = row[1] ? String(row[1]).trim() : '';
    const category = row[2] ? String(row[2]).trim() : '';
    const serial = row[3] ? String(row[3]).trim() : '';
    const popor = row[4] ? String(row[4]).trim() : '';
    const holderVal = row[5] ? String(row[5]).trim() : '';
    const statusVal = row[6] ? String(row[6]).trim() : 'Di Gudang';
    const regDateVal = row[7] ? String(row[7]).trim() : '';
    const note = row[8] ? String(row[8]).trim() : '';

    const status = (statusVal === 'Keluar' || statusVal === 'KELUAR') ? 'Keluar' : 'Di Gudang';
    const holder = (holderVal === '-' || holderVal === 'N/A' || !holderVal) ? '' : holderVal;

    items.push({
      id: sku,
      name,
      category: category || 'UMUM',
      serial,
      popor,
      status,
      holder,
      note,
      date: regDateVal || new Date().toLocaleDateString('id-ID'),
    });
  }

  return items;
};

/**
 * Sends a transaction notification email via Google Gmail API on behalf of the user.
 */
export const sendTransactionEmail = async (
  recipientEmail: string,
  subject: string,
  bodyContent: string
): Promise<void> => {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error('Not authenticated with Google');

  const emailLines = [
    `To: ${recipientEmail}`,
    `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    bodyContent
  ];

  const emailMime = emailLines.join('\r\n');
  const base64Safe = btoa(unescape(encodeURIComponent(emailMime)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: base64Safe,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Gmail send API error response:', errText);
    throw new Error('Gagal mengirim notifikasi email: ' + errText);
  }
};
