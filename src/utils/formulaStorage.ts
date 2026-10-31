import * as XLSX from 'xlsx';
import { MasterRumusMapping } from '../types/material';

export const INITIAL_FORMULAS: MasterRumusMapping[] = [
  {
    kode: '8320311RB',
    namaProduk: 'Needle Punch Roll',
    tipeRumus: 'MULTIPLIER',
    faktor: 2.7,
    satuanHasil: 'meter',
    keterangan: 'Kebutuhan roll dikali 2,7 meter (khusus pengerjaan RB, tidak untuk RE inspection)',
    berlakuUntuk: 'Kasa Roll',
  },
  {
    kode: 'POLIFIX-5',
    namaProduk: 'Polifix Slitting 5cm',
    tipeRumus: 'SLITTING',
    lebarMaster: 110,
    spekLebar: 5,
    satuanHasil: 'roll induk',
    keterangan: '110 / 5 = 22 potong per bahan roll induk',
    berlakuUntuk: 'Kasa Roll',
  },
  {
    kode: 'POLIFIX-10',
    namaProduk: 'Polifix Slitting 10cm',
    tipeRumus: 'SLITTING',
    lebarMaster: 110,
    spekLebar: 10,
    satuanHasil: 'roll induk',
    keterangan: '110 / 10 = 11 potong per bahan roll induk',
    berlakuUntuk: 'Kasa Roll',
  },
  {
    kode: 'POLIFIX-15',
    namaProduk: 'Polifix Slitting 15cm',
    tipeRumus: 'SLITTING',
    lebarMaster: 110,
    spekLebar: 15,
    satuanHasil: 'roll induk',
    keterangan: '110 / 15 = 7,33 potong per bahan roll induk',
    berlakuUntuk: 'Kasa Roll',
  },
  {
    kode: 'POLIFIX-20',
    namaProduk: 'Polifix Slitting 20cm',
    tipeRumus: 'SLITTING',
    lebarMaster: 110,
    spekLebar: 20,
    satuanHasil: 'roll induk',
    keterangan: '110 / 20 = 5,5 potong per bahan roll induk',
    berlakuUntuk: 'Kasa Roll',
  },
];

export const MASTER_RUMUS_STORAGE_KEY = 'master_rumus_mappings_v1';
const BROADCAST_CHANNEL_NAME = 'rekap_master_rumus_realtime_v1';

let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  } catch {}
}

/**
 * Validasi dan sanitasi array rumus
 */
export function sanitizeFormulas(data: unknown): MasterRumusMapping[] {
  if (!Array.isArray(data)) return INITIAL_FORMULAS;

  const valid: MasterRumusMapping[] = [];
  for (const item of data) {
    if (!item || typeof item !== 'object') continue;
    const raw = item as Record<string, unknown>;
    const rawKode = raw.kode ?? raw.code ?? '';
    const kode = String(rawKode).trim().toUpperCase();
    if (!kode) continue;

    // 8320311RE adalah proses inspection terpisah dan tidak boleh memiliki rumus konversi
    if (kode === '8320311RE') continue;

    const rawTipe = String(raw.tipeRumus ?? raw.type ?? 'MULTIPLIER').toUpperCase();
    const tipeRumus = (['MULTIPLIER', 'SLITTING', 'DIVIDER', 'CUSTOM'].includes(rawTipe)
      ? rawTipe
      : 'MULTIPLIER') as MasterRumusMapping['tipeRumus'];

    valid.push({
      id: raw.id ? String(raw.id) : undefined,
      kode,
      namaProduk: raw.namaProduk ? String(raw.namaProduk).trim() : undefined,
      tipeRumus,
      faktor: raw.faktor != null ? Number(raw.faktor) : undefined,
      lebarMaster: raw.lebarMaster != null ? Number(raw.lebarMaster) : undefined,
      spekLebar: raw.spekLebar != null ? Number(raw.spekLebar) : undefined,
      rumusCustom: raw.rumusCustom ? String(raw.rumusCustom).trim() : undefined,
      satuanHasil: raw.satuanHasil ? String(raw.satuanHasil).trim() : (tipeRumus === 'MULTIPLIER' ? 'meter' : 'roll'),
      keterangan: raw.keterangan ? String(raw.keterangan).trim() : undefined,
      berlakuUntuk: raw.berlakuUntuk === 'Semua' ? 'Semua' : 'Kasa Roll',
    });
  }

  return valid.length > 0 ? valid : INITIAL_FORMULAS;
}

export function getFormulaMappings(): MasterRumusMapping[] {
  if (typeof window === 'undefined') return INITIAL_FORMULAS;
  try {
    const raw = localStorage.getItem(MASTER_RUMUS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const sanitized = sanitizeFormulas(parsed);
      if (sanitized && sanitized.length > 0) return sanitized;
    }
  } catch (e) {
    console.warn('Gagal membaca master rumus dari localStorage:', e);
  }
  return INITIAL_FORMULAS;
}

export function saveFormulaMappings(mappings: MasterRumusMapping[]): void {
  if (typeof window === 'undefined') return;
  try {
    const sanitized = sanitizeFormulas(mappings);
    localStorage.setItem(MASTER_RUMUS_STORAGE_KEY, JSON.stringify(sanitized));
    if (broadcastChannel) {
      broadcastChannel.postMessage({
        type: 'MASTER_RUMUS_UPDATED',
        timestamp: Date.now(),
        data: sanitized,
      });
    }
  } catch (e) {
    console.error('Gagal menyimpan master rumus ke localStorage:', e);
  }
}

export function resetFormulaMappings(): MasterRumusMapping[] {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(MASTER_RUMUS_STORAGE_KEY, JSON.stringify(INITIAL_FORMULAS));
      if (broadcastChannel) {
        broadcastChannel.postMessage({
          type: 'MASTER_RUMUS_UPDATED',
          timestamp: Date.now(),
          data: INITIAL_FORMULAS,
        });
      }
    } catch (e) {
      console.warn('Gagal mereset master rumus:', e);
    }
  }
  return INITIAL_FORMULAS;
}

export function subscribeFormulaChanges(callback: (updatedList: MasterRumusMapping[]) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleStorage = (e: StorageEvent) => {
    if (e.key === MASTER_RUMUS_STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        callback(sanitizeFormulas(parsed));
      } catch {}
    }
  };

  const handleBroadcast = (e: MessageEvent) => {
    if (e.data && e.data.type === 'MASTER_RUMUS_UPDATED' && Array.isArray(e.data.data)) {
      callback(sanitizeFormulas(e.data.data));
    }
  };

  window.addEventListener('storage', handleStorage);
  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcast);
  }

  return () => {
    window.removeEventListener('storage', handleStorage);
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcast);
    }
  };
}

/**
 * Ekspor master rumus ke file JSON
 */
export function exportFormulasToJson(formulas: MasterRumusMapping[]): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(formulas, null, 2));
  const a = document.createElement('a');
  a.setAttribute('href', dataStr);
  a.setAttribute('download', `Master_Rumus_RekapMat_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * Ekspor master rumus ke format CSV
 */
export function exportFormulasToCsv(formulas: MasterRumusMapping[]): void {
  const headers = ['Kode Produk', 'Nama Produk', 'Tipe Rumus', 'Faktor', 'Lebar Master (cm)', 'Spek Lebar (cm)', 'Rumus Custom', 'Satuan', 'Keterangan', 'Kategori'];
  const rows = formulas.map((f) => [
    `"${(f.kode || '').replace(/"/g, '""')}"`,
    `"${(f.namaProduk || '').replace(/"/g, '""')}"`,
    `"${f.tipeRumus}"`,
    f.faktor != null ? f.faktor : '',
    f.lebarMaster != null ? f.lebarMaster : '',
    f.spekLebar != null ? f.spekLebar : '',
    `"${(f.rumusCustom || '').replace(/"/g, '""')}"`,
    `"${(f.satuanHasil || '').replace(/"/g, '""')}"`,
    `"${(f.keterangan || '').replace(/"/g, '""')}"`,
    `"${f.berlakuUntuk || 'Kasa Roll'}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Master_Rumus_RekapMat_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Parsing teks CSV menjadi array MasterRumusMapping
 */
export function parseFormulasFromCsv(csvText: string): MasterRumusMapping[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= 1) return [];

  const parseRow = (line: string): string[] => {
    const res: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        res.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    res.push(cur.trim());
    return res;
  };

  const header = parseRow(lines[0]).map((h) => h.toLowerCase());
  const kodeIdx = header.findIndex((h) => h.includes('kode') || h.includes('code'));
  const namaIdx = header.findIndex((h) => h.includes('nama') || h.includes('product'));
  const tipeIdx = header.findIndex((h) => h.includes('tipe') || h.includes('type'));
  const faktorIdx = header.findIndex((h) => h.includes('faktor') || h.includes('factor'));
  const lebarMIdx = header.findIndex((h) => h.includes('master') || h.includes('lebar master'));
  const spekIdx = header.findIndex((h) => h.includes('spek') || h.includes('lebar produk'));
  const customIdx = header.findIndex((h) => h.includes('custom') || h.includes('rumus custom'));
  const satuanIdx = header.findIndex((h) => h.includes('satuan') || h.includes('unit'));
  const ketIdx = header.findIndex((h) => h.includes('keterangan') || h.includes('note'));

  const result: MasterRumusMapping[] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = parseRow(lines[i]);
    const kode = kodeIdx >= 0 ? row[kodeIdx] : row[0];
    if (!kode) continue;

    const rawTipe = (tipeIdx >= 0 ? row[tipeIdx] : row[2] || 'MULTIPLIER').toUpperCase();
    const tipeRumus = (['MULTIPLIER', 'SLITTING', 'DIVIDER', 'CUSTOM'].includes(rawTipe)
      ? rawTipe
      : 'MULTIPLIER') as MasterRumusMapping['tipeRumus'];

    result.push({
      kode: kode.toUpperCase(),
      namaProduk: namaIdx >= 0 ? row[namaIdx] : undefined,
      tipeRumus,
      faktor: faktorIdx >= 0 && row[faktorIdx] ? Number(row[faktorIdx]) : undefined,
      lebarMaster: lebarMIdx >= 0 && row[lebarMIdx] ? Number(row[lebarMIdx]) : undefined,
      spekLebar: spekIdx >= 0 && row[spekIdx] ? Number(row[spekIdx]) : undefined,
      rumusCustom: customIdx >= 0 ? row[customIdx] : undefined,
      satuanHasil: satuanIdx >= 0 ? row[satuanIdx] : undefined,
      keterangan: ketIdx >= 0 ? row[ketIdx] : undefined,
      berlakuUntuk: 'Kasa Roll',
    });
  }

  return sanitizeFormulas(result);
}
