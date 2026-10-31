export type SumberType = 'MR' | 'OS' | 'SGC' | 'CN' | 'CEKSTOK' | 'PLESTER' | 'SAMBUNG' | string;

export type StatusType = 'Sudah' | 'Belum' | 'Sambung' | 'Kurang' | 'CEKSTOK' | string;

export type FormulaType = 'MULTIPLIER' | 'SLITTING' | 'DIVIDER' | 'CUSTOM';

export interface MasterRumusMapping {
  id?: string;
  kode: string;                // Kode produk target (misal: '8320311RB', 'POLIFIX')
  namaProduk?: string;         // Opsional: pola nama produk (misal: 'POLIFIX')
  tipeRumus: FormulaType;      // 'MULTIPLIER' | 'SLITTING' | 'DIVIDER' | 'CUSTOM'
  faktor?: number;             // Untuk MULTIPLIER (misal 2.7) atau DIVIDER
  lebarMaster?: number;        // Untuk SLITTING (default: 110 cm)
  spekLebar?: number;          // Untuk SLITTING: lebar produk (misal 5, 10, 15, 20 cm)
  rumusCustom?: string;        // Untuk CUSTOM: ekspresi matematika (misal: "qty * 2.7")
  satuanHasil?: string;        // Misal: 'meter', 'roll induk', 'roll'
  keterangan?: string;         // Catatan/alasan perhitungan untuk operator
  berlakuUntuk?: 'Kasa Roll' | 'Semua'; // Default 'Kasa Roll'
}

export interface MaterialRekapRow {
  id: string;
  week: string;
  tanggal: string;
  jenis: string; // e.g. "Kasa Lipat", "Kasa Roll"
  nama: string; // e.g. "24x20 Lebar 20cm", "24x20 (s)", "24x17", "SHQ"
  qty: number;
  hari: string; // e.g. "Senin", "Selasa", "Rabu", "Kamis", "Jumat"
  sumber: SumberType;
  status: StatusType;
  keterangan: string;
  oleh: string;
  waktu: string;
  noMr: string;
  isHighlighted?: boolean;
  planQty?: number;
  formulaApplied?: string;
}

export interface DailyProcessRow {
  id: string;
  no: number;
  kode: string; // e.g. "S0001", "S0003", "S0018", "8320311RE"
  namaProduk: string;
  slitting: number;
  folding: number;
  cutting: number;
  sambung: number;
  inspection: number;
  total: number;
  keterangan: string; // e.g. "24/20 L26 SGC (1); 24/20S (1)", "SISA CUT W1 (1)"
  hari?: string;
  sheetName?: string;
}

export interface DaySummary {
  hari: string;
  tanggal: string;
  totalQty: number;
  qtySudah: number;
  qtyBelum: number;
  qtySambung: number;
  qtyKurang: number;
  itemCount: number;
  completionRate: number;
}

export interface MachineSummary {
  jenis: string;
  totalQty: number;
  qtySudah: number;
  qtyBelum: number;
  itemCount: number;
}

export interface SumberSummary {
  sumber: string;
  totalQty: number;
  itemCount: number;
}

export interface MasterCodeMapping {
  kode: string; // e.g. "8320311RB", "S0791", "S0613"
  bahanBaku: string; // e.g. "Needle Punch", "24/20", "SHQ"
  jenis: 'Kasa Lipat' | 'Kasa Roll';
  catatan?: string;
}

export interface PriorWeekPlanMeta {
  fileName: string;
  uploadedAt: string;
  totalRows: number;
  slittingItemCount: number;
}

export interface FoldingCuttingItem {
  id: string;
  rowId: string;
  sheetName: string;
  hari: string;
  no: number;
  kode: string;
  namaProduk: string;
  folding: number;
  cutting: number;
  slitting: number;
  total: number;
  keterangan: string; // Keterangan asli dari file Excel
  reason: 'only_folding_cutting' | 'has_folding_cutting';
  isIncluded: boolean;
  // Hierarki Kronologis & Deteksi Minggu Sebelumnya
  dayIndex?: number;
  precedenceType?: 'prior_week_slit' | 'ignored_by_slitting' | 'ignored_by_folding' | 'included_folding' | 'included_cutting' | 'manual';
  precedenceReason?: string;
  isPriorWeekSlit?: boolean;
  priorWeekSource?: {
    fileName?: string;
    day?: string;
    slittingQty?: number;
    keterangan?: string;
  };
  recommendedSumber?: 'OS' | 'CEKSTOK' | 'MR';
}
