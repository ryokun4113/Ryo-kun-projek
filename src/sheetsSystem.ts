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
    'No',
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

  // Natural numeric sorting for items based on SKU / numerical order (1, 2, 3... 10, 11)
  const sortedInventory = [...inventory].sort((a, b) => {
    const aId = String(a.id || '');
    const bId = String(b.id || '');
    const aNumMatch = aId.match(/^(\d+)/);
    const bNumMatch = bId.match(/^(\d+)/);
    if (aNumMatch && bNumMatch) {
      return parseInt(aNumMatch[1], 10) - parseInt(bNumMatch[1], 10);
    }
    const aAnyNum = aId.match(/(\d+)/);
    const bAnyNum = bId.match(/(\d+)/);
    if (aAnyNum && bAnyNum) {
      const diff = parseInt(aAnyNum[1], 10) - parseInt(bAnyNum[1], 10);
      if (diff !== 0) return diff;
    }
    return aId.localeCompare(bId, undefined, { numeric: true, sensitivity: 'base' });
  });

  const inventoryRows = sortedInventory.map((item, idx) => {
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
      idx + 1, // 'No' sequence starting from 1, 2, 3, 4, 5... up to N
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

  // Fetch actual sheet names first to prevent referencing invalid names
  const sheetMetaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!sheetMetaRes.ok) {
    if (sheetMetaRes.status === 401) {
        throw new Error('Sesi Akses Google Anda telah kedaluwarsa. Harap Log Out akun Google dari pengaturan dan hubungkan ulang.');
    }
    const errorText = await sheetMetaRes.text();
    console.error('Metadata Fetch Error:', errorText);
    if (sheetMetaRes.status === 404) {
        throw new Error('Spreadsheet tidak ditemukan. File mungkin telah dihapus. Harap Hapus Koneksi dan hubungkan ulang.');
    }
    throw new Error('Gagal memuat metadata spreadsheet: ' + errorText);
  }
  const sheetMeta = await sheetMetaRes.json();
  const existingSheets = sheetMeta.sheets.map((s: any) => s.properties.title);

  let inventorySheetName = existingSheets.find((s: string) => s.includes('Aset') || s.includes('Inventory')) || existingSheets[0];
  let logsSheetName = existingSheets.find((s: string) => s.includes('Riwayat') || s.includes('Log') || s.includes('Mutasi')) || existingSheets[1] || existingSheets[0];

  // 1. Clear both tabs completely before writing newest state
  const rangesToClear = [`'${inventorySheetName}'!A1:Z5000`, `'${logsSheetName}'!A1:Z10000`];
  for (const range of rangesToClear) {
    const clearRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!clearRes.ok) {
       const err = await clearRes.text();
       console.warn(`Clear error on ${range}:`, err);
       // we might want to continue, but let's throw to know what happens
       // throw new Error(`Clear error on ${range}: ${err}`);
    }
  }

  // 2. Write Inventory Data
  const writeInventoryRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`'${inventorySheetName}'!A1`)}?valueInputOption=USER_ENTERED`,
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
    const errorText = await writeInventoryRes.text();
    console.error('Inventory Sync Error:', errorText);
    throw new Error('Gagal menyinkronkan data Aset ke Google Sheets: ' + errorText);
  }

  // 3. Write Logs Data
  const writeLogsRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`'${logsSheetName}'!A1`)}?valueInputOption=USER_ENTERED`,
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
    const errorText = await writeLogsRes.text();
    console.error('Logs Sync Error:', errorText);
    throw new Error('Gagal menyinkronkan Riwayat Mutasi ke Google Sheets: ' + errorText);
  }
};

/**
 * Fetches inventory data from the Google Spreadsheet (Active "Aset (Inventory)" sheet)
 * and reconstructs the list of Items to enable Bidirectional Sync.
 */
export const pullDataFromSpreadsheet = async (spreadsheetId: string): Promise<any[]> => {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error('Not authenticated with Google');

  const sheetMetaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!sheetMetaRes.ok) {
    if (sheetMetaRes.status === 401) {
        throw new Error('Sesi Akses Google Anda telah kedaluwarsa. Harap Log Out akun Google dari pengaturan dan hubungkan ulang.');
    }
    const errorText = await sheetMetaRes.text();
    console.error('Metadata Fetch Error (Pull):', errorText);
    if (sheetMetaRes.status === 404) {
        throw new Error('Spreadsheet tidak ditemukan. File mungkin telah dihapus. Harap Hapus Koneksi dan hubungkan ulang.');
    }
    throw new Error('Gagal memuat metadata spreadsheet: ' + errorText);
  }
  const sheetMeta = await sheetMetaRes.json();
  const existingSheets = sheetMeta.sheets.map((s: any) => s.properties.title);
  let inventorySheetName = existingSheets.find((s: string) => s.includes('Aset') || s.includes('Inventory')) || existingSheets[0];

  const range = `'${inventorySheetName}'!A1:Z5000`;
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

  const header = rows[0].map((h: any) => String(h).trim().toLowerCase());
  const items: any[] = [];

  // Find column indices based on header keywords
  let skuIdx = header.findIndex((h: string) => h.includes('sku') || h.includes('barcode') || h.includes('kode'));
  if (skuIdx === -1) skuIdx = header.includes('no') ? 1 : 0;

  let nameIdx = header.findIndex((h: string) => h.includes('nama') || h.includes('aset') || h.includes('barang'));
  if (nameIdx === -1) nameIdx = header.includes('no') ? 2 : 1;

  let categoryIdx = header.findIndex((h: string) => h.includes('kategori'));
  if (categoryIdx === -1) categoryIdx = header.includes('no') ? 3 : 2;

  let serialIdx = header.findIndex((h: string) => h.includes('seri') || h.includes('serial'));
  if (serialIdx === -1) serialIdx = header.includes('no') ? 4 : 3;

  let poporIdx = header.findIndex((h: string) => h.includes('popor'));
  if (poporIdx === -1) poporIdx = header.includes('no') ? 5 : 4;

  let holderIdx = header.findIndex((h: string) => h.includes('pemegang') || h.includes('peminjam'));
  if (holderIdx === -1) holderIdx = header.includes('no') ? 6 : 5;

  let statusIdx = header.findIndex((h: string) => h.includes('status'));
  if (statusIdx === -1) statusIdx = header.includes('no') ? 7 : 6;

  let dateIdx = header.findIndex((h: string) => h.includes('tanggal') || h.includes('registrasi') || h.includes('date'));
  if (dateIdx === -1) dateIdx = header.includes('no') ? 8 : 7;

  let noteIdx = header.findIndex((h: string) => h.includes('keterangan') || h.includes('catatan') || h.includes('note'));
  if (noteIdx === -1) noteIdx = header.includes('no') ? 9 : 8;

  const getRowVal = (row: any[], index: number, fallback = '') => {
    if (index === -1 || index >= row.length) return fallback;
    return row[index] !== undefined && row[index] !== null ? String(row[index]).trim() : fallback;
  };

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    // Use the resolved SKU index to get item ID
    const sku = getRowVal(row, skuIdx);
    if (!sku) continue; // Skip rows without SKU/Barcode

    const name = getRowVal(row, nameIdx);
    const category = getRowVal(row, categoryIdx);
    const serial = getRowVal(row, serialIdx);
    const popor = getRowVal(row, poporIdx);
    const holderVal = getRowVal(row, holderIdx);
    const statusVal = getRowVal(row, statusIdx, 'Di Gudang');
    const regDateVal = getRowVal(row, dateIdx);
    const note = getRowVal(row, noteIdx);

    const status = (statusVal === 'Keluar' || statusVal === 'KELUAR') ? 'Keluar' : 'Di Gudang';
    const holder = (holderVal === '-' || holderVal === 'N/A' || !holderVal) ? '-' : holderVal;

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
