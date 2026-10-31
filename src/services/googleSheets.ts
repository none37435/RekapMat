import { MaterialRekapRow, DailyProcessRow, MasterCodeMapping, StatusType, SumberType } from '../types/material';

export const GAS_URL_STORAGE_KEY = 'rekap_gas_web_app_url_v1';

export interface GasPingResult {
  success: boolean;
  title?: string;
  spreadsheetUrl?: string;
  message: string;
}

export interface GasSyncResult {
  success: boolean;
  title?: string;
  spreadsheetUrl?: string;
  message: string;
  materialRowsCount: number;
  processRowsCount: number;
}

export interface GasImportResult {
  success: boolean;
  title: string;
  spreadsheetUrl?: string;
  materialRows: MaterialRekapRow[];
  processRows: DailyProcessRow[];
  message?: string;
}

export const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbw6IbhhCpkSUSo7MsOx_gsdeMDti3jPbaCy72AQcP50--7feqJq1IZ9XQGYhuUaBLscwA/exec';

/**
 * Mengambil URL Google Apps Script yang tersimpan di localStorage (atau default URL).
 */
export function getSavedGasUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_GAS_URL;
  return localStorage.getItem(GAS_URL_STORAGE_KEY) || DEFAULT_GAS_URL;
}

/**
 * Menyimpan URL Google Apps Script ke localStorage.
 */
export function saveGasUrl(url: string): void {
  if (typeof window === 'undefined') return;
  const clean = (url || '').trim();
  if (clean) {
    localStorage.setItem(GAS_URL_STORAGE_KEY, clean);
  } else {
    localStorage.removeItem(GAS_URL_STORAGE_KEY);
  }
}

/**
 * Mengirim request ke Google Apps Script Web App.
 * Menggunakan mode text/plain pada POST untuk menghindari kendala preflight CORS pada Google Apps Script.
 */
async function callGasApi<T>(url: string, method: 'GET' | 'POST', payload?: Record<string, unknown>): Promise<T> {
  const cleanUrl = url.trim();
  if (!cleanUrl) {
    throw new Error('URL Google Apps Script belum diisi. Silakan masukkan Web App URL Anda.');
  }

  let fetchUrl = cleanUrl;
  let options: RequestInit = {
    method,
    redirect: 'follow',
  };

  if (method === 'GET') {
    if (payload) {
      const queryParams = new URLSearchParams();
      Object.entries(payload).forEach(([k, v]) => {
        if (v !== undefined && v !== null) queryParams.set(k, String(v));
      });
      const sep = fetchUrl.includes('?') ? '&' : '?';
      fetchUrl = `${fetchUrl}${sep}${queryParams.toString()}`;
    }
  } else {
    // Gunakan text/plain untuk melewati CORS preflight OPTIONS di Google Apps Script
    options = {
      ...options,
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload || {}),
    };
  }

  const response = await fetch(fetchUrl, options);
  if (!response.ok) {
    throw new Error(`Google Apps Script merespons status error (${response.status} ${response.statusText})`);
  }

  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Respon dari Google Apps Script bukan format JSON yang valid: ${text.slice(0, 150)}...`);
  }
}

/**
 * Menguji koneksi ke Google Apps Script Web App.
 */
export async function testGasConnection(url: string): Promise<GasPingResult> {
  try {
    const res = await callGasApi<{
      status: string;
      title?: string;
      spreadsheetUrl?: string;
      message?: string;
    }>(url, 'GET', { action: 'ping' });

    if (res.status === 'ok' || res.status === 'success') {
      return {
        success: true,
        title: res.title || 'Spreadsheet Terhubung',
        spreadsheetUrl: res.spreadsheetUrl,
        message: res.message || 'Koneksi Apps Script Berhasil!',
      };
    }
    return {
      success: false,
      message: res.message || 'Status Apps Script tidak valid.',
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Gagal menghubungi URL Apps Script.',
    };
  }
}

/**
 * Sinkronisasi data Rekap Material dan Rencana Proses ke Google Sheets via Apps Script.
 */
export async function syncToGoogleSheetsViaGas(
  url: string,
  materialRows: MaterialRekapRow[],
  processRows: DailyProcessRow[],
  options = { syncMaterial: true, syncProcess: true }
): Promise<GasSyncResult> {
  const payload = {
    action: 'sync',
    materialRows,
    processRows,
    options,
  };

  const res = await callGasApi<{
    status: string;
    title?: string;
    spreadsheetUrl?: string;
    message?: string;
    rowCounts?: { material?: number; process?: number };
  }>(url, 'POST', payload);

  if (res.status === 'success' || res.status === 'ok') {
    return {
      success: true,
      title: res.title || 'Spreadsheet',
      spreadsheetUrl: res.spreadsheetUrl,
      message: res.message || 'Data berhasil disinkronkan ke Google Sheets!',
      materialRowsCount: res.rowCounts?.material ?? (options.syncMaterial ? materialRows.length : 0),
      processRowsCount: res.rowCounts?.process ?? (options.syncProcess ? processRows.length : 0),
    };
  }

  throw new Error(res.message || 'Gagal menyinkronkan data via Apps Script.');
}

/**
 * Menarik data dari Google Sheets via Apps Script Web App.
 */
export async function importFromGoogleSheetsViaGas(url: string): Promise<GasImportResult> {
  const res = await callGasApi<{
    status: string;
    title?: string;
    spreadsheetUrl?: string;
    materialRows?: MaterialRekapRow[];
    processRows?: DailyProcessRow[];
    message?: string;
  }>(url, 'GET', { action: 'getData' });

  if (res.status === 'success' || res.status === 'ok') {
    const rawMat = Array.isArray(res.materialRows) ? res.materialRows : [];
    const rawProc = Array.isArray(res.processRows) ? res.processRows : [];

    // Validasi & Sanitasi Data Impor Material
    const validSumber: SumberType[] = ['SGC', 'MR', 'PLESTER', 'SAMBUNG', 'OS', 'CN', 'CEKSTOK'];
    const validStatus: StatusType[] = ['Sudah', 'Belum', 'Sambung', 'Kurang', 'CEKSTOK'];

    const sanitizedMaterial: MaterialRekapRow[] = rawMat.map((r, i) => ({
      id: r.id || `gas-mat-${Date.now()}-${i}`,
      week: r.week || 'Oct-W2',
      tanggal: r.tanggal || '',
      jenis: r.jenis === 'Kasa Roll' ? 'Kasa Roll' : 'Kasa Lipat',
      nama: r.nama || '24/20',
      qty: Number(r.qty) || 0,
      hari: r.hari || 'Senin',
      sumber: validSumber.includes(r.sumber) ? r.sumber : (r.sumber || 'MR'),
      status: validStatus.includes(r.status) ? r.status : (r.status || 'Belum'),
      keterangan: r.keterangan || '',
      oleh: r.oleh || '',
      waktu: r.waktu || '',
      noMr: r.noMr || '',
      isHighlighted: Boolean(r.isHighlighted),
    }));

    const sanitizedProcess: DailyProcessRow[] = rawProc.map((p, i) => {
      const slit = Number(p.slitting) || 0;
      const fold = Number(p.folding) || 0;
      const cut = Number(p.cutting) || 0;
      const sam = Number(p.sambung) || 0;
      const insp = Number(p.inspection) || 0;
      const tot = Number(p.total) || (slit + fold + cut + sam + insp);

      return {
        id: p.id || `gas-proc-${Date.now()}-${i}`,
        no: Number(p.no) || (i + 1),
        kode: p.kode || '',
        namaProduk: p.namaProduk || '',
        slitting: slit,
        folding: fold,
        cutting: cut,
        sambung: sam,
        inspection: insp,
        total: tot,
        keterangan: p.keterangan || '',
        hari: p.hari || 'Senin',
        sheetName: p.sheetName || 'Rencana Proses',
      };
    });

    return {
      success: true,
      title: res.title || 'Google Spreadsheet',
      spreadsheetUrl: res.spreadsheetUrl,
      materialRows: sanitizedMaterial,
      processRows: sanitizedProcess,
      message: res.message,
    };
  }

  throw new Error(res.message || 'Gagal menarik data dari Google Sheets.');
}

/**
 * Mengambil master kode realtime dari cloud Google Sheets via Apps Script.
 */
export async function fetchMasterCodesFromGas(url: string): Promise<MasterCodeMapping[] | null> {
  try {
    const res = await callGasApi<{
      status: string;
      masterCodes?: MasterCodeMapping[];
    }>(url, 'GET', { action: 'getMasterCodes' });

    if (res.status === 'success' && Array.isArray(res.masterCodes)) {
      return res.masterCodes;
    }
    return null;
  } catch (err) {
    console.warn('Gagal memuat master kode dari Google Apps Script:', err);
    return null;
  }
}

/**
 * Menyimpan master kode ke cloud Google Sheets via Apps Script agar tersinkronisasi di semua perangkat.
 */
export async function saveMasterCodesToGas(url: string, masterCodes: MasterCodeMapping[]): Promise<boolean> {
  try {
    const res = await callGasApi<{
      status: string;
      message?: string;
    }>(url, 'POST', {
      action: 'saveMasterCodes',
      masterCodes,
    });

    return res.status === 'success';
  } catch (err) {
    console.warn('Gagal menyimpan master kode ke Google Apps Script:', err);
    return false;
  }
}

/**
 * Template skrip Google Apps Script (Code.gs) siap pakai yang bisa disalin user.
 */
export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * =========================================================================
 * REKAP MATERIAL MESIN - GOOGLE APPS SCRIPT WEB APP
 * =========================================================================
 * 
 * PETUNJUK INSTALASI CEPAT:
 * 1. Buka Google Spreadsheet target Anda.
 * 2. Klik menu 'Ekstensi' (Extensions) -> 'Apps Script'.
 * 3. Hapus seluruh isi file Code.gs, lalu tempel kode di bawah ini.
 * 4. Klik tombol simpan (ikon disket).
 * 5. Klik tombol 'Terapkan' (Deploy) di kanan atas -> 'Penerapan baru' (New deployment).
 * 6. Klik ikon roda gigi pada jenis deployment -> pilih 'Aplikasi Web' (Web App).
 * 7. Konfigurasi wajib:
 *    - Jalankan sebagai (Execute as): 'Saya' (Me)
 *    - Yang memiliki akses (Who has access): 'Siapa saja' (Anyone)
 * 8. Klik 'Terapkan' (Deploy), berikan izin akses (Authorize access).
 * 9. Salin 'URL Aplikasi Web' yang berakhiran /exec dan masukkan ke aplikasi RekapMat!
 */

// OPSIONAL: Jika skrip dibuat mandiri di script.google.com (bukan dari menu Ekstensi Spreadsheet),
// Anda dapat memasukkan ID Spreadsheet Google Anda di sini, ATAU biarkan kosong agar otomatis dibuatkan baru:
var MANUAL_SPREADSHEET_ID = '';

function doGet(e) {
  return handleRequest(e, 'GET');
}

function doPost(e) {
  return handleRequest(e, 'POST');
}

function getSpreadsheetInstance(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss) return ss;

  var id = MANUAL_SPREADSHEET_ID || (params && (params.spreadsheetId || params.id));
  var props = PropertiesService.getScriptProperties();
  if (!id) {
    id = props.getProperty('SPREADSHEET_ID');
  }

  if (id) {
    try {
      var opened = SpreadsheetApp.openById(id);
      if (opened) {
        props.setProperty('SPREADSHEET_ID', id);
        return opened;
      }
    } catch (e) {}
  }

  // Jika belum ada spreadsheet, otomatis buat spreadsheet baru di Google Drive!
  try {
    var newSs = SpreadsheetApp.create('Rekap Material & Rencana Proses Mesin');
    props.setProperty('SPREADSHEET_ID', newSs.getId());
    return newSs;
  } catch (err) {
    throw new Error('Gagal mengakses atau membuat Spreadsheet: ' + err.toString());
  }
}

function handleRequest(e, method) {
  var params = {};
  if (method === 'GET') {
    params = e && e.parameter ? e.parameter : {};
  } else {
    try {
      if (e && e.postData && e.postData.contents) {
        params = JSON.parse(e.postData.contents);
      } else if (e && e.parameter) {
        params = e.parameter;
      }
    } catch (err) {
      return jsonResponse({ status: 'error', message: 'Payload JSON tidak valid: ' + err.toString() });
    }
  }

  var action = params.action || 'ping';
  var ss = getSpreadsheetInstance(params);

  try {
    if (action === 'ping') {
      return jsonResponse({
        status: 'ok',
        title: ss ? ss.getName() : 'Rekap Material Mesin',
        spreadsheetUrl: ss ? ss.getUrl() : '',
        message: 'Koneksi Apps Script Berhasil!'
      });
    }

    if (action === 'getData' || action === 'import') {
      return handleGetData(ss);
    }

    if (action === 'sync') {
      return handleSyncData(ss, params);
    }

    if (action === 'getMasterCodes') {
      return handleGetMasterCodes(ss);
    }

    if (action === 'saveMasterCodes') {
      return handleSaveMasterCodes(ss, params.masterCodes);
    }

    return jsonResponse({ status: 'error', message: 'Aksi tidak dikenal: ' + action });
  } catch (error) {
    return jsonResponse({ status: 'error', message: error.toString() });
  }
}

function handleGetData(ss) {
  var matSheet = ss.getSheetByName('Rekap Material Mesin');
  var procSheet = ss.getSheetByName('Rencana Proses Mesin');
  
  var materialRows = [];
  var processRows = [];

  if (matSheet) {
    var matData = matSheet.getDataRange().getValues();
    if (matData.length > 1) {
      var headers = matData[0].map(function(h) { return String(h || '').toLowerCase(); });
      var weekIdx = findCol(headers, ['week']);
      var tglIdx = findCol(headers, ['tanggal', 'tgl']);
      var jenisIdx = findCol(headers, ['jenis']);
      var namaIdx = findCol(headers, ['nama', 'bahan']);
      var qtyIdx = findCol(headers, ['qty', 'jumlah']);
      var hariIdx = findCol(headers, ['hari']);
      var sumberIdx = findCol(headers, ['sumber']);
      var statusIdx = findCol(headers, ['status']);
      var ketIdx = findCol(headers, ['keterangan', 'kode']);
      var olehIdx = findCol(headers, ['oleh', 'pic']);
      var waktuIdx = findCol(headers, ['waktu', 'jam']);
      var mrIdx = findCol(headers, ['mr', 'no. mr']);

      for (var i = 1; i < matData.length; i++) {
        var row = matData[i];
        if (!row || row.length === 0) continue;
        var nama = namaIdx >= 0 ? String(row[namaIdx] || '').trim() : '';
        if (!nama) continue;

        materialRows.push({
          id: 'gas-mat-' + new Date().getTime() + '-' + i,
          week: weekIdx >= 0 ? String(row[weekIdx] || '').trim() : '',
          tanggal: tglIdx >= 0 ? formatDate(row[tglIdx]) : '',
          jenis: jenisIdx >= 0 ? String(row[jenisIdx] || '').trim() : 'Kasa Lipat',
          nama: nama,
          qty: qtyIdx >= 0 ? Number(row[qtyIdx]) || 0 : 0,
          hari: hariIdx >= 0 ? String(row[hariIdx] || '').trim() : 'Senin',
          sumber: sumberIdx >= 0 ? String(row[sumberIdx] || '').trim() : 'MR',
          status: statusIdx >= 0 ? String(row[statusIdx] || '').trim() : 'Belum',
          keterangan: ketIdx >= 0 ? String(row[ketIdx] || '').trim() : '',
          oleh: olehIdx >= 0 ? String(row[olehIdx] || '').trim() : '',
          waktu: waktuIdx >= 0 ? String(row[waktuIdx] || '').trim() : '',
          noMr: mrIdx >= 0 ? String(row[mrIdx] || '').trim() : '',
          isHighlighted: false
        });
      }
    }
  }

  if (procSheet) {
    var procData = procSheet.getDataRange().getValues();
    if (procData.length > 1) {
      for (var j = 1; j < procData.length; j++) {
        var pRow = procData[j];
        if (!pRow || pRow.length === 0) continue;
        var kode = String(pRow[1] || '').trim();
        var namaP = String(pRow[2] || '').trim();
        if (!kode && !namaP) continue;

        var slit = Number(pRow[3]) || 0;
        var fold = Number(pRow[4]) || 0;
        var cut = Number(pRow[5]) || 0;
        var sam = Number(pRow[6]) || 0;
        var insp = Number(pRow[7]) || 0;
        var tot = Number(pRow[8]) || (slit + fold + cut + sam + insp);

        processRows.push({
          id: 'gas-proc-' + new Date().getTime() + '-' + j,
          no: j,
          kode: kode,
          namaProduk: namaP,
          slitting: slit,
          folding: fold,
          cutting: cut,
          sambung: sam,
          inspection: insp,
          total: tot,
          keterangan: String(pRow[9] || '').trim(),
          hari: String(pRow[10] || '').trim() || 'Senin',
          sheetName: String(pRow[11] || '').trim() || 'Rencana Proses'
        });
      }
    }
  }

  return jsonResponse({
    status: 'success',
    title: ss.getName(),
    spreadsheetUrl: ss.getUrl(),
    materialRows: materialRows,
    processRows: processRows
  });
}

function handleSyncData(ss, params) {
  var matRows = params.materialRows || [];
  var procRows = params.processRows || [];
  var syncMat = params.options ? params.options.syncMaterial !== false : true;
  var syncProc = params.options ? params.options.syncProcess !== false : true;

  if (syncMat) {
    var matSheet = ss.getSheetByName('Rekap Material Mesin');
    if (!matSheet) {
      matSheet = ss.insertSheet('Rekap Material Mesin');
    }
    matSheet.clear();
    
    var headers = ['Week', 'Tanggal', 'jenis', 'nama (Bahan Baku)', 'qty', 'hari', 'sumber', 'status', 'keterangan (Kode Produk)', 'Oleh', 'Waktu', 'No. MR'];
    var output = [headers];

    for (var i = 0; i < matRows.length; i++) {
      var r = matRows[i];
      output.push([
        r.week || '',
        r.tanggal || '',
        r.jenis || '',
        r.nama || '',
        Number(r.qty) || 0,
        r.hari || '',
        r.sumber || 'MR',
        r.status || 'Belum',
        r.keterangan || '',
        r.oleh || '',
        r.waktu || '',
        r.noMr || ''
      ]);
    }

    matSheet.getRange(1, 1, output.length, headers.length).setValues(output);
    matSheet.setFrozenRows(1);
    
    matSheet.getRange(1, 1, 1, headers.length)
      .setBackground('#0F766E')
      .setFontColor('#FFFFFF')
      .setFontWeight('bold')
      .setHorizontalAlignment('center');
      
    if (matRows.length > 0) {
      var sumberList = ['SGC', 'MR', 'PLESTER', 'SAMBUNG', 'OS', 'CN', 'CEKSTOK'];
      var statusList = ['Sudah', 'Belum', 'Sambung', 'Kurang', 'CEKSTOK'];
      
      var sumberRule = SpreadsheetApp.newDataValidation().requireValueInList(sumberList).build();
      matSheet.getRange(2, 7, matRows.length, 1).setDataValidation(sumberRule);
      
      var statusRule = SpreadsheetApp.newDataValidation().requireValueInList(statusList).build();
      matSheet.getRange(2, 8, matRows.length, 1).setDataValidation(statusRule);

      for (var rIdx = 0; rIdx < matRows.length; rIdx++) {
        var h = (matRows[rIdx].hari || '').toLowerCase();
        var bg = '#FFFFFF';
        if (h.indexOf('senin') >= 0) bg = '#FFFBEB';
        else if (h.indexOf('selasa') >= 0) bg = '#F0F9FF';
        else if (h.indexOf('rabu') >= 0) bg = '#ECFDF5';
        else if (h.indexOf('kamis') >= 0) bg = '#FAF5FF';
        else if (h.indexOf('jumat') >= 0) bg = '#FFF1F2';
        else if (h.indexOf('sabtu') >= 0) bg = '#F0FDFA';
        
        matSheet.getRange(rIdx + 2, 1, 1, headers.length).setBackground(bg);
      }
    }
  }

  if (syncProc) {
    var procSheet = ss.getSheetByName('Rencana Proses Mesin');
    if (!procSheet) {
      procSheet = ss.insertSheet('Rencana Proses Mesin');
    }
    procSheet.clear();

    var pHeaders = ['No', 'Kode', 'Nama Produk', 'Slitting', 'Folding', 'Cutting', 'Sambung', 'Inspection', 'Total', 'Keterangan', 'Hari', 'Sheet Asal'];
    var pOutput = [pHeaders];

    for (var k = 0; k < procRows.length; k++) {
      var p = procRows[k];
      pOutput.push([
        k + 1,
        p.kode || '',
        p.namaProduk || '',
        Number(p.slitting) || 0,
        Number(p.folding) || 0,
        Number(p.cutting) || 0,
        Number(p.sambung) || 0,
        Number(p.inspection) || 0,
        Number(p.total) || 0,
        p.keterangan || '',
        p.hari || '',
        p.sheetName || ''
      ]);
    }

    procSheet.getRange(1, 1, pOutput.length, pHeaders.length).setValues(pOutput);
    procSheet.setFrozenRows(1);
    procSheet.getRange(1, 1, 1, pHeaders.length)
      .setBackground('#1E293B')
      .setFontColor('#FFFFFF')
      .setFontWeight('bold')
      .setHorizontalAlignment('center');
  }

  return jsonResponse({
    status: 'success',
    title: ss.getName(),
    spreadsheetUrl: ss.getUrl(),
    message: 'Data berhasil disinkronkan ke Google Spreadsheet via Apps Script!',
    rowCounts: {
      material: syncMat ? matRows.length : 0,
      process: syncProc ? procRows.length : 0
    }
  });
}

function handleGetMasterCodes(ss) {
  var sheet = ss.getSheetByName('Master_Kode');
  if (!sheet) {
    return jsonResponse({ status: 'success', masterCodes: [] });
  }
  var data = sheet.getDataRange().getValues();
  var codes = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row || !row[0]) continue;
    codes.push({
      kode: String(row[0]).trim().toUpperCase(),
      bahanBaku: String(row[1] || '24/20').trim(),
      jenis: String(row[2] || 'Kasa Lipat').trim() === 'Kasa Roll' ? 'Kasa Roll' : 'Kasa Lipat',
      catatan: row[3] ? String(row[3]).trim() : undefined
    });
  }
  return jsonResponse({ status: 'success', masterCodes: codes });
}

function handleSaveMasterCodes(ss, codes) {
  if (!Array.isArray(codes)) {
    return jsonResponse({ status: 'error', message: 'Format master codes tidak valid' });
  }
  var sheet = ss.getSheetByName('Master_Kode');
  if (!sheet) {
    sheet = ss.insertSheet('Master_Kode');
  }
  sheet.clear();
  var output = [['Kode Produk', 'Bahan Baku', 'Jenis', 'Catatan']];
  for (var i = 0; i < codes.length; i++) {
    var c = codes[i];
    if (!c || !c.kode) continue;
    output.push([
      String(c.kode).trim().toUpperCase(),
      String(c.bahanBaku || '24/20').trim(),
      c.jenis === 'Kasa Roll' ? 'Kasa Roll' : 'Kasa Lipat',
      c.catatan ? String(c.catatan).trim() : ''
    ]);
  }
  sheet.getRange(1, 1, output.length, 4).setValues(output);
  sheet.getRange(1, 1, 1, 4).setBackground('#0F766E').setFontColor('#FFFFFF').setFontWeight('bold');
  sheet.setFrozenRows(1);
  return jsonResponse({ status: 'success', count: codes.length, message: 'Master kode berhasil disimpan ke cloud!' });
}

function findCol(headers, names) {
  for (var i = 0; i < headers.length; i++) {
    for (var n = 0; n < names.length; n++) {
      if (headers[i].indexOf(names[n]) >= 0) return i;
    }
  }
  return -1;
}

function formatDate(val) {
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(val || '').trim();
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
