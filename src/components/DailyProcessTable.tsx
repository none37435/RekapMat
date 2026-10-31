import React, { useState } from 'react';
import { DailyProcessRow } from '../types/material';
import { Search, Plus, Trash2, RefreshCw, Sparkles, Filter, Scissors } from 'lucide-react';

interface DailyProcessTableProps {
  rows: DailyProcessRow[];
  onUpdateRow: (id: string, updated: Partial<DailyProcessRow>) => void;
  onAddRow: () => void;
  onDeleteRow: (id: string) => void;
  onSyncToMaterialRekap: () => void;
  currentSheetName: string;
  onOpenUpload?: () => void;
  onOpenFoldingCutting?: () => void;
  fcCount?: number;
  fcIgnoredCount?: number;
}

export const DailyProcessTable: React.FC<DailyProcessTableProps> = ({
  rows,
  onUpdateRow,
  onAddRow,
  onDeleteRow,
  onSyncToMaterialRekap,
  currentSheetName,
  onOpenUpload,
  onOpenFoldingCutting,
  fcCount = 0,
  fcIgnoredCount = 0,
}) => {
  const [search, setSearch] = useState('');

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.kode.toLowerCase().includes(q) ||
      r.namaProduk.toLowerCase().includes(q) ||
      r.keterangan.toLowerCase().includes(q)
    );
  });

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-12 text-center">
        <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100">
          <Sparkles className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">
          Belum Ada Data Rencana Proses Harian
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
          Tabel rencana proses stasiun mesin (Slitting, Folding, Cutting, Sambung, Inspection) masih kosong. Unggah file Excel harian atau tambahkan produk baru.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {onOpenUpload && (
            <button
              onClick={onOpenUpload}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
            >
              <span>Upload File Excel (.xlsx)</span>
            </button>
          )}
          <button
            onClick={onAddRow}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Produk Baru</span>
          </button>
        </div>
      </div>
    );
  }

  // Calculate totals
  const totalSlitting = filtered.reduce((acc, curr) => acc + (curr.slitting || 0), 0);
  const totalFolding = filtered.reduce((acc, curr) => acc + (curr.folding || 0), 0);
  const totalCutting = filtered.reduce((acc, curr) => acc + (curr.cutting || 0), 0);
  const totalSambung = filtered.reduce((acc, curr) => acc + (curr.sambung || 0), 0);
  const totalInspect = filtered.reduce((acc, curr) => acc + (curr.inspection || 0), 0);
  const grandTotal = filtered.reduce((acc, curr) => acc + (curr.total || 0), 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      {/* Control Strip */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kode (S0001), produk, atau keterangan..."
              className="pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 w-64 text-slate-800"
            />
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Sheet: <strong className="text-slate-800">{currentSheetName || 'Rencana Harian'}</strong> · {filtered.length} baris
          </span>
        </div>

        <div className="flex items-center gap-2">
          {fcCount > 0 && onOpenFoldingCutting && (
            <button
              onClick={onOpenFoldingCutting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-100/90 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors whitespace-nowrap shadow-2xs"
              title="Tinjau keterangan pada file Excel dan putuskan penambahan bagian folding & cutting"
            >
              <Scissors className="w-3.5 h-3.5 text-amber-700" />
              <span>Folding & Cutting ({fcIgnoredCount} Diabaikan)</span>
            </button>
          )}
          <button
            onClick={onSyncToMaterialRekap}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200 border border-emerald-300 rounded-lg transition-colors whitespace-nowrap shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
            <span>Rekap Bahan Baku (Kode Masuk ke Keterangan)</span>
          </button>
          <button
            onClick={onAddRow}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Produk</span>
          </button>
        </div>
      </div>

      {/* High-Density Data Grid */}
      <div className="overflow-x-auto max-h-[640px]">
        <table className="w-full text-left border-collapse text-xs min-w-[960px]">
          <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10 select-none shadow-xs font-semibold">
            <tr className="border-b border-slate-300">
              <th className="py-2.5 px-3 w-12 text-center border-r border-slate-200">No</th>
              <th className="py-2.5 px-3 w-28 border-r border-slate-200">Kode</th>
              <th className="py-2.5 px-3 min-w-[240px] border-r border-slate-200">Nama Produk</th>
              <th className="py-2.5 px-3 w-32 text-right border-r border-slate-200 bg-slate-100/90">
                Slitting / Rolling Poliban
              </th>
              <th className="py-2.5 px-3 w-28 text-right border-r border-slate-200 bg-slate-100/90">
                Folding Mesin
              </th>
              <th className="py-2.5 px-3 w-28 text-right border-r border-slate-200 bg-slate-100/90">
                Cutting
              </th>
              <th className="py-2.5 px-3 w-28 text-right border-r border-slate-200 bg-slate-100/90">
                Sambung Wrapper
              </th>
              <th className="py-2.5 px-3 w-24 text-right border-r border-slate-200 bg-slate-100/90">
                Inspection
              </th>
              <th className="py-2.5 px-3 w-28 text-right border-r border-slate-200 bg-emerald-50 text-emerald-950 font-bold">
                Total
              </th>
              <th className="py-2.5 px-3 min-w-[220px] border-r border-slate-200">Keterangan</th>
              <th className="py-2.5 px-2 w-10 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-12 text-center text-slate-400">
                  Tidak ada baris data pengerjaan yang cocok dengan pencarian.
                </td>
              </tr>
            ) : (
              filtered.map((r, idx) => (
                <tr
                  key={`${r.id}-${idx}`}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    idx % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'
                  }`}
                >
                  <td className="py-2 px-3 text-center text-slate-500 font-mono border-r border-slate-200">
                    {r.no || idx + 1}
                  </td>
                  <td className="py-2 px-3 border-r border-slate-200 font-mono font-medium text-slate-900">
                    <input
                      type="text"
                      value={r.kode}
                      onChange={(e) => onUpdateRow(r.id, { kode: e.target.value })}
                      className="w-full bg-transparent border-0 focus:ring-1 focus:ring-emerald-500 rounded px-1 -mx-1 py-0.5"
                    />
                  </td>
                  <td className="py-2 px-3 border-r border-slate-200 font-medium">
                    <input
                      type="text"
                      value={r.namaProduk}
                      onChange={(e) => onUpdateRow(r.id, { namaProduk: e.target.value })}
                      className="w-full bg-transparent border-0 focus:ring-1 focus:ring-emerald-500 rounded px-1 -mx-1 py-0.5 text-slate-900"
                    />
                  </td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums border-r border-slate-200">
                    <input
                      type="number"
                      value={r.slitting || ''}
                      placeholder="0"
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        const newTotal = val + r.folding + r.cutting + r.sambung + r.inspection;
                        onUpdateRow(r.id, { slitting: val, total: newTotal });
                      }}
                      className="w-full text-right bg-transparent border-0 focus:ring-1 focus:ring-emerald-500 rounded px-1 -mx-1 py-0.5"
                    />
                  </td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums border-r border-slate-200">
                    <input
                      type="number"
                      value={r.folding || ''}
                      placeholder="0"
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        const newTotal = r.slitting + val + r.cutting + r.sambung + r.inspection;
                        onUpdateRow(r.id, { folding: val, total: newTotal });
                      }}
                      className="w-full text-right bg-transparent border-0 focus:ring-1 focus:ring-emerald-500 rounded px-1 -mx-1 py-0.5"
                    />
                  </td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums border-r border-slate-200">
                    <input
                      type="number"
                      value={r.cutting || ''}
                      placeholder="0"
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        const newTotal = r.slitting + r.folding + val + r.sambung + r.inspection;
                        onUpdateRow(r.id, { cutting: val, total: newTotal });
                      }}
                      className="w-full text-right bg-transparent border-0 focus:ring-1 focus:ring-emerald-500 rounded px-1 -mx-1 py-0.5"
                    />
                  </td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums border-r border-slate-200">
                    <input
                      type="number"
                      value={r.sambung || ''}
                      placeholder="0"
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        const newTotal = r.slitting + r.folding + r.cutting + val + r.inspection;
                        onUpdateRow(r.id, { sambung: val, total: newTotal });
                      }}
                      className="w-full text-right bg-transparent border-0 focus:ring-1 focus:ring-emerald-500 rounded px-1 -mx-1 py-0.5"
                    />
                  </td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums border-r border-slate-200">
                    <input
                      type="number"
                      value={r.inspection || ''}
                      placeholder="0"
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        const newTotal = r.slitting + r.folding + r.cutting + r.sambung + val;
                        onUpdateRow(r.id, { inspection: val, total: newTotal });
                      }}
                      className="w-full text-right bg-transparent border-0 focus:ring-1 focus:ring-emerald-500 rounded px-1 -mx-1 py-0.5"
                    />
                  </td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums font-bold border-r border-slate-200 text-emerald-900 bg-emerald-50/40">
                    {r.total.toLocaleString('id-ID')}
                  </td>
                  <td className="py-2 px-3 border-r border-slate-200 text-slate-700">
                    <input
                      type="text"
                      value={r.keterangan}
                      placeholder="Catatan material / sisa slit..."
                      onChange={(e) => onUpdateRow(r.id, { keterangan: e.target.value })}
                      className="w-full bg-transparent border-0 focus:ring-1 focus:ring-emerald-500 rounded px-1 -mx-1 py-0.5 text-xs"
                    />
                  </td>
                  <td className="py-2 px-2 text-center">
                    <button
                      onClick={() => onDeleteRow(r.id)}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                      title="Hapus baris"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {/* Footer Subtotals */}
          <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900 sticky bottom-0 z-10">
            <tr>
              <td colSpan={3} className="py-3 px-3 text-right border-r border-slate-300 text-xs uppercase tracking-wider">
                Total Akumulasi Stasiun:
              </td>
              <td className="py-3 px-3 text-right font-mono tabular-nums border-r border-slate-300 text-slate-800">
                {totalSlitting.toLocaleString('id-ID')}
              </td>
              <td className="py-3 px-3 text-right font-mono tabular-nums border-r border-slate-300 text-slate-800">
                {totalFolding.toLocaleString('id-ID')}
              </td>
              <td className="py-3 px-3 text-right font-mono tabular-nums border-r border-slate-300 text-slate-800">
                {totalCutting.toLocaleString('id-ID')}
              </td>
              <td className="py-3 px-3 text-right font-mono tabular-nums border-r border-slate-300 text-slate-800">
                {totalSambung.toLocaleString('id-ID')}
              </td>
              <td className="py-3 px-3 text-right font-mono tabular-nums border-r border-slate-300 text-slate-800">
                {totalInspect.toLocaleString('id-ID')}
              </td>
              <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-900 bg-emerald-100/70 border-r border-slate-300 text-sm">
                {grandTotal.toLocaleString('id-ID')}
              </td>
              <td colSpan={2} className="py-3 px-3 text-slate-500 font-normal text-[11px]">
                Kapasitas siap jalan
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
