import * as XLSX from 'xlsx';
import { DailyProcessRow, MaterialRekapRow, StatusType, SumberType, MasterCodeMapping, MasterRumusMapping, FoldingCuttingItem } from '../types/material';
import { getMasterCodeMappings } from './masterCodeStorage';
import { findMatchingFormula, calculateFormulaQty } from './formulaCalculator';
import { getFormulaMappings } from './formulaStorage';

export interface SheetParseDetail {
  sheetName: string;
  dayName: string;
  rowCount: number;
  processRows: DailyProcessRow[];
  rawProcessRows?: DailyProcessRow[];
  materialRows: MaterialRekapRow[];
  detectedFoldingCutting?: FoldingCuttingItem[];
}

export interface ParseResult {
  fileType: 'dailyProcess' | 'materialRekap' | 'unknown';
  sheets: string[];
  activeSheet: string;
  isMultiSheet?: boolean;
  sheetDetails?: SheetParseDetail[];
  dailyProcessRows?: DailyProcessRow[];
  rawProcessRows?: DailyProcessRow[];
  materialRekapRows?: MaterialRekapRow[];
  generatedMaterialRows?: MaterialRekapRow[];
  detectedFoldingCutting?: FoldingCuttingItem[];
  error?: string;
}

// Normalizer to sanitize header text
function normalizeHeader(val: unknown): string {
  if (!val) return '';
  return String(val).toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function getDayNameFromSheet(sheetName: string, index = 0): string {
  const norm = sheetName.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (norm.includes('senin') || norm.includes('mon')) return 'Senin';
  if (norm.includes('selasa') || norm.includes('tue')) return 'Selasa';
  if (norm.includes('rabu') || norm.includes('wed')) return 'Rabu';
  if (norm.includes('kamis') || norm.includes('thu')) return 'Kamis';
  if (norm.includes('jumat') || norm.includes('fri')) return 'Jumat';
  if (norm.includes('sabtu') || norm.includes('sat')) return 'Sabtu';

  const defaultDays = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return defaultDays[index % defaultDays.length];
}

export function getCurrentWeekString(dateInput: Date = new Date()): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[dateInput.getMonth()];
  const dayOfMonth = dateInput.getDate();
  const weekNum = Math.min(5, Math.max(1, Math.ceil(dayOfMonth / 7)));
  return `${month}-W${weekNum}`;
}

export interface ExtractedMaterialItem {
  bahanBaku: string;
  qty: number;
  kode: string;
  isRoll: boolean;
  planQty?: number;
  formulaNote?: string;
  isInspection?: boolean;
  isSambung?: boolean;
}

/**
 * Ekstraksi spesifikasi lebar dinamis (contoh: L8, L19, L28, L26, L18, L20, LEBAR 8, LEBAR 19, dll.)
 */
function extractWidthSpecification(text: string): string | null {
  if (!text) return null;
  // Cocokkan pola seperti L8, L19, L28, L26, L18, LEBAR 8, LEBAR 19, L 28, dll.
  const match = text.match(/\b(?:LEBAR|L)\s*(\d+(?:[.,]\d+)?)\s*(?:CM)?\b/i);
  if (match && match[1]) {
    return match[1].replace(',', '.');
  }
  return null;
}

/**
 * Ekstraksi spesifikasi khusus kasa WINCH (misal: "SHQ WINCH (1)", "SHQ WINCH (2)", "SHQ WINCH", dll.)
 * Memastikan kain kasa dengan proses mesin Winch terpisah dari kasa SHQ standar.
 */
export function extractWinchSpecification(text: string): string | null {
  if (!text) return null;
  const upper = text.toUpperCase();
  if (!upper.includes('WINCH')) return null;

  // Cek apakah ada nomor varian / spesifikasi setelah WINCH: misal (1), (2), 1, 2, dll.
  const match = upper.match(/WINCH\s*(?:\(\s*(\d+)\s*\)|(\d+))/i);
  const num = match ? (match[1] || match[2]) : null;

  if (upper.includes('24/20') && !upper.includes('SHQ')) {
    return num ? `24/20 WINCH (${num})` : '24/20 WINCH';
  }

  return num ? `SHQ WINCH (${num})` : 'SHQ WINCH';
}

/**
 * Parser bahan baku spesifik per segmen teks.
 * Memastikan ciri bahan kasa lebar (24/17 L8, 24/20 L19, 24/20 L28, dll.) terbaca spesifik dan akurat.
 * Kode yang tidak ada di master kode otomatis berjenis 'Kasa Lipat'.
 */
function parseSingleMaterialSegment(
  rawText: string,
  totalQty: number,
  kode: string,
  namaProd: string
): ExtractedMaterialItem {
  const text = rawText.toUpperCase().trim();
  const width = extractWidthSpecification(text);

  // 1. Needle Punch / Punch
  if (text.includes('NEEDLE PUNCH') || text.includes('NEDDLE PUNCH') || text.includes('8320311')) {
    return {
      bahanBaku: 'Needle Punch',
      qty: totalQty,
      kode,
      isRoll: true,
    };
  }

  // 2. Carded Laps
  if (text.includes('CARDED LAPS') || text.includes('CARDED')) {
    return {
      bahanBaku: 'Carded laps 87,5',
      qty: totalQty,
      kode,
      isRoll: true,
    };
  }

  // 3. Spread Non Woven
  if (text.includes('SPREAD NON WOVEN') || text.includes('NON WOVEN')) {
    return {
      bahanBaku: 'Spread Non Woven',
      qty: totalQty,
      kode,
      isRoll: true,
    };
  }

  // 4. SHQ WINCH (Spek khusus kasa WINCH: misal "SHQ WINCH (1)", "SHQ WINCH (2)", "SHQ WINCH")
  const winchSpec = extractWinchSpecification(text) || extractWinchSpecification(namaProd);
  if (winchSpec) {
    const isExplicitRoll = namaProd.includes('ROLL') || namaProd.includes('POLIBAN') || namaProd.includes('DRC');
    return {
      bahanBaku: winchSpec,
      qty: totalQty,
      kode,
      isRoll: isExplicitRoll, // Default Kasa Lipat
    };
  }

  // 5. SHQ Standar
  if (text.includes('SHQ')) {
    const isExplicitRoll = namaProd.includes('ROLL') || namaProd.includes('POLIBAN') || namaProd.includes('DRC');
    return {
      bahanBaku: 'SHQ',
      qty: totalQty,
      kode,
      isRoll: isExplicitRoll, // Default Kasa Lipat
    };
  }

  // 5. 24/20 X-Ray
  if (text.includes('XRAY') || text.includes('X-RAY')) {
    return {
      bahanBaku: '24/20 Xray',
      qty: totalQty,
      kode,
      isRoll: true,
    };
  }

  // 6. 24/17 dengan spesifikasi lebar dinamis (24/17 L8, 24/17 L18, 24/17 L28, dll.)
  if (text.includes('24/17') || text.includes('24X17') || text.includes('24 17')) {
    let bahan = '24/17';
    if (width) {
      bahan = `24/17 Lebar ${width}cm`;
    }
    const isExplicitRoll = namaProd.includes('ROLL') || namaProd.includes('POLIBAN');
    return {
      bahanBaku: bahan,
      qty: totalQty,
      kode,
      isRoll: isExplicitRoll, // Default Kasa Lipat
    };
  }

  // 7. 24/20s (varian 's' / slit w1)
  if (
    text.includes('24/20S') ||
    text.includes('24/20 (S)') ||
    text.includes('24/20 (s)') ||
    text.includes('24/20 S') ||
    text.includes('SLIT W1')
  ) {
    const isExplicitRoll = namaProd.includes('ROLL') || namaProd.includes('POLIBAN');
    return {
      bahanBaku: '24/20s',
      qty: totalQty,
      kode,
      isRoll: isExplicitRoll, // Default Kasa Lipat
    };
  }

  // 8. 24/20 dengan spesifikasi lebar dinamis (24/20 L19, 24/20 L28, 24/20 L26, 24/20 L8, dll.)
  if (text.includes('24/20') || text.includes('24X20') || text.includes('24 20')) {
    let bahan = '24/20';
    if (width) {
      bahan = `24/20 Lebar ${width}cm`;
    } else if (text.includes('S0771') || text.includes('SISA CUT') || text.includes('SISA SLIT')) {
      bahan = '24/20 Lebar 20cm';
    }
    const isExplicitRoll = namaProd.includes('ROLL') || namaProd.includes('POLIBAN');
    return {
      bahanBaku: bahan,
      qty: totalQty,
      kode,
      isRoll: isExplicitRoll, // Default Kasa Lipat
    };
  }

  // 9. Jika hanya ada indikasi Lebar L... tanpa menyebut 24/17 atau 24/20 (misal: "L8", "L19", "L28")
  if (width) {
    const isExplicitRoll = namaProd.includes('ROLL') || namaProd.includes('POLIBAN');
    return {
      bahanBaku: `24/20 Lebar ${width}cm`,
      qty: totalQty,
      kode,
      isRoll: isExplicitRoll, // Default Kasa Lipat
    };
  }

  // 10. Default Produk Kasa Manufaktur:
  // KODE YANG TIDAK ADA DI MASTER KODE OTOMATIS BERJENIS 'KASA LIPAT'
  const isExplicitRoll = namaProd.includes('ROLL') || namaProd.includes('POLIBAN') || namaProd.includes('DRC');
  return {
    bahanBaku: '24/20',
    qty: totalQty,
    kode,
    isRoll: isExplicitRoll, // Otomatis Kasa Lipat jika tidak ada kata spesifik ROLL/POLIBAN
  };
}

/**
 * Ekstraksi Bahan Baku murni (24/20, 24/20s, SHQ, Needle Punch, 24/17, dll.) dari baris pengerjaan.
 * Prioritas 1: Master Code Mapping (8320311RB -> Needle Punch, S0791 -> 24/20, S0613 -> SHQ, dll.)
 * Prioritas 2: Analisis teks dinamis (lebar L8, L19, L28, dll. terbaca presisi).
 * Kode yang tidak ada di master kode otomatis berjenis 'Kasa Lipat'.
 */
export function extractMaterialItemsFromProcessRow(
  proc: DailyProcessRow,
  masterMappings?: MasterCodeMapping[],
  formulaMappings?: MasterRumusMapping[]
): ExtractedMaterialItem[] {
  const mappings = masterMappings || getMasterCodeMappings();
  const formulas = formulaMappings || getFormulaMappings();
  const ket = (proc.keterangan || '').trim();
  const namaProd = (proc.namaProduk || '').trim().toUpperCase();
  const kode = (proc.kode || '').trim();
  const total = Number(proc.total) || (
    Number(proc.slitting || 0) +
    Number(proc.folding || 0) +
    Number(proc.cutting || 0) +
    Number(proc.sambung || 0) +
    Number(proc.inspection || 0)
  ) || 0;

  // Analisis porsi inspection vs sambung wrapper vs prior week sisa slit vs produksi
  const rawInspection = Number(proc.inspection) || 0;
  const rawSambung = Number(proc.sambung) || 0;
  const rawSlitting = Number(proc.slitting) || 0;
  const rawFolding = Number(proc.folding) || 0;
  const rawCutting = Number(proc.cutting) || 0;

  const isExplicitInspection =
    namaProd.includes('INSPECTION') ||
    namaProd.includes('INSP') ||
    ket.toUpperCase().includes('INSPECTION') ||
    ket.toUpperCase().includes('INSP') ||
    kode.toUpperCase().endsWith('RE');

  const isExplicitSambung =
    namaProd.includes('SAMBUNG') ||
    namaProd.includes('WRAPPER') ||
    ket.toUpperCase().includes('SAMBUNG') ||
    ket.toUpperCase().includes('WRAPPER');

  // Deteksi rujukan sisa slit/cut week lalu (misal: "SLIT W4 (1)", "SISA SLIT W1")
  const priorRef = parsePriorWeekReference(ket, namaProd);

  let qtyInspection = 0;
  let qtySambung = 0;
  let qtyProduksi = 0;

  if (isExplicitSambung) {
    // Jika dari nama produk atau keterangan spesifik adalah Sambung Wrapper
    qtySambung = total;
    qtyProduksi = 0;
    qtyInspection = 0;
  } else if (isExplicitInspection) {
    // Jika dari nama produk, keterangan, atau kode jelas merupakan inspection (misal: 8320311RE)
    qtyInspection = total;
    qtyProduksi = 0;
    qtySambung = 0;
  } else {
    // Jika baris pekerjaan memiliki rujukan sisa slit week lalu (misal: "SLIT W4") dan ada proses folding/cutting:
    // Bagian folding/cutting tersebut menggunakan sisa roll yang sudah ada (bukan bahan baru dari gudang).
    // Jika baris ini juga memiliki proses Slitting, maka bahan mentah yang ditarik HANYA porsi slitting-nya saja!
    if (priorRef.isMatch && (rawFolding > 0 || rawCutting > 0)) {
      qtyInspection = rawInspection;
      qtySambung = rawSambung;
      qtyProduksi = rawSlitting; // Murni porsi slitting yang membutuhkan bahan baku baru!
    } else {
      const effectiveTotal = Math.max(
        total,
        rawSlitting + rawFolding + rawCutting + rawSambung + rawInspection
      );
      qtyInspection = Math.min(effectiveTotal, rawInspection);
      const remAfterInsp = Math.max(0, effectiveTotal - qtyInspection);
      qtySambung = Math.min(remAfterInsp, rawSambung);
      qtyProduksi = Math.max(0, remAfterInsp - qtySambung);
    }
  }

  // Helper untuk menerapkan rumus perhitungan konversi jika item adalah Kasa Roll
  const applyFormula = (items: ExtractedMaterialItem[]): ExtractedMaterialItem[] => {
    return items.map((item) => {
      // Jika item adalah proses inspection, JANGAN terapkan rumus (1:1 murni)
      if (item.isInspection) {
        return {
          ...item,
          planQty: item.qty,
          formulaNote: 'Inspection (1:1 tanpa rumus konversi)',
        };
      }

      // Jika item adalah proses Sambung Wrapper, JANGAN terapkan rumus (1:1 murni)
      if (item.isSambung) {
        return {
          ...item,
          planQty: item.qty,
          formulaNote: 'Sambung Wrapper (1:1 tanpa rumus konversi)',
        };
      }

      if (item.isRoll) {
        // Cari rumus yang cocok dengan kode, namaProduk, jenis, dan targetBahan spesifik!
        const matched = findMatchingFormula(
          item.kode || kode,
          proc.namaProduk,
          'Kasa Roll',
          formulas,
          item.bahanBaku
        );
        if (matched) {
          const calc = calculateFormulaQty(item.qty, matched);
          return {
            ...item,
            planQty: item.qty,
            qty: calc.qtyBahan,
            formulaNote: `${item.kode || kode || 'Roll'}: ${calc.rumusText}`,
          };
        }
      }
      return item;
    });
  };

  // Helper untuk memecah daftar bahan menjadi item produksi, sambung wrapper, dan inspection
  const createSubItemsForBahan = (
    bahanList: string[],
    isRoll: boolean,
    sourceKode: string
  ): ExtractedMaterialItem[] => {
    const res: ExtractedMaterialItem[] = [];

    // 1. Porsi produksi normal (slitting, cutting, roll)
    if (qtyProduksi > 0) {
      for (const b of bahanList) {
        res.push({
          bahanBaku: b,
          qty: qtyProduksi,
          kode: sourceKode,
          isRoll,
          isInspection: false,
          isSambung: false,
        });
      }
    }

    // 2. Porsi sambung wrapper (terpisah, 1:1 tanpa rumus konversi)
    if (qtySambung > 0) {
      const sambungKode = sourceKode
        ? (sourceKode.toUpperCase().includes('SAMBUNG') ? sourceKode : `${sourceKode} (Sambung)`)
        : 'SAMBUNG WRAPPER';

      for (const b of bahanList) {
        res.push({
          bahanBaku: b,
          qty: qtySambung,
          kode: sambungKode,
          isRoll,
          isInspection: false,
          isSambung: true,
        });
      }
    }

    // 3. Porsi inspection (otomatis dipisahkan; misal 8320311RB dialihkan ke 8320311RE)
    if (qtyInspection > 0) {
      const inspKode = sourceKode.toUpperCase().endsWith('RB')
        ? sourceKode.replace(/RB$/i, 'RE')
        : (sourceKode ? `${sourceKode} (Insp)` : 'INSPECTION');

      for (const b of bahanList) {
        res.push({
          bahanBaku: b,
          qty: qtyInspection,
          kode: inspKode,
          isRoll,
          isInspection: true,
          isSambung: false,
        });
      }
    }

    return res;
  };

  // PRIORITAS 1: Cek Master Code Mapping (Sistem Master Data)
  if (kode) {
    const cleanKode = kode.toUpperCase().replace(/\s+/g, '');
    const matchedMasters = mappings.filter(
      (m) => m && m.kode && m.kode.toUpperCase().replace(/\s+/g, '') === cleanKode
    );
    if (matchedMasters.length > 0) {
      const items: ExtractedMaterialItem[] = [];
      const combinedText = `${ket} ${namaProd} ${kode}`.trim();
      const winchSpec = extractWinchSpecification(combinedText);

      for (const matched of matchedMasters) {
        // Mendukung multi bahan dalam satu teks (misal: "Carded Laps 87,5 + Bembliese" atau ";", "&", " dan ")
        const rawBahan = matched.bahanBaku || '';
        const parts = rawBahan.split(/[\+;&]|\s+dan\s+/i).map((p) => p.trim()).filter(Boolean);
        let bahanList = parts.length > 0 ? parts : [rawBahan.trim() || '24/20'];

        // Jika baris pekerjaan memiliki spek khusus WINCH (misal: "SHQ WINCH (1)"),
        // ganti bahan 'SHQ' standar dengan spek khusus WINCH tersebut agar tidak tercampur!
        if (winchSpec) {
          bahanList = bahanList.map((b) => (b.trim().toUpperCase() === 'SHQ' ? winchSpec : b));
        }

        const subItems = createSubItemsForBahan(bahanList, matched.jenis === 'Kasa Roll', kode);
        items.push(...subItems);
      }
      if (items.length > 0) {
        return applyFormula(items);
      }
    }
  }

  // PRIORITAS 2: Cek keterangan gabungan dengan pemisah titik koma, contoh: "24/20S (1); SLIT W4 (1)" atau "24/20 L26 SGC (1); 24/20S (1)"
  if (ket.includes(';')) {
    const parts = ket.split(';').map((p) => p.trim()).filter(Boolean);
    const subItems: ExtractedMaterialItem[] = [];

    // Cek apakah ada bagian dari keterangan yang merujuk pada sisa slit/cut week sebelumnya (misal: "SLIT W4 (1)", "SISA SLIT W1")
    const hasPriorSlitPart = parts.some((p) => parsePriorWeekReference(p, '').isMatch);

    for (const part of parts) {
      // 1. Jika bagian ini adalah rujukan sisa slit/cut week sebelumnya (misal: "SLIT W4 (1)"),
      // bagian ini untuk mesin folding/cutting dan BUKAN bahan mentah baru yang perlu ditarik dari gudang.
      const partPrior = parsePriorWeekReference(part, '');
      if (partPrior.isMatch) {
        continue; // Lewati dari tarikan rekap material baru!
      }

      const pUpper = part.toUpperCase();
      let subQty = qtyProduksi;

      // 2. Alokasi kuantitas jika ada proses khusus
      if (hasPriorSlitPart && rawSlitting > 0) {
        // Jika bagian lain adalah sisa slit (untuk folding), maka bagian bahan mentah ini khusus untuk slitting
        subQty = rawSlitting;
      } else if (pUpper.includes('L26') || pUpper.includes('CUT')) {
        if (rawCutting > 0) subQty = rawCutting;
      } else if (pUpper.includes('24/20S')) {
        if (rawSlitting > 0) subQty = rawSlitting;
      }

      const parsed = parseSingleMaterialSegment(part, subQty, kode, namaProd);
      const items = createSubItemsForBahan([parsed.bahanBaku], parsed.isRoll, kode);
      subItems.push(...(items.length > 0 ? items : [parsed]));
    }
    if (subItems.length > 0) return applyFormula(subItems);
  }

  // PRIORITAS 3: Analisis teks gabungan keterangan + nama produk + kode
  const combinedText = `${ket} ${namaProd} ${kode}`.trim();
  const parsedItem = parseSingleMaterialSegment(combinedText, qtyProduksi, kode, namaProd);
  const items = createSubItemsForBahan([parsedItem.bahanBaku], parsedItem.isRoll, kode);
  return applyFormula(items.length > 0 ? items : [parsedItem]);
}

let globalRowCounter = 0;
export function generateUniqueRowId(prefix = 'mat'): string {
  globalRowCounter += 1;
  const rand = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${Date.now()}-${globalRowCounter}-${rand}`;
}

/**
 * Mengelompokkan baris pengerjaan harian menjadi Rekap Material Mesin.
 * Mengelompokkan per Bahan Baku, per Hari pengerjaan, dan memisahkan proses Inspection.
 */
export function autoConvertProcessToRekap(
  processRows: DailyProcessRow[],
  defaultDayOrSheetName = 'Senin',
  masterMappings?: MasterCodeMapping[],
  formulaMappings?: MasterRumusMapping[]
): MaterialRekapRow[] {
  const todayStr = new Date().toISOString().slice(0, 10);
  const currentWeek = getCurrentWeekString();
  const mappings = masterMappings || getMasterCodeMappings();
  const formulas = formulaMappings || getFormulaMappings();

  // Mengelompokkan berdasarkan Bahan Baku + Jenis + Hari + Inspection + Sambung
  const groups = new Map<string, {
    bahanBaku: string;
    isRoll: boolean;
    hari: string;
    totalQty: number;
    codes: string[];
    planQty: number;
    formulaNotes: string[];
    isInspection?: boolean;
    isSambung?: boolean;
  }>();

  for (const proc of processRows) {
    const rowDay = proc.hari || getDayNameFromSheet(proc.sheetName || defaultDayOrSheetName);
    const extractedList = extractMaterialItemsFromProcessRow(proc, mappings, formulas);

    for (const item of extractedList) {
      // Pisahkan baris inspection dan sambung wrapper agar kuantitasnya tidak tercampur dengan kuantitas meter roll produksi
      const inspKey = item.isInspection ? '_insp' : '';
      const sambungKey = item.isSambung ? '_sambung' : '';
      const key = `${item.bahanBaku}_${item.isRoll ? 'roll' : 'lipat'}_${rowDay}${inspKey}${sambungKey}`;
      if (!groups.has(key)) {
        groups.set(key, {
          bahanBaku: item.bahanBaku,
          isRoll: !!item.isRoll,
          hari: rowDay,
          totalQty: item.qty,
          codes: item.kode ? [item.kode] : [],
          planQty: item.planQty ?? item.qty,
          formulaNotes: item.formulaNote ? [item.formulaNote] : [],
          isInspection: item.isInspection,
          isSambung: item.isSambung,
        });
      } else {
        const existing = groups.get(key)!;
        existing.totalQty += item.qty;
        existing.planQty += (item.planQty ?? item.qty);
        if (item.kode && !existing.codes.includes(item.kode)) {
          existing.codes.push(item.kode);
        }
        if (item.formulaNote && !existing.formulaNotes.includes(item.formulaNote)) {
          existing.formulaNotes.push(item.formulaNote);
        }
      }
    }
  }

  const result: MaterialRekapRow[] = [];
  let index = 1;

  groups.forEach((g) => {
    const safeHari = (g.hari || 'senin').toLowerCase().replace(/[^a-z0-9]/g, '');
    const roundedQty = Math.round((g.totalQty + Number.EPSILON) * 100) / 100;
    const roundedPlan = Math.round((g.planQty + Number.EPSILON) * 100) / 100;
    const rawCodes = g.codes.filter(Boolean).join(', ');
    const noteSuffix = g.formulaNotes.length > 0 ? ` [📐 ${g.formulaNotes.join('; ')}]` : '';

    // Label nama jelas sesuai proses
    let displayName = g.bahanBaku;
    if (g.isInspection && !displayName.toLowerCase().includes('inspection')) {
      displayName = `${displayName} (Inspection)`;
    } else if (g.isSambung && !displayName.toLowerCase().includes('sambung') && !displayName.toLowerCase().includes('wrapper')) {
      displayName = `${displayName} (Sambung Wrapper)`;
    }

    const rowSumber: SumberType = g.isSambung ? 'SAMBUNG' : 'MR';
    const rowStatus: StatusType = g.isSambung ? 'Sambung' : 'Belum';

    result.push({
      id: generateUniqueRowId(`rekap-mat-${safeHari}-${index++}`),
      week: currentWeek,
      tanggal: todayStr,
      jenis: g.isRoll ? 'Kasa Roll' : 'Kasa Lipat',
      nama: displayName, // BAHAN BAKU
      qty: roundedQty, // Total kuantitas bahan hasil perhitungan rumus
      hari: g.hari, // Hari pengerjaan (Senin, Selasa, dll.)
      sumber: rowSumber, // DEFAULT SAMBUNG jika sambung wrapper, selain itu MR
      status: rowStatus, // DEFAULT Sambung jika sambung wrapper, selain itu Belum
      keterangan: rawCodes + noteSuffix, // KODE PRODUK + CATATAN RUMUS
      oleh: '',
      waktu: '',
      noMr: '',
      isHighlighted: false,
      planQty: roundedPlan,
      formulaApplied: g.formulaNotes.length > 0 ? g.formulaNotes.join('; ') : undefined,
      isInspection: g.isInspection,
      isSambung: g.isSambung,
    });
  });

  return result;
}

export function getDayIndex(dayName: string): number {
  const d = (dayName || '').toLowerCase().trim();
  if (d.includes('senin') || d.includes('mon')) return 1;
  if (d.includes('selasa') || d.includes('tue')) return 2;
  if (d.includes('rabu') || d.includes('wed')) return 3;
  if (d.includes('kamis') || d.includes('thu')) return 4;
  if (d.includes('jumat') || d.includes('fri')) return 5;
  if (d.includes('sabtu') || d.includes('sat')) return 6;
  if (d.includes('minggu') || d.includes('sun')) return 7;
  return 1;
}

export function parsePriorWeekReference(keterangan: string, namaProduk: string): {
  isMatch: boolean;
  refText: string;
  sourceCode?: string;
} {
  const text = `${keterangan || ''} ${namaProduk || ''}`.toUpperCase().trim();
  if (!text) return { isMatch: false, refText: '' };

  // Pola 1: SISA SLIT DARI KODE / SISA SLIT S0771 / SLIT S0771 W1 / SISA DARI S0018
  const codeMatch = text.match(/(?:SISA\s+)?(?:SLIT|CUT)?\s*(?:DARI\s*(?:KODE\s*)?)?([S0-9][A-Z0-9]+)\s*(?:[-/ ]*(W\d+|WK\d+|WEEK\s*\d+|MINGGU\s*\d+))?/i);
  if (codeMatch && codeMatch[1]) {
    const rawMatch = codeMatch[1].trim();
    if (
      rawMatch.length >= 3 &&
      !rawMatch.startsWith('W') &&
      !rawMatch.startsWith('L2') &&
      !rawMatch.startsWith('L1') &&
      !rawMatch.startsWith('24') &&
      !['ROLL', 'KASA', 'NEEDLE', 'PUNCH', 'SHQ'].includes(rawMatch)
    ) {
      const weekPart = codeMatch[2] ? ` (${codeMatch[2].replace(/\s+/g, '')})` : '';
      return {
        isMatch: true,
        refText: `Sisa Slit dari Kode ${rawMatch}${weekPart}`,
        sourceCode: rawMatch,
      };
    }
  }

  // Pola 2: DENGAN KATA "SISA" + WEEK (SISA SLIT W1, SISA CUT W1, SISA W1, SISA W2, SISA CUT, dll.)
  const sisaWeekMatch = text.match(/SISA\s+(?:SLIT|CUT|SLITTING|CUTTING|FOLD|FOLDING)?\s*[-/]?\s*\(?\s*(W\s*\d+|WK\s*\d+|WEEK\s*\d+|MINGGU\s*\d+)\s*\)?/i);
  if (sisaWeekMatch && sisaWeekMatch[1]) {
    const w = sisaWeekMatch[1].replace(/\s+/g, '');
    return {
      isMatch: true,
      refText: `Sisa Slit ${w}`,
    };
  }

  // Pola 3: TANPA KATA "SISA" (Slit w1, Cut w1, Slit w2, Cut w2, Slitting w1, Cutting w1, Fold w1, dll.)
  // Parameter pengabaian sesuai instruksi user:
  // "tambahkan parameter pengabaian jika ada keterangan Slit w1 / Cut w1 ataupun sejenisnya meskipun tanpa kalimat SISA itu berarti dikerjakan pada week sebelumnya"
  const weekProcessMatch = text.match(/\b(?:SLIT|SLITTING|CUT|CUTTING|FOLD|FOLDING|ROLL)\s*[-/]?\s*\(?\s*(W\s*\d+|WK\s*\d+|WEEK\s*\d+|MINGGU\s*\d+)\s*\)?/i);
  if (weekProcessMatch && weekProcessMatch[1]) {
    const w = weekProcessMatch[1].replace(/\s+/g, '');
    let processType = 'Slit';
    if (/CUT|CUTTING/i.test(weekProcessMatch[0])) processType = 'Cut';
    else if (/FOLD|FOLDING/i.test(weekProcessMatch[0])) processType = 'Folding';
    return {
      isMatch: true,
      refText: `${processType} ${w} (Week Lalu)`,
    };
  }

  // Pola 3b: Bentuk nempel (SLITW1, CUTW1, SLITW2, CUTW2, FOLDW1, dll.)
  const gluedMatch = text.match(/\b(SLIT|CUT|SLITTING|CUTTING|FOLD|FOLDING)(W\d+|WK\d+)\b/i);
  if (gluedMatch && gluedMatch[2]) {
    const processType = gluedMatch[1].toUpperCase().startsWith('CUT') ? 'Cut' : 'Slit';
    return {
      isMatch: true,
      refText: `${processType} ${gluedMatch[2]} (Week Lalu)`,
    };
  }

  // Pola 3c: Urutan terbalik (W1 SLIT, W1 CUT, W2 SLIT, dll.)
  const reverseMatch = text.match(/\b(W\s*\d+|WK\s*\d+|WEEK\s*\d+|MINGGU\s*\d+)\s*[-/]?\s*(?:SLIT|SLITTING|CUT|CUTTING)\b/i);
  if (reverseMatch && reverseMatch[1]) {
    const w = reverseMatch[1].replace(/\s+/g, '');
    return {
      isMatch: true,
      refText: `Slit ${w} (Week Lalu)`,
    };
  }

  // Pola 4: SISA SLIT / SISA CUT umum
  if (text.includes('SISA SLIT') || text.includes('SISA CUT')) {
    return {
      isMatch: true,
      refText: 'Sisa Slit Sebelumnya',
    };
  }

  return { isMatch: false, refText: '' };
}

/**
 * Ekstraksi item yang memiliki pengerjaan Folding atau Cutting dari file Excel.
 * Menerapkan:
 * 1. Cross-Week Matcher dari file jadwal minggu sebelumnya (priorWeekRows)
 * 2. Regex Parser pola teks keterangan (SISA SLIT W1, SISA KODE)
 * 3. Logika Kronologis Aliran Hari (Hari Slitting <= Hari Folding/Cutting)
 */
export function extractFoldingCuttingItems(
  rows: DailyProcessRow[],
  priorWeekRows?: DailyProcessRow[],
  priorWeekFileName?: string
): FoldingCuttingItem[] {
  const items: FoldingCuttingItem[] = [];

  // Peta data Slitting minggu lalu per clean code
  const priorSlittingMap = new Map<string, DailyProcessRow[]>();
  if (Array.isArray(priorWeekRows)) {
    for (const pr of priorWeekRows) {
      if (Number(pr.slitting || 0) > 0 && pr.kode) {
        const clean = pr.kode.toUpperCase().replace(/\s+/g, '');
        if (!priorSlittingMap.has(clean)) {
          priorSlittingMap.set(clean, []);
        }
        priorSlittingMap.get(clean)!.push(pr);
      }
    }
  }

  for (const r of rows) {
    const fVal = Number(r.folding) || 0;
    const cVal = Number(r.cutting) || 0;
    const sVal = Number(r.slitting) || 0;

    if (fVal > 0 || cVal > 0) {
      const isOnlyFC = sVal === 0 && (Number(r.sambung) || 0) === 0 && (Number(r.inspection) || 0) === 0;
      const cleanKode = (r.kode || '').toUpperCase().replace(/\s+/g, '');
      const currentDayIdx = getDayIndex(r.hari || r.sheetName || 'senin');
      const currentDayName = r.hari || 'Senin';

      // 1. Cek Jalur A: Apakah ada di data Slitting file minggu lalu?
      const matchedPriorList = cleanKode ? priorSlittingMap.get(cleanKode) : undefined;
      const hasPriorWeekSlit = Boolean(matchedPriorList && matchedPriorList.length > 0);

      // 2. Cek Jalur B: Apakah teks keterangan mengandung "SISA SLIT W1 / DARI KODE"?
      const textRef = parsePriorWeekReference(r.keterangan || '', r.namaProduk || '');

      // 3. Cek Jalur C: Riwayat Slitting & Folding di minggu ini (Hari <= currentDayIdx)
      const priorOrSameDaySlits = rows.filter((other) => {
        if (!cleanKode) return false;
        const otherClean = (other.kode || '').toUpperCase().replace(/\s+/g, '');
        if (otherClean !== cleanKode) return false;
        const otherDayIdx = getDayIndex(other.hari || other.sheetName || 'senin');
        return otherDayIdx <= currentDayIdx && Number(other.slitting || 0) > 0;
      });

      const priorOrSameDayFolds = rows.filter((other) => {
        if (!cleanKode) return false;
        const otherClean = (other.kode || '').toUpperCase().replace(/\s+/g, '');
        if (otherClean !== cleanKode) return false;
        const otherDayIdx = getDayIndex(other.hari || other.sheetName || 'senin');
        return otherDayIdx <= currentDayIdx && Number(other.folding || 0) > 0;
      });

      let isIncluded = false;
      let precedenceType: FoldingCuttingItem['precedenceType'] = 'ignored_by_slitting';
      let precedenceReason = '';
      let isPriorWeekSlit = false;
      let priorWeekSource: FoldingCuttingItem['priorWeekSource'] = undefined;
      let recommendedSumber: FoldingCuttingItem['recommendedSumber'] = undefined;

      if (hasPriorWeekSlit && matchedPriorList) {
        const topPrior = matchedPriorList[0];
        isPriorWeekSlit = true;
        isIncluded = false; // Diabaikan dari tarikan bahan mentah baru
        precedenceType = 'prior_week_slit';
        recommendedSumber = 'OS';
        priorWeekSource = {
          fileName: priorWeekFileName || 'File Minggu Lalu',
          day: topPrior.hari || topPrior.sheetName || 'W-Prev',
          slittingQty: Number(topPrior.slitting) || 0,
          keterangan: topPrior.keterangan || undefined,
        };
        precedenceReason = `Terhubung file minggu lalu (${topPrior.hari || 'W1'} - Slitting ${(Number(topPrior.slitting) || 0).toLocaleString('id-ID')}). Bahan sudah ada di palet transit.`;
      } else if (textRef.isMatch) {
        isPriorWeekSlit = true;
        isIncluded = false; // Diabaikan dari tarikan bahan mentah baru
        precedenceType = 'prior_week_slit';
        recommendedSumber = 'OS';
        precedenceReason = `Keterangan mendeteksi "${textRef.refText}". Dikerjakan pada week sebelumnya (bahan sudah ditarik di stasiun hulu).`;
      } else {
        // Evaluasi kronologis pengerjaan minggu berjalan
        if (fVal > 0) {
          if (priorOrSameDaySlits.length > 0) {
            const firstSlit = priorOrSameDaySlits[0];
            isIncluded = false;
            precedenceType = 'ignored_by_slitting';
            precedenceReason = `Diabaikan: Kode ini sudah memiliki proses Slitting di hari ${firstSlit.hari || 'sebelumnya'} (Bahan ditarik di stasiun Slitting).`;
          } else {
            isIncluded = true;
            precedenceType = 'included_folding';
            precedenceReason = `Disertakan: Belum ada proses Slitting untuk kode ini hingga hari ${currentDayName}. Bahan wajib ditarik untuk Folding.`;
          }
        } else if (cVal > 0) {
          if (priorOrSameDaySlits.length > 0) {
            const firstSlit = priorOrSameDaySlits[0];
            isIncluded = false;
            precedenceType = 'ignored_by_slitting';
            precedenceReason = `Diabaikan: Kode ini sudah melalui proses Slitting di hari ${firstSlit.hari || 'sebelumnya'}.`;
          } else if (priorOrSameDayFolds.length > 0) {
            const firstFold = priorOrSameDayFolds[0];
            isIncluded = false;
            precedenceType = 'ignored_by_folding';
            precedenceReason = `Diabaikan: Kode ini sudah melalui proses Folding di hari ${firstFold.hari || 'sebelumnya'}.`;
          } else {
            isIncluded = true;
            precedenceType = 'included_cutting';
            precedenceReason = `Disertakan: Pengerjaan Cutting murni tanpa Slitting/Folding sebelumnya.`;
          }
        }
      }

      items.push({
        id: `fc-${r.id}`,
        rowId: r.id,
        sheetName: r.sheetName || '',
        hari: currentDayName,
        dayIndex: currentDayIdx,
        no: r.no,
        kode: r.kode,
        namaProduk: r.namaProduk,
        folding: fVal,
        cutting: cVal,
        slitting: sVal,
        total: fVal + cVal,
        keterangan: r.keterangan || '-',
        reason: isOnlyFC ? 'only_folding_cutting' : 'has_folding_cutting',
        isIncluded,
        precedenceType,
        precedenceReason,
        isPriorWeekSlit,
        priorWeekSource,
        recommendedSumber,
      });
    }
  }

  return items;
}

/**
 * Filter baris rencana proses berdasarkan keputusan user terhadap bagian Folding & Cutting.
 * Secara bawaan (isIncluded: false):
 * - Baris yang hanya memiliki proses folding/cutting diabaikan secara penuh.
 * - Baris campuran (memiliki slitting) dinolkan kolom folding & cutting-nya serta total dihitung ulang.
 */
export function filterProcessRowsByFoldingCutting(
  allRawRows: DailyProcessRow[],
  fcItems: FoldingCuttingItem[]
): DailyProcessRow[] {
  const fcMap = new Map<string, FoldingCuttingItem>();
  for (const item of fcItems) {
    fcMap.set(item.rowId, item);
  }

  const result: DailyProcessRow[] = [];

  for (const raw of allRawRows) {
    const fc = fcMap.get(raw.id);
    if (!fc) {
      // Tidak mengandung folding atau cutting: selalu sertakan apa adanya
      result.push({ ...raw });
    } else {
      if (fc.isIncluded) {
        // User telah memutuskan untuk MENYERTAKAN bagian folding/cutting ini
        result.push({ ...raw });
      } else {
        // User membiarkannya DIABAIKAN (DEFAULT)
        if (fc.reason === 'only_folding_cutting') {
          // Hanya ada proses folding/cutting, abaikan seluruh baris ini
          continue;
        } else {
          // Baris gabungan (ada slitting dll): nolkan folding & cutting
          const nonFCTotal = (Number(raw.slitting) || 0) + (Number(raw.sambung) || 0) + (Number(raw.inspection) || 0);
          result.push({
            ...raw,
            folding: 0,
            cutting: 0,
            total: nonFCTotal,
          });
        }
      }
    }
  }

  return result;
}

/**
 * Parsing satu sheet spesifik dari workbook Excel.
 */
function parseSingleSheet(
  worksheet: XLSX.WorkSheet,
  sheetName: string,
  sheetIndex: number,
  masterMappings?: MasterCodeMapping[]
): {
  isProcess: boolean;
  processRows: DailyProcessRow[];
  rawProcessRows: DailyProcessRow[];
  materialRows: MaterialRekapRow[];
  detectedFoldingCutting: FoldingCuttingItem[];
} {
  const rawData: (string | number | undefined)[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  if (!rawData || rawData.length === 0) {
    return { isProcess: false, processRows: [], rawProcessRows: [], materialRows: [], detectedFoldingCutting: [] };
  }

  // Scan up to row 10 to find table headers
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(10, rawData.length); i++) {
    const row = rawData[i].map(normalizeHeader);
    if (
      row.includes('kode') ||
      row.includes('namaproduk') ||
      row.includes('nama') ||
      row.includes('slitting') ||
      row.includes('folding') ||
      row.includes('cutting') ||
      row.includes('jenis') ||
      row.includes('sumber') ||
      row.includes('status')
    ) {
      headerRowIndex = i;
      break;
    }
  }

  const headers = rawData[headerRowIndex].map(h => String(h || '').trim());
  const normalized = headers.map(normalizeHeader);

  const colIdx = {
    no: normalized.findIndex(h => h === 'no' || h === 'nomor'),
    kode: normalized.findIndex(h => h === 'kode' || h === 'kodeproduk' || h.includes('kode')),
    nama: normalized.findIndex(h => h.includes('namaproduk') || h.includes('nama') || h.includes('item')),
    slitting: normalized.findIndex(h => h.includes('slitting') || h.includes('rolling')),
    folding: normalized.findIndex(h => h.includes('folding')),
    cutting: normalized.findIndex(h => h.includes('cutting')),
    sambung: normalized.findIndex(h => h.includes('sambung') || h.includes('wrapper')),
    inspection: normalized.findIndex(h => h.includes('inspection') || h.includes('qc')),
    total: normalized.findIndex(h => h === 'total' || h.includes('total') || h === 'qty' || h.includes('qty')),
    keterangan: normalized.findIndex(h => h.includes('keterangan') || h.includes('ket') || h.includes('note')),
  };

  const dayName = getDayNameFromSheet(sheetName, sheetIndex);
  const processRows: DailyProcessRow[] = [];

  for (let r = headerRowIndex + 1; r < rawData.length; r++) {
    const row = rawData[r];
    if (!row || row.length === 0) continue;

    const kodeVal = colIdx.kode !== -1 ? String(row[colIdx.kode] ?? '').trim() : '';
    const namaVal = colIdx.nama !== -1 ? String(row[colIdx.nama] ?? '').trim() : '';

    if (!kodeVal && !namaVal) continue;
    if (namaVal.toLowerCase().includes('total') || kodeVal.toLowerCase().includes('total')) continue;

    const slittingVal = colIdx.slitting !== -1 ? (Number(row[colIdx.slitting]) || 0) : 0;
    const foldingVal = colIdx.folding !== -1 ? (Number(row[colIdx.folding]) || 0) : 0;
    const cuttingVal = colIdx.cutting !== -1 ? (Number(row[colIdx.cutting]) || 0) : 0;
    const sambungVal = colIdx.sambung !== -1 ? (Number(row[colIdx.sambung]) || 0) : 0;
    const inspectVal = colIdx.inspection !== -1 ? (Number(row[colIdx.inspection]) || 0) : 0;
    const totalColVal = colIdx.total !== -1 ? Number(row[colIdx.total]) : NaN;
    const calcTotal = !isNaN(totalColVal) && totalColVal > 0 ? totalColVal : (slittingVal + foldingVal + cuttingVal + sambungVal + inspectVal);

    processRows.push({
      id: generateUniqueRowId(`proc-${sheetName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}-${r}`),
      no: (colIdx.no !== -1 && Number(row[colIdx.no])) ? Number(row[colIdx.no]) : (processRows.length + 1),
      kode: kodeVal,
      namaProduk: namaVal,
      slitting: slittingVal,
      folding: foldingVal,
      cutting: cuttingVal,
      sambung: sambungVal,
      inspection: inspectVal,
      total: calcTotal,
      keterangan: colIdx.keterangan !== -1 ? String(row[colIdx.keterangan] ?? '').trim() : '',
      hari: dayName,
      sheetName: sheetName,
    });
  }

  // Deteksi item folding & cutting
  const detectedFC = extractFoldingCuttingItems(processRows);
  // Filter secara bawaan (folding & cutting diabaikan)
  const defaultFiltered = filterProcessRowsByFoldingCutting(processRows, detectedFC);
  const generatedRekap = autoConvertProcessToRekap(defaultFiltered, sheetName, masterMappings);

  return {
    isProcess: processRows.length > 0,
    processRows: defaultFiltered,
    rawProcessRows: processRows,
    materialRows: generatedRekap,
    detectedFoldingCutting: detectedFC,
  };
}

/**
 * Parsing multi-sheet Excel workbook.
 * Mendukung pembacaan semua sheet harian sekaligus (Senin s/d Jumat) secara otomatis.
 * Secara default mengabaikan bagian folding dan cutting, namun mendeteksi seluruhnya untuk user review.
 */
export function parseExcelWorkbook(
  workbook: XLSX.WorkBook,
  masterMappings?: MasterCodeMapping[],
  priorWeekRows?: DailyProcessRow[],
  priorWeekFileName?: string
): ParseResult {
  const sheetNames = workbook.SheetNames;
  if (!sheetNames || sheetNames.length === 0) {
    return { fileType: 'unknown', sheets: [], activeSheet: '', error: 'File Excel tidak memiliki lembar kerja (sheet).' };
  }

  const sheetDetails: SheetParseDetail[] = [];
  const allRawProcessRows: DailyProcessRow[] = [];

  for (let i = 0; i < sheetNames.length; i++) {
    const sName = sheetNames[i];
    const ws = workbook.Sheets[sName];
    if (!ws) continue;

    const parsed = parseSingleSheet(ws, sName, i, masterMappings);
    if (parsed.rawProcessRows.length > 0) {
      const dayName = getDayNameFromSheet(sName, i);
      sheetDetails.push({
        sheetName: sName,
        dayName,
        rowCount: parsed.rawProcessRows.length,
        processRows: parsed.rawProcessRows,
        rawProcessRows: parsed.rawProcessRows,
        materialRows: parsed.materialRows,
        detectedFoldingCutting: [],
      });

      allRawProcessRows.push(...parsed.rawProcessRows);
    }
  }

  if (sheetDetails.length === 0) {
    return {
      fileType: 'unknown',
      sheets: sheetNames,
      activeSheet: sheetNames[0],
      error: 'Tidak ditemukan data tabel rencana proses pada lembar kerja file Excel ini.',
    };
  }

  // Deteksi gabungan seluruh sheet secara kronologis mingguan & cross-week matching
  const allDetectedFC = extractFoldingCuttingItems(allRawProcessRows, priorWeekRows, priorWeekFileName);

  // Perbarui sheetDetails dengan FC dan filtered rows masing-masing
  for (const detail of sheetDetails) {
    detail.detectedFoldingCutting = allDetectedFC.filter((fc) => fc.sheetName === detail.sheetName);
    detail.processRows = filterProcessRowsByFoldingCutting(detail.rawProcessRows || [], detail.detectedFoldingCutting);
    detail.materialRows = autoConvertProcessToRekap(detail.processRows, detail.sheetName, masterMappings);
    detail.rowCount = detail.processRows.length;
  }

  // Filter gabungan semua sheet
  const allDefaultFiltered = filterProcessRowsByFoldingCutting(allRawProcessRows, allDetectedFC);
  const aggregatedMaterialRows = autoConvertProcessToRekap(allDefaultFiltered, 'Semua Lembar', masterMappings);
  const activeSheet = sheetNames.length > 1 ? 'Semua Lembar (Multi-Sheets)' : sheetNames[0];

  return {
    fileType: 'dailyProcess',
    sheets: sheetNames,
    activeSheet,
    isMultiSheet: sheetNames.length > 1,
    sheetDetails,
    dailyProcessRows: allDefaultFiltered,
    rawProcessRows: allRawProcessRows,
    generatedMaterialRows: aggregatedMaterialRows,
    detectedFoldingCutting: allDetectedFC,
  };
}

export function parsePastedTabularData(
  text: string,
  masterMappings?: MasterCodeMapping[],
  priorWeekRows?: DailyProcessRow[],
  priorWeekFileName?: string
): ParseResult {
  const lines = text.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) {
    return { fileType: 'unknown', sheets: [], activeSheet: '', error: 'Teks yang ditempel kosong.' };
  }

  const rawRows = lines.map(line => line.split('\t'));
  const header = rawRows[0].map(normalizeHeader);

  const colIdx = {
    no: header.findIndex(h => h === 'no' || h === 'nomor'),
    kode: header.findIndex(h => h === 'kode' || h === 'kodeproduk' || h.includes('kode')),
    nama: header.findIndex(h => h.includes('nama') || h.includes('produk') || h.includes('item')),
    slitting: header.findIndex(h => h.includes('slitting') || h.includes('rolling')),
    folding: header.findIndex(h => h.includes('folding')),
    cutting: header.findIndex(h => h.includes('cutting')),
    sambung: header.findIndex(h => h.includes('sambung') || h.includes('wrapper')),
    inspection: header.findIndex(h => h.includes('inspection') || h.includes('qc')),
    total: header.findIndex(h => h === 'total' || h.includes('total') || h === 'qty' || h.includes('qty')),
    keterangan: header.findIndex(h => h.includes('keterangan') || h.includes('ket') || h.includes('note')),
  };

  const processRows: DailyProcessRow[] = [];
  for (let i = 1; i < rawRows.length; i++) {
    const cols = rawRows[i];
    if (cols.length < 2) continue;

    const kodeVal = colIdx.kode !== -1 ? String(cols[colIdx.kode] || '').trim() : String(cols[1] || '').trim();
    const namaVal = colIdx.nama !== -1 ? String(cols[colIdx.nama] || '').trim() : String(cols[2] || '').trim();
    if (!kodeVal && !namaVal) continue;

    const slittingVal = colIdx.slitting !== -1 ? (Number(cols[colIdx.slitting]) || 0) : (Number(cols[3]) || 0);
    const foldingVal = colIdx.folding !== -1 ? (Number(cols[colIdx.folding]) || 0) : (Number(cols[4]) || 0);
    const cuttingVal = colIdx.cutting !== -1 ? (Number(cols[colIdx.cutting]) || 0) : (Number(cols[5]) || 0);
    const sambungVal = colIdx.sambung !== -1 ? (Number(cols[colIdx.sambung]) || 0) : (Number(cols[6]) || 0);
    const inspectVal = colIdx.inspection !== -1 ? (Number(cols[colIdx.inspection]) || 0) : (Number(cols[7]) || 0);
    const totalVal = colIdx.total !== -1 ? (Number(cols[colIdx.total]) || 0) : (slittingVal + foldingVal + cuttingVal + sambungVal + inspectVal);
    const ketVal = colIdx.keterangan !== -1 ? String(cols[colIdx.keterangan] || '').trim() : String(cols[9] || '').trim();

    processRows.push({
      id: `paste-proc-${i}`,
      no: i,
      kode: kodeVal,
      namaProduk: namaVal,
      slitting: slittingVal,
      folding: foldingVal,
      cutting: cuttingVal,
      sambung: sambungVal,
      inspection: inspectVal,
      total: totalVal,
      keterangan: ketVal,
      hari: 'Senin',
      sheetName: 'Clipboard Paste',
    });
  }

  const detectedFC = extractFoldingCuttingItems(processRows, priorWeekRows, priorWeekFileName);
  const defaultFiltered = filterProcessRowsByFoldingCutting(processRows, detectedFC);
  const generatedMaterial = autoConvertProcessToRekap(defaultFiltered, 'Senin', masterMappings);

  return {
    fileType: 'dailyProcess',
    sheets: ['Clipboard Paste'],
    activeSheet: 'Clipboard Paste',
    dailyProcessRows: defaultFiltered,
    rawProcessRows: processRows,
    generatedMaterialRows: generatedMaterial,
    detectedFoldingCutting: detectedFC,
  };
}


export function exportToExcel(
  materialRows: MaterialRekapRow[],
  processRows: DailyProcessRow[],
  mode: 'material' | 'process' | 'both',
  filenamePrefix = 'REKAP_MATERIAL_MESIN'
): void {
  const wb = XLSX.utils.book_new();

  if (mode === 'material' || mode === 'both') {
    const matData = materialRows.map(r => ({
      'Week': r.week,
      'Tanggal': r.tanggal,
      'jenis': r.jenis,
      'nama': r.nama, // Bahan baku (24/20, 24/20s, SHQ, dll.)
      'qty': r.qty,
      'hari': r.hari,
      'sumber': r.sumber,
      'status': r.status,
      'keterangan': r.keterangan, // Kode-kode produk yang membutuhkan bahan tersebut
      'Oleh': r.oleh,
      'Waktu': r.waktu,
      'No. MR': r.noMr,
    }));
    const matSheet = XLSX.utils.json_to_sheet(matData);
    XLSX.utils.book_append_sheet(wb, matSheet, 'REKAP MATERIAL');
  }

  if (mode === 'process' || mode === 'both') {
    const procData = processRows.map(p => ({
      'No': p.no,
      'Kode': p.kode,
      'Nama Produk': p.namaProduk,
      'Slitting / Rolling Poliban': p.slitting,
      'Folding Mesin': p.folding,
      'Cutting': p.cutting,
      'Sambung Wrapper': p.sambung,
      'Inspection': p.inspection,
      'Total': p.total,
      'Keterangan': p.keterangan,
      'Hari': p.hari || '',
      'Sheet': p.sheetName || '',
    }));
    const procSheet = XLSX.utils.json_to_sheet(procData);
    XLSX.utils.book_append_sheet(wb, procSheet, 'RENCANA PROSES HARIAN');
  }

  const dateStamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${filenamePrefix}_${dateStamp}.xlsx`);
}
