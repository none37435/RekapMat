import React, { useState } from 'react';
import { MaterialRekapRow, DaySummary, MachineSummary, SumberSummary } from '../types/material';
import { generateWhatsAppShiftReport } from '../utils/reportFormatter';
import { Copy, Check, Share2, AlertTriangle, Calendar, Layers, CheckCircle2 } from 'lucide-react';

interface ScheduleSummaryProps {
  materials: MaterialRekapRow[];
  activeDayFilter: string;
}

export const ScheduleSummary: React.FC<ScheduleSummaryProps> = ({ materials, activeDayFilter }) => {
  const [copied, setCopied] = useState(false);
  const [operatorName, setOperatorName] = useState('Dian / Tim Admin Mesin');

  // Days breakdown
  const daysList = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const daySummaries: DaySummary[] = daysList.map((day) => {
    const dayRows = materials.filter(m => m.hari.toLowerCase() === day.toLowerCase());
    const totalQty = dayRows.reduce((a, b) => a + (b.qty || 0), 0);
    const qtySudah = dayRows.filter(m => m.status === 'Sudah').reduce((a, b) => a + (b.qty || 0), 0);
    const qtyBelum = dayRows.filter(m => m.status === 'Belum').reduce((a, b) => a + (b.qty || 0), 0);
    const qtySambung = dayRows.filter(m => m.status === 'Sambung').reduce((a, b) => a + (b.qty || 0), 0);
    const qtyKurang = dayRows.filter(m => m.status === 'Kurang').reduce((a, b) => a + (b.qty || 0), 0);
    const date = dayRows[0]?.tanggal || '-';
    const completionRate = totalQty > 0 ? Math.round((qtySudah / totalQty) * 100) : 0;

    return {
      hari: day,
      tanggal: date,
      totalQty,
      qtySudah,
      qtyBelum,
      qtySambung,
      qtyKurang,
      itemCount: dayRows.length,
      completionRate,
    };
  });

  // Machine breakdown
  const machineTypes = ['Kasa Lipat', 'Kasa Roll'];
  const machineSummaries: MachineSummary[] = machineTypes.map((jenis) => {
    const rows = materials.filter(m => m.jenis === jenis);
    const totalQty = rows.reduce((a, b) => a + (b.qty || 0), 0);
    const qtySudah = rows.filter(m => m.status === 'Sudah').reduce((a, b) => a + (b.qty || 0), 0);
    const qtyBelum = rows.filter(m => m.status === 'Belum' || m.status === 'Kurang').reduce((a, b) => a + (b.qty || 0), 0);
    return {
      jenis,
      totalQty,
      qtySudah,
      qtyBelum,
      itemCount: rows.length,
    };
  });

  // Sumber breakdown
  const sumberList = ['SGC', 'MR', 'PLESTER', 'SAMBUNG', 'OS', 'CN', 'CEKSTOK'];
  const sumberSummaries: SumberSummary[] = sumberList.map((s) => {
    const rows = materials.filter(m => m.sumber === s);
    return {
      sumber: s,
      totalQty: rows.reduce((a, b) => a + (b.qty || 0), 0),
      itemCount: rows.length,
    };
  }).filter(s => s.itemCount > 0);

  // Outstanding list
  const outstandingList = materials.filter(m => m.status === 'Belum' || m.status === 'Kurang');

  const handleCopyReport = () => {
    const reportText = generateWhatsAppShiftReport(materials, activeDayFilter, operatorName);
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (materials.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-12 text-center">
        <div className="w-14 h-14 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-200">
          <Calendar className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">
          Belum Ada Data untuk Direkapitulasi
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Rekapitulasi otomatis akan muncul di sini setelah Anda mengunggah file Excel rencana harian atau menambahkan baris material.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* WhatsApp Report Banner & Quick Copy */}
      <div className="bg-emerald-900 text-white rounded-xl p-5 shadow-sm border border-emerald-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-1">
              <Share2 className="w-4 h-4" />
              Laporan Serah Terima Shift Otomatis (WhatsApp Ready)
            </div>
            <h3 className="text-base font-bold text-white">
              Salin Ringkasan Rekapitulasi untuk Grup Koordinasi Shift Pabrik
            </h3>
            <p className="text-xs text-emerald-200 mt-0.5">
              Format baku terstruktur mencakup total kuantitas pengerjaan, status penyelesaian, dan daftar item tertunda beserta No. MR.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <input
              type="text"
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              placeholder="Nama PIC/Operator..."
              className="px-3 py-1.5 text-xs bg-emerald-800 border border-emerald-700 text-white rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-400 placeholder:text-emerald-400"
            />
            <button
              onClick={handleCopyReport}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold bg-white text-emerald-950 rounded-lg hover:bg-emerald-50 transition-colors shadow-xs"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Tersalin ke Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-emerald-700" />
                  <span>Salin Format Laporan (WA)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Grid 1: Rekap Harian Otomatis */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900">
              Rekapitulasi Kebutuhan & Progres Harian (Senin - Sabtu)
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {materials.length} total baris jadwal
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Hari & Tanggal</th>
                <th className="py-2.5 px-3 text-right">Target Kuantitas (Qty)</th>
                <th className="py-2.5 px-3 text-right text-emerald-800">Selesai (Sudah)</th>
                <th className="py-2.5 px-3 text-right text-sky-800">Sambung</th>
                <th className="py-2.5 px-3 text-right text-rose-800">Pending (Belum/Kurang)</th>
                <th className="py-2.5 px-3 text-center">Persentase Selesai</th>
                <th className="py-2.5 px-3 text-center">Item</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {daySummaries.map((ds) => (
                <tr key={ds.hari} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                    {ds.hari} <span className="text-slate-500 font-normal font-mono">({ds.tanggal})</span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-slate-900">
                    {ds.totalQty.toLocaleString('id-ID')}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-700 font-semibold">
                    {ds.qtySudah.toLocaleString('id-ID')}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-sky-700">
                    {ds.qtySambung.toLocaleString('id-ID')}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-rose-700 font-semibold">
                    {(ds.qtyBelum + ds.qtyKurang).toLocaleString('id-ID')}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-20 bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-600 h-2 rounded-full"
                          style={{ width: `${ds.completionRate}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs font-semibold text-slate-700 w-8 text-right">
                        {ds.completionRate}%
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-500 font-mono">
                    {ds.itemCount} baris
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100/90 font-bold border-t-2 border-slate-300 text-slate-900">
              <tr>
                <td className="py-3 px-3 uppercase tracking-wider text-xs">Total Mingguan:</td>
                <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-950 text-sm">
                  {materials.reduce((a, b) => a + (b.qty || 0), 0).toLocaleString('id-ID')}
                </td>
                <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-800">
                  {materials.filter(m => m.status === 'Sudah').reduce((a, b) => a + (b.qty || 0), 0).toLocaleString('id-ID')}
                </td>
                <td className="py-3 px-3 text-right font-mono tabular-nums text-sky-800">
                  {materials.filter(m => m.status === 'Sambung').reduce((a, b) => a + (b.qty || 0), 0).toLocaleString('id-ID')}
                </td>
                <td className="py-3 px-3 text-right font-mono tabular-nums text-rose-800">
                  {materials.filter(m => m.status === 'Belum' || m.status === 'Kurang').reduce((a, b) => a + (b.qty || 0), 0).toLocaleString('id-ID')}
                </td>
                <td colSpan={2} className="py-3 px-3 text-center text-slate-500 font-normal">
                  Kalkulasi otomatis 100% sinkron
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Grid 2: Breakdown Mesin & Sumber Material */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Machine Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200">
            <Layers className="w-4 h-4 text-slate-700" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Rekap Per Jenis Produk / Mesin
            </h4>
          </div>
          <div className="space-y-3">
            {machineSummaries.map((m) => {
              const pct = m.totalQty > 0 ? Math.round((m.qtySudah / m.totalQty) * 100) : 0;
              return (
                <div key={m.jenis} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-900">{m.jenis}</span>
                    <span className="text-xs font-mono font-bold text-emerald-800">
                      {m.totalQty.toLocaleString('id-ID')} pcs/m
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1">
                    <span>Selesai: {m.qtySudah.toLocaleString('id-ID')}</span>
                    <span>Pending: {m.qtyBelum.toLocaleString('id-ID')}</span>
                    <span>{pct}% Selesai</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sumber Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200">
            <CheckCircle2 className="w-4 h-4 text-slate-700" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Distribusi Sumber Bahan Baku (Kesiapan Alokasi)
            </h4>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {sumberSummaries.map((s) => (
              <div key={s.sumber} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-bold text-slate-800">{s.sumber}</span>
                  <span className="text-[11px] text-slate-500">{s.itemCount} item</span>
                </div>
                <div className="text-sm font-mono font-bold text-slate-900 tabular-nums">
                  {s.totalQty.toLocaleString('id-ID')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid 3: Outstanding Watchlist (Belum) */}
      <div className="bg-white rounded-xl border border-rose-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-rose-200 bg-rose-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <h3 className="text-sm font-bold text-rose-900">
              Daftar Siaga Material Belum Siap (Outstanding Watchlist)
            </h3>
          </div>
          <span className="text-xs font-bold text-rose-700 bg-white px-2 py-0.5 rounded border border-rose-300">
            {outstandingList.length} Item Menunggu Tindak Lanjut
          </span>
        </div>

        <div className="overflow-x-auto max-h-72">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-rose-50/40 text-rose-900 font-semibold border-b border-rose-200 sticky top-0">
              <tr>
                <th className="py-2 px-3">Hari</th>
                <th className="py-2 px-3">Spesifikasi Material</th>
                <th className="py-2 px-3 text-right">Qty</th>
                <th className="py-2 px-3">Sumber</th>
                <th className="py-2 px-3">No. MR</th>
                <th className="py-2 px-3">Keterangan / Lokasi Palet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rose-100 text-slate-800">
              {outstandingList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-emerald-700 font-semibold">
                    Semua material telah berstatus "Sudah" (Selesai)! Tidak ada item tertunda.
                  </td>
                </tr>
              ) : (
                outstandingList.map((item) => (
                  <tr key={item.id} className="hover:bg-rose-50/30 transition-colors">
                    <td className="py-2 px-3 font-semibold text-slate-900">{item.hari}</td>
                    <td className="py-2 px-3 font-medium text-slate-900">{item.nama}</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-rose-700">
                      {item.qty.toLocaleString('id-ID')}
                    </td>
                    <td className="py-2 px-3 font-semibold">{item.sumber}</td>
                    <td className="py-2 px-3 font-mono font-medium text-slate-900">
                      {item.noMr || <span className="text-rose-500 italic">Belum terbit</span>}
                    </td>
                    <td className="py-2 px-3 text-slate-600">{item.keterangan || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
