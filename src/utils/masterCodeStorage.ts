import { MasterCodeMapping } from '../types/material';

export const INITIAL_MASTER_CODES: MasterCodeMapping[] = [
  {
    kode: '8320311RB',
    bahanBaku: 'Needle Punch',
    jenis: 'Kasa Roll',
    catatan: 'Material roll pengerjaan RB (kebutuhan roll dikali 2,7 meter)',
  },
  {
    kode: '8320311RE',
    bahanBaku: 'Needle Punch',
    jenis: 'Kasa Roll',
    catatan: 'Material roll inspection (plan terpisah dari RB, tanpa rumus konversi)',
  },
  {
    kode: '8320314RB',
    bahanBaku: 'Carded Laps 87,5 + Bembliese',
    jenis: 'Kasa Roll',
    catatan: 'Multi-material: Carded Laps 87,5 & Bembliese',
  },
  {
    kode: '8320314RE',
    bahanBaku: 'Carded Laps 87,5 + Bembliese',
    jenis: 'Kasa Roll',
    catatan: 'Material roll inspection (plan terpisah dari RB, tanpa rumus konversi)',
  },
  {
    kode: 'S0791',
    bahanBaku: '24/20',
    jenis: 'Kasa Lipat',
    catatan: 'Kasa standar lipat 24/20',
  },
  {
    kode: 'S0613',
    bahanBaku: 'SHQ',
    jenis: 'Kasa Lipat',
    catatan: 'Kasa kualitas super (SHQ)',
  },
  {
    kode: 'S0001',
    bahanBaku: '24/20 Lebar 20cm',
    jenis: 'Kasa Lipat',
    catatan: 'Sisa cut W1 lebar 20cm',
  },
  {
    kode: 'S0003',
    bahanBaku: '24/20s',
    jenis: 'Kasa Lipat',
    catatan: 'Slit W1 bahan 24/20s',
  },
  {
    kode: 'S0144',
    bahanBaku: '24/20s',
    jenis: 'Kasa Lipat',
    catatan: 'Bahan 24/20s',
  },
  {
    kode: 'S0771',
    bahanBaku: '24/20 Lebar 20cm',
    jenis: 'Kasa Lipat',
    catatan: 'Lebar 20cm',
  },
  {
    kode: 'S0896',
    bahanBaku: '24/20 Lebar 20cm',
    jenis: 'Kasa Lipat',
    catatan: 'Lebar 20cm',
  },
  {
    kode: 'S1030',
    bahanBaku: '24/20s',
    jenis: 'Kasa Lipat',
    catatan: 'Bahan 24/20s',
  },
  {
    kode: 'S2111',
    bahanBaku: '24/20s',
    jenis: 'Kasa Lipat',
    catatan: 'Bahan 24/20s',
  },
  {
    kode: 'S0018',
    bahanBaku: '24/20 Lebar 26cm',
    jenis: 'Kasa Lipat',
    catatan: 'Lebar 26cm',
  },
  {
    kode: 'S0024',
    bahanBaku: '24/20 Lebar 20cm',
    jenis: 'Kasa Lipat',
    catatan: 'Lebar 20cm',
  },
];

export const MASTER_CODE_STORAGE_KEY = 'master_code_mappings_v1';
const BROADCAST_CHANNEL_NAME = 'rekap_master_codes_realtime_v1';

let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  } catch {}
}

/**
 * Memvalidasi dan membersihkan array master code agar selalu valid dan tidak menyebabkan runtime error.
 */
export function sanitizeMasterCodes(data: unknown): MasterCodeMapping[] {
  if (!Array.isArray(data)) return INITIAL_MASTER_CODES;

  const valid: MasterCodeMapping[] = [];
  for (const item of data) {
    if (!item || typeof item !== 'object') continue;

    const raw = item as Record<string, unknown>;
    const rawKode = raw.kode ?? raw.code ?? raw.itemCode ?? raw.productCode ?? '';
    const kode = String(rawKode).trim().toUpperCase();
    if (!kode) continue;

    const rawBahan = raw.bahanBaku ?? raw.bahan ?? raw.material ?? raw.targetBahan ?? '24/20';
    const bahanBaku = String(rawBahan).trim() || '24/20';

    const isRoll = raw.jenis === 'Kasa Roll' || raw.isRoll === true;
    const jenis: 'Kasa Lipat' | 'Kasa Roll' = isRoll ? 'Kasa Roll' : 'Kasa Lipat';

    const catatan = raw.catatan != null && String(raw.catatan).trim() !== ''
      ? String(raw.catatan).trim()
      : undefined;

    valid.push({
      kode,
      bahanBaku,
      jenis,
      catatan,
    });
  }

  if (valid.length === 0) {
    return INITIAL_MASTER_CODES;
  }

  // Hilangkan duplikasi berdasarkan kode produk (ambil yang pertama)
  const seen = new Set<string>();
  const deduped: MasterCodeMapping[] = [];
  for (const item of valid) {
    const key = item.kode.toUpperCase();
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(item);
    }
  }

  return deduped;
}

export function getMasterCodeMappings(): MasterCodeMapping[] {
  if (typeof window === 'undefined') return INITIAL_MASTER_CODES;
  try {
    const raw = localStorage.getItem(MASTER_CODE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const sanitized = sanitizeMasterCodes(parsed);
      if (sanitized && sanitized.length > 0) {
        return sanitized;
      }
    }
  } catch (err) {
    console.warn('Gagal membaca master code mappings dari localStorage:', err);
  }
  return INITIAL_MASTER_CODES;
}

export function saveMasterCodeMappings(mappings: MasterCodeMapping[], broadcast = true): void {
  if (typeof window === 'undefined') return;
  try {
    const sanitized = sanitizeMasterCodes(mappings);
    localStorage.setItem(MASTER_CODE_STORAGE_KEY, JSON.stringify(sanitized));

    if (broadcast && broadcastChannel) {
      try {
        broadcastChannel.postMessage({ type: 'MASTER_CODES_UPDATED', codes: sanitized });
      } catch {}
    }
  } catch (err) {
    console.warn('Gagal menyimpan master code mappings ke localStorage:', err);
  }
}

export function resetMasterCodeMappings(): MasterCodeMapping[] {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(MASTER_CODE_STORAGE_KEY, JSON.stringify(INITIAL_MASTER_CODES));
      if (broadcastChannel) {
        try {
          broadcastChannel.postMessage({ type: 'MASTER_CODES_UPDATED', codes: INITIAL_MASTER_CODES });
        } catch {}
      }
    } catch {}
  }
  return INITIAL_MASTER_CODES;
}

/**
 * Berlangganan event update master code antar tab di browser yang sama secara realtime.
 */
export function subscribeToMasterCodeUpdates(callback: (codes: MasterCodeMapping[]) => void): () => void {
  if (!broadcastChannel) return () => {};

  const listener = (event: MessageEvent) => {
    if (event.data && event.data.type === 'MASTER_CODES_UPDATED' && Array.isArray(event.data.codes)) {
      callback(event.data.codes);
    }
  };

  broadcastChannel.addEventListener('message', listener);
  return () => {
    broadcastChannel?.removeEventListener('message', listener);
  };
}

/**
 * Ekspor Master Kode ke file JSON
 */
export function exportMasterCodesToJson(codes: MasterCodeMapping[], filename = 'master_codes_rekap.json'): void {
  const jsonStr = JSON.stringify(codes, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Ekspor Master Kode ke file CSV (dapat dibuka langsung di Excel)
 */
export function exportMasterCodesToCsv(codes: MasterCodeMapping[], filename = 'master_codes_rekap.csv'): void {
  const headers = ['Kode Produk', 'Bahan Baku', 'Jenis', 'Catatan'];
  const rows = codes.map((c) => [
    `"${(c.kode || '').replace(/"/g, '""')}"`,
    `"${(c.bahanBaku || '').replace(/"/g, '""')}"`,
    `"${(c.jenis || '').replace(/"/g, '""')}"`,
    `"${(c.catatan || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Impor Master Kode dari teks CSV
 */
export function parseMasterCodesFromCsv(csvText: string): MasterCodeMapping[] {
  const lines = csvText.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= 1) return [];

  const result: MasterCodeMapping[] = [];

  // Parse CSV line handling quotes
  const parseLine = (line: string): string[] => {
    const tokens: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if ((char === ',' || char === '\t' || char === ';') && !inQuotes) {
        tokens.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    tokens.push(cur.trim());
    return tokens;
  };

  const headerTokens = parseLine(lines[0]).map((h) => h.toLowerCase());
  const kodeIdx = headerTokens.findIndex((h) => h.includes('kode') || h.includes('code'));
  const bahanIdx = headerTokens.findIndex((h) => h.includes('bahan') || h.includes('material'));
  const jenisIdx = headerTokens.findIndex((h) => h.includes('jenis') || h.includes('type'));
  const catIdx = headerTokens.findIndex((h) => h.includes('catatan') || h.includes('note') || h.includes('keterangan'));

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    if (cols.length < 2) continue;

    const kode = (kodeIdx >= 0 ? cols[kodeIdx] : cols[0]) || '';
    const bahan = (bahanIdx >= 0 ? cols[bahanIdx] : cols[1]) || '24/20';
    const jenisRaw = (jenisIdx >= 0 ? cols[jenisIdx] : cols[2]) || 'Kasa Lipat';
    const catatan = (catIdx >= 0 ? cols[catIdx] : cols[3]) || undefined;

    if (!kode.trim()) continue;

    result.push({
      kode: kode.trim().toUpperCase(),
      bahanBaku: bahan.trim() || '24/20',
      jenis: jenisRaw.toLowerCase().includes('roll') ? 'Kasa Roll' : 'Kasa Lipat',
      catatan: catatan ? catatan.trim() : undefined,
    });
  }

  return sanitizeMasterCodes(result);
}
