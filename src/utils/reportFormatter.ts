import { DaySummary, MaterialRekapRow } from '../types/material';

export function generateWhatsAppShiftReport(
  materials: MaterialRekapRow[],
  activeDay: string,
  operatorName = 'Admin / Operator Mesin'
): string {
  const dayRows = materials.filter(m => activeDay === 'Semua' || m.hari.toLowerCase() === activeDay.toLowerCase());
  const totalQty = dayRows.reduce((acc, curr) => acc + (curr.qty || 0), 0);
  const sudahRows = dayRows.filter(m => m.status === 'Sudah');
  const qtySudah = sudahRows.reduce((acc, curr) => acc + (curr.qty || 0), 0);
  const belumRows = dayRows.filter(m => m.status === 'Belum' || m.status === 'Kurang');
  const qtyBelum = belumRows.reduce((acc, curr) => acc + (curr.qty || 0), 0);
  const sambungRows = dayRows.filter(m => m.status === 'Sambung');
  const qtySambung = sambungRows.reduce((acc, curr) => acc + (curr.qty || 0), 0);

  const pct = totalQty > 0 ? Math.round((qtySudah / totalQty) * 100) : 0;
  const dateStr = dayRows[0]?.tanggal || new Date().toISOString().slice(0, 10);

  let text = `*📋 LAPORAN REKAP MATERIAL & JADWAL PRODUKSI MESIN*\n`;
  text += `📅 Tanggal: ${dateStr} (${activeDay})\n`;
  text += `👤 PIC/Oleh: ${operatorName}\n`;
  text += `-------------------------------------------\n`;
  text += `📊 *RINGKASAN PROGRES:*\n`;
  text += `• Total Target Qty : *${totalQty.toLocaleString('id-ID')}* pcs/meter\n`;
  text += `• Selesai (Sudah)  : *${qtySudah.toLocaleString('id-ID')}* (${pct}%)\n`;
  text += `• Sambung          : *${qtySambung.toLocaleString('id-ID')}*\n`;
  text += `• Pending (Belum)  : *${qtyBelum.toLocaleString('id-ID')}*\n`;
  text += `-------------------------------------------\n`;

  if (belumRows.length > 0) {
    text += `⚠️ *PERHATIAN / OUTSTANDING MATERIAL (BELUM):*\n`;
    belumRows.forEach((item, idx) => {
      const mrTag = item.noMr ? ` [${item.noMr}]` : ' [No MR Belum Terbit]';
      const locTag = item.keterangan ? ` - (${item.keterangan})` : '';
      text += `${idx + 1}. ${item.nama} | ${item.qty.toLocaleString('id-ID')} | Sumber: ${item.sumber}${mrTag}${locTag}\n`;
    });
    text += `-------------------------------------------\n`;
  }

  text += `Mohon tim gudang & shift selanjutnya mengonfirmasi ketersediaan palet. Terima kasih! 🙏`;

  return text;
}
