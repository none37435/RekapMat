import { FormulaType, MasterRumusMapping } from '../types/material';

/**
 * Evaluasi ekspresi matematika sederhana secara aman tanpa eval() berbahaya.
 */
function safeEvalArithmetic(expr: string, qty: number): number {
  try {
    // Ganti 'qty' dengan angka
    let sanitized = expr.toLowerCase().replace(/qty/g, String(qty));
    // Hanya izinkan angka, titik, koma, spasi, dan operator +, -, *, /, (, )
    sanitized = sanitized.replace(/,/g, '.');
    if (!/^[0-9\.\s\+\-\*\/\(\)]+$/.test(sanitized)) {
      return qty;
    }
    // Menggunakan Function constructor dengan scope terbatas untuk kalkulasi murni
    const fn = new Function(`"use strict"; return (${sanitized});`);
    const res = Number(fn());
    return isNaN(res) || !isFinite(res) ? qty : res;
  } catch {
    return qty;
  }
}

export interface FormulaCalculationResult {
  qtyBahan: number;
  qtyPlan: number;
  rumusText: string;
  satuan: string;
  tipeRumus: FormulaType;
}

/**
 * Menghitung konversi Qty Plan menjadi Kebutuhan Qty Bahan Baku riil berdasarkan Master Rumus.
 */
export function calculateFormulaQty(
  qtyPlan: number,
  formula: MasterRumusMapping
): FormulaCalculationResult {
  const plan = Number(qtyPlan) || 0;
  let qtyBahan = plan;
  let rumusText = '';
  const satuan = formula.satuanHasil || (formula.tipeRumus === 'MULTIPLIER' ? 'meter' : 'roll');

  switch (formula.tipeRumus) {
    case 'MULTIPLIER': {
      const faktor = Number(formula.faktor) || 1;
      qtyBahan = plan * faktor;
      rumusText = `${plan} × ${faktor} = ${formatNumber(qtyBahan)} ${satuan}`;
      break;
    }

    case 'SLITTING': {
      const lebarMaster = Number(formula.lebarMaster) || 110;
      const spek = Number(formula.spekLebar) || 10;
      const cutsPerRoll = spek > 0 ? lebarMaster / spek : 1;
      qtyBahan = cutsPerRoll > 0 ? plan / cutsPerRoll : plan;
      rumusText = `${plan} / (${lebarMaster}/${spek}) = ${plan} / ${formatNumber(cutsPerRoll)} = ${formatNumber(qtyBahan)} ${satuan}`;
      break;
    }

    case 'DIVIDER': {
      const faktor = Number(formula.faktor) || 1;
      qtyBahan = faktor > 0 ? plan / faktor : plan;
      rumusText = `${plan} / ${faktor} = ${formatNumber(qtyBahan)} ${satuan}`;
      break;
    }

    case 'RATIO': {
      const batch = Number(formula.batchRoll) || 110;
      const ratio = Number(formula.ratioQty) || 1;
      qtyBahan = batch > 0 ? (plan * ratio) / batch : plan;
      rumusText = `(${plan} × ${ratio}) / ${batch} = ${formatNumber(qtyBahan)} ${satuan}`;
      break;
    }

    case 'CUSTOM': {
      if (formula.rumusCustom && formula.rumusCustom.trim()) {
        qtyBahan = safeEvalArithmetic(formula.rumusCustom, plan);
        rumusText = `[${formula.rumusCustom.replace(/qty/gi, String(plan))}] = ${formatNumber(qtyBahan)} ${satuan}`;
      } else {
        qtyBahan = plan;
        rumusText = `${plan} ${satuan}`;
      }
      break;
    }

    default:
      qtyBahan = plan;
      rumusText = `${plan} ${satuan}`;
  }

  // Bulatkan ke 2 desimal jika pecahan
  const rounded = Math.round((qtyBahan + Number.EPSILON) * 100) / 100;

  return {
    qtyBahan: rounded,
    qtyPlan: plan,
    rumusText,
    satuan,
    tipeRumus: formula.tipeRumus,
  };
}

/**
 * Format angka untuk tampilan (jika bulat tampilkan bulat, jika pecahan maksimal 2 desimal)
 */
export function formatNumber(num: number): string {
  if (Number.isInteger(num)) return num.toString();
  return num.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function matchesTargetBahan(formulaTargetBahan?: string, itemBahan?: string): boolean {
  if (!formulaTargetBahan || !formulaTargetBahan.trim()) return true;
  if (!itemBahan || !itemBahan.trim()) return false;
  const f = formulaTargetBahan.trim().toUpperCase();
  const b = itemBahan.trim().toUpperCase();
  return b.includes(f) || f.includes(b);
}

/**
 * Mencari rumus yang cocok untuk kode produk atau nama produk tertentu.
 * Khusus diberlakukan untuk kategori Kasa Roll secara default.
 * Mendukung filter spesifik bahan baku (targetBahan) untuk produk multi-material seperti 8320314RB.
 */
export function findMatchingFormula(
  kode: string,
  namaProduk: string,
  jenis: string,
  formulas: MasterRumusMapping[],
  targetBahan?: string
): MasterRumusMapping | undefined {
  if (!Array.isArray(formulas) || formulas.length === 0) return undefined;

  const isRoll = (jenis || '').toLowerCase().includes('roll');
  const cleanKode = (kode || '').trim().toUpperCase();
  const cleanNama = (namaProduk || '').trim().toUpperCase();

  // 8320311RE, 8320314RE, 8320311SB, 8320314SB, inspection mandiri, serta proses Sambung Wrapper adalah proses terpisah (tidak diimplementasikan rumus)
  if (
    cleanKode === '8320311RE' ||
    cleanKode === '8320314RE' ||
    cleanKode === '8320311SB' ||
    cleanKode === '8320314SB' ||
    cleanKode.endsWith('RE') ||
    cleanKode.endsWith('SB') ||
    cleanKode.includes('(INSPECTION)') ||
    cleanKode.includes('(SAMBUNG)') ||
    cleanKode.includes('(WRAPPER)') ||
    cleanNama.includes('8320311RE') ||
    cleanNama.includes('8320314RE') ||
    cleanNama.includes('8320311SB') ||
    cleanNama.includes('8320314SB') ||
    cleanNama.includes('INSPECTION') ||
    cleanNama.includes('SAMBUNG') ||
    cleanNama.includes('WRAPPER')
  ) {
    return undefined;
  }

  // 1. Cek kecocokan kode spesifik (Exact Code Match) dengan prioritas spesifik bahan (targetBahan)
  if (cleanKode) {
    const codeCandidates = formulas.filter((f) => {
      if (!f || !f.kode) return false;
      const targetKode = f.kode.trim().toUpperCase();
      if (targetKode !== cleanKode) return false;
      if (f.berlakuUntuk === 'Kasa Roll' && !isRoll) return false;
      return true;
    });

    if (codeCandidates.length > 0) {
      // Jika ada targetBahan dan formula yang spesifik bahan, pilih yang cocok
      if (targetBahan && targetBahan.trim()) {
        const specificBahanMatch = codeCandidates.find(
          (f) => f.targetBahan && matchesTargetBahan(f.targetBahan, targetBahan)
        );
        if (specificBahanMatch) return specificBahanMatch;
      }

      // Jika tidak ada yang spesifik bahan atau tidak ada targetBahan, ambil formula tanpa targetBahan
      const fallbackGeneral = codeCandidates.find((f) => !f.targetBahan || !f.targetBahan.trim());
      if (fallbackGeneral) return fallbackGeneral;

      // Jika semuanya memiliki targetBahan tapi tidak ada yang cocok dengan targetBahan saat ini
      if (targetBahan) {
        return undefined;
      }
      return codeCandidates[0];
    }
  }

  // 2. Cek kecocokan nama produk atau pola (misal: "POLIFIX")
  const patternMatch = formulas.find((f) => {
    if (!f) return false;
    if (f.berlakuUntuk === 'Kasa Roll' && !isRoll) return false;

    // Rumus kode spesifik (seperti 8320311RB / 8320314RB) tidak boleh dicocokkan secara parsial ke kode/nama lain
    const targetKode = (f.kode || '').trim().toUpperCase();
    if (targetKode.startsWith('8320311') || targetKode.startsWith('8320314')) return false;

    // Cek kecocokan target bahan jika ada
    if (targetBahan && f.targetBahan && !matchesTargetBahan(f.targetBahan, targetBahan)) {
      return false;
    }

    // Cek apakah f.kode cocok sebagai keyword di namaProduk
    const keyword = (f.kode || f.namaProduk || '').trim().toUpperCase();
    if (!keyword) return false;

    if (cleanNama.includes(keyword) || cleanKode.includes(keyword)) {
      // Jika tipe slitting dan ada spek spesifik, pastikan spek lebarnya cocok jika ada
      if (f.tipeRumus === 'SLITTING' && f.spekLebar) {
        const spekStr = String(f.spekLebar);
        // Cek apakah teks mengandung spek lebar (misal "10" atau "10CM" atau "5")
        const regex = new RegExp(`(^|[^0-9])${spekStr}(cm|mm|\\s|$)`, 'i');
        if (regex.test(cleanNama) || regex.test(cleanKode)) {
          return true;
        }
        return false;
      }
      return true;
    }
    return false;
  });

  return patternMatch;
}
