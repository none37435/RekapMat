import React, { useState } from 'react';
import { MaterialRekapRow, StatusType, SumberType } from '../types/material';
import { Search, Plus, Trash2, Filter, CheckCheck, Highlighter, Calendar, ChevronDown, Scissors } from 'lucide-react';

interface MaterialTableProps {
  rows: MaterialRekapRow[];
  onUpdateRow: (id: string, updated: Partial<MaterialRekapRow>) => void;
  onAddRow: () => void;
  onDeleteRow: (id: string) => void;
  activeDayFilter: string;
  setActiveDayFilter: (day: string) => void;
  onOpenUpload?: () => void;
  onOpenFoldingCutting?: () => void;
  fcCount?: number;
  fcIgnoredCount?: number;
}

export const MaterialTable: React.FC<MaterialTableProps> = ({
  rows,
  onUpdateRow,
  onAddRow,
  onDeleteRow,
  activeDayFilter,
  setActiveDayFilter,
  onOpenUpload,
  onOpenFoldingCutting,
  fcCount = 0,
  fcIgnoredCount = 0,
}) => {
  const [search, setSearch] = useState('');
  const [jenisFilter, setJenisFilter] = useState('Semua');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [sumberFilter, setSumberFilter] = useState('Semua');

  const days = ['Semua', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const statusOptions: StatusType[] = ['Sudah', 'Belum', 'Sambung', 'Kurang', 'CEKSTOK'];
  const sumberOptions: SumberType[] = ['SGC', 'MR', 'PLESTER', 'SAMBUNG', 'OS', 'CN', 'CEKSTOK'];

  const filtered = rows.filter((r) => {
    if (activeDayFilter !== 'Semua' && r.hari.toLowerCase() !== activeDayFilter.toLowerCase()) return false;
    if (jenisFilter !== 'Semua' && r.jenis !== jenisFilter) return false;
    if (statusFilter !== 'Semua' && r.status !== statusFilter) return false;
    if (sumberFilter !== 'Semua' && r.sumber !== sumberFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        r.nama.toLowerCase().includes(q) ||
        r.keterangan.toLowerCase().includes(q) ||
        r.noMr.toLowerCase().includes(q) ||
        r.oleh.toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-12 text-center">
        <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100">
          <Calendar className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">
          Belum Ada Data Rekap Material
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
          Tabel saat ini kosong. Anda dapat mengunggah file Excel (.xlsx / .xls) jadwal produksi harian Anda atau menambahkan baris data pertama secara langsung.
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
            <span>Tambah Baris Manual</span>
          </button>
        </div>
      </div>
    );
  }

  // Row background colors distinct per day
  const getDayRowClass = (hari: string, isHighlighted?: boolean) => {
    if (isHighlighted) {
      return 'bg-amber-200/90 text-amber-950 font-medium border-l-4 border-l-amber-500';
    }
    const norm = (hari || '').toLowerCase().trim();
    if (norm.includes('senin')) {
      return 'bg-amber-50/70 hover:bg-amber-100/70 text-slate-900 border-l-4 border-l-amber-400';
    }
    if (norm.includes('selasa')) {
      return 'bg-sky-50/70 hover:bg-sky-100/70 text-slate-900 border-l-4 border-l-sky-400';
    }
    if (norm.includes('rabu')) {
      return 'bg-emerald-50/70 hover:bg-emerald-100/70 text-slate-900 border-l-4 border-l-emerald-400';
    }
    if (norm.includes('kamis')) {
      return 'bg-purple-50/70 hover:bg-purple-100/70 text-slate-900 border-l-4 border-l-purple-400';
    }
    if (norm.includes('jumat')) {
      return 'bg-rose-50/70 hover:bg-rose-100/70 text-slate-900 border-l-4 border-l-rose-400';
    }
    if (norm.includes('sabtu')) {
      return 'bg-teal-50/70 hover:bg-teal-100/70 text-slate-900 border-l-4 border-l-teal-400';
    }
    return 'bg-slate-50/70 hover:bg-slate-100/70 text-slate-900 border-l-4 border-l-slate-300';
  };

  const getDayBadge = (hari: string) => {
    const norm = (hari || '').toLowerCase().trim();
    if (norm.includes('senin')) return 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
    if (norm.includes('selasa')) return 'bg-sky-100 text-sky-900 border-sky-300 font-bold';
    if (norm.includes('rabu')) return 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold';
    if (norm.includes('kamis')) return 'bg-purple-100 text-purple-900 border-purple-300 font-bold';
    if (norm.includes('jumat')) return 'bg-rose-100 text-rose-900 border-rose-300 font-bold';
    if (norm.includes('sabtu')) return 'bg-teal-100 text-teal-900 border-teal-300 font-bold';
    return 'bg-slate-100 text-slate-800 border-slate-300 font-bold';
  };

  const getSumberBadge = (sumber: string) => {
    switch (sumber) {
      case 'MR':
        return 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
      case 'OS':
        return 'bg-orange-100 text-orange-800 border-orange-300 font-bold';
      case 'SGC':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
      case 'CN':
        return 'bg-blue-100 text-blue-800 border-blue-300 font-bold';
      case 'CEKSTOK':
        return 'bg-purple-100 text-purple-800 border-purple-300 font-bold';
      case 'PLESTER':
        return 'bg-[#064E3B] text-white border-[#043d2e] shadow-2xs font-bold';
      case 'SAMBUNG':
        return 'bg-[#06B6D4] text-white border-[#0891b2] shadow-2xs font-bold';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300 font-bold';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Sudah':
        return 'bg-emerald-100 text-emerald-800 border-emerald-400 font-bold';
      case 'Belum':
        return 'bg-rose-100 text-rose-800 border-rose-400 font-bold';
      case 'Sambung':
        return 'bg-amber-100 text-amber-900 border-amber-400 font-bold';
      case 'Kurang':
        return 'bg-orange-100 text-orange-900 border-orange-400 font-bold';
      case 'CEKSTOK':
        return 'bg-purple-100 text-purple-900 border-purple-400 font-bold';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300 font-bold';
    }
  };

  const handleMarkAllSudah = () => {
    filtered.forEach((r) => {
      if (r.status !== 'Sudah') {
        onUpdateRow(r.id, { status: 'Sudah', oleh: r.oleh || 'Operator', waktu: new Date().toISOString() });
      }
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      {/* Top Filter & Action Bar */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/70 space-y-3">
        {/* Row 1: Day Tabs & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Day Segmented Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1 shrink-0">
              <Calendar className="w-3.5 h-3.5" /> Hari:
            </span>
            {days.map((day) => (
              <button
                key={day}
                onClick={() => setActiveDayFilter(day)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  activeDayFilter === day
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 bg-white border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {day}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari spesifikasi, No. MR, palet, kode..."
              className="pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 w-full sm:w-64 text-slate-800"
            />
          </div>
        </div>

        {/* Row 2: Secondary Dropdown Filters & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-200/60">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-slate-600">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Filter:</span>
            </div>

            {/* Filter Jenis */}
            <select
              value={jenisFilter}
              onChange={(e) => setJenisFilter(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-md px-2.5 py-1 text-slate-700 min-w-[125px] font-medium"
            >
              <option value="Semua">Semua Jenis</option>
              <option value="Kasa Lipat">Kasa Lipat</option>
              <option value="Kasa Roll">Kasa Roll</option>
            </select>

            {/* Filter Sumber */}
            <select
              value={sumberFilter}
              onChange={(e) => setSumberFilter(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-md px-2.5 py-1 text-slate-700 min-w-[135px] font-medium"
            >
              <option value="Semua">Semua Sumber</option>
              {sumberOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* Filter Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-md px-2.5 py-1 text-slate-700 min-w-[130px] font-medium"
            >
              <option value="Semua">Semua Status</option>
              {statusOptions.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>

            <span className="text-xs text-slate-500 ml-1">
              Menampilkan <strong>{filtered.length}</strong> dari {rows.length} item
            </span>
          </div>

          <div className="flex items-center gap-2">
            {fcCount > 0 && onOpenFoldingCutting && (
              <button
                onClick={onOpenFoldingCutting}
                title="Tinjau keterangan Excel dan putuskan penambahan bagian folding & cutting"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-100/90 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors whitespace-nowrap shadow-2xs"
              >
                <Scissors className="w-3.5 h-3.5 text-amber-700" />
                <span>Folding & Cutting ({fcIgnoredCount} Diabaikan)</span>
              </button>
            )}
            <button
              onClick={handleMarkAllSudah}
              title="Ubah status seluruh baris terfilter menjadi Sudah"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors whitespace-nowrap"
            >
              <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Semua Terfilter Selesai</span>
            </button>
            <button
              onClick={onAddRow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Baris</span>
            </button>
          </div>
        </div>
      </div>

      {/* Visual Legend Bar: Hari, Sumber, Status */}
      <div className="px-4 py-2.5 bg-slate-100/90 border-b border-slate-200 text-xs flex flex-wrap items-center justify-between gap-3 text-slate-700">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="font-bold text-[11px] uppercase tracking-wider text-slate-500 mr-1">Warna Tiap Hari:</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span> Senin
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-100 text-sky-900 border border-sky-300">
            <span className="w-2 h-2 rounded-full bg-sky-400 inline-block"></span> Selasa
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span> Rabu
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-100 text-purple-900 border border-purple-300">
            <span className="w-2 h-2 rounded-full bg-purple-400 inline-block"></span> Kamis
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-900 border border-rose-300">
            <span className="w-2 h-2 rounded-full bg-rose-400 inline-block"></span> Jumat
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-teal-100 text-teal-900 border border-teal-300">
            <span className="w-2 h-2 rounded-full bg-teal-400 inline-block"></span> Sabtu
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="font-bold text-[11px] uppercase tracking-wider text-slate-500 mr-1">Chip Dropdown:</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#064E3B] text-white">PLESTER</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#06B6D4] text-white">SAMBUNG</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">MR / Belum</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">SGC / Sudah</span>
        </div>
      </div>

      {/* Spreadsheet Grid */}
      <div className="overflow-x-auto max-h-[660px]">
        <table className="w-full text-left border-collapse text-xs min-w-[1550px]">
          <thead className="bg-[#0f766e] text-white sticky top-0 z-10 select-none shadow-xs font-semibold">
            <tr className="border-b border-teal-800">
              <th className="py-2.5 px-2.5 min-w-[85px] w-20 border-r border-teal-700/80 text-center whitespace-nowrap">Week</th>
              <th className="py-2.5 px-2.5 min-w-[110px] w-28 border-r border-teal-700/80 text-center whitespace-nowrap">Tanggal</th>
              <th className="py-2.5 px-2.5 min-w-[130px] w-32 border-r border-teal-700/80 text-center whitespace-nowrap">jenis</th>
              <th className="py-2.5 px-3 min-w-[200px] border-r border-teal-700/80">
                <div className="font-bold">nama</div>
                <div className="text-[10px] font-normal text-teal-200">Bahan Baku (24/20, 24/20s, SHQ...)</div>
              </th>
              <th className="py-2.5 px-3 min-w-[90px] w-24 text-right border-r border-teal-700/80 whitespace-nowrap">qty</th>
              <th className="py-2.5 px-2 min-w-[125px] w-30 text-center border-r border-teal-700/80 whitespace-nowrap">
                <div>hari</div>
                <div className="text-[9px] font-normal text-teal-200">Warna Tiap Hari</div>
              </th>
              <th className="py-2.5 px-2.5 min-w-[140px] w-36 text-center border-r border-teal-700/80 whitespace-nowrap">
                <div>sumber</div>
                <div className="text-[9px] font-normal text-teal-200">Dropdown Chip</div>
              </th>
              <th className="py-2.5 px-2.5 min-w-[135px] w-34 text-center border-r border-teal-700/80 whitespace-nowrap">
                <div>status</div>
                <div className="text-[9px] font-normal text-teal-200">Dropdown Chip</div>
              </th>
              <th className="py-2.5 px-3 min-w-[280px] border-r border-teal-700/80">
                <div className="font-bold">keterangan</div>
                <div className="text-[10px] font-normal text-teal-200">Kode Produk (S0001, S0003, dll.)</div>
              </th>
              <th className="py-2.5 px-2 min-w-[85px] w-20 border-r border-teal-700/80 text-center whitespace-nowrap">Oleh</th>
              <th className="py-2.5 px-2 min-w-[120px] w-28 border-r border-teal-700/80 text-center whitespace-nowrap">Waktu</th>
              <th className="py-2.5 px-3 min-w-[110px] w-28 border-r border-teal-700/80 text-center whitespace-nowrap">No. MR</th>
              <th className="py-2.5 px-2 min-w-[70px] w-16 text-center whitespace-nowrap">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/80 text-slate-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={13} className="py-12 text-center text-slate-400">
                  Tidak ada baris material yang sesuai dengan filter atau kata kunci.
                </td>
              </tr>
            ) : (
              filtered.map((r, idx) => (
                <tr
                  key={`${r.id}-${idx}`}
                  className={`transition-colors border-b border-slate-200/70 ${getDayRowClass(r.hari, r.isHighlighted)}`}
                >
                  {/* Week */}
                  <td className="py-2 px-2 border-r border-slate-200 font-mono text-slate-600 whitespace-nowrap min-w-[85px]">
                    <input
                      type="text"
                      value={r.week}
                      onChange={(e) => onUpdateRow(r.id, { week: e.target.value })}
                      className="w-full bg-transparent border-0 focus:ring-1 focus:ring-emerald-500 rounded px-1 -mx-1 py-0.5 text-center"
                    />
                  </td>

                  {/* Tanggal */}
                  <td className="py-2 px-2 border-r border-slate-200 font-mono text-slate-700 whitespace-nowrap min-w-[110px]">
                    <input
                      type="text"
                      value={r.tanggal}
                      onChange={(e) => onUpdateRow(r.id, { tanggal: e.target.value })}
                      className="w-full bg-transparent border-0 focus:ring-1 focus:ring-emerald-500 rounded px-1 -mx-1 py-0.5 text-center"
                    />
                  </td>

                  {/* Jenis with Clean Chip Dropdown */}
                  <td className="py-2 px-2 text-center border-r border-slate-200 whitespace-nowrap min-w-[130px] w-32">
                    <div className="relative inline-block w-full min-w-[118px]">
                      <select
                        value={r.jenis}
                        onChange={(e) => onUpdateRow(r.id, { jenis: e.target.value })}
                        className={`w-full text-xs font-semibold py-1 pl-2.5 pr-6 rounded-md border appearance-none cursor-pointer text-center transition-all whitespace-nowrap focus:outline-hidden focus:ring-1 focus:ring-emerald-500 shadow-2xs ${
                          r.jenis === 'Kasa Roll'
                            ? 'bg-blue-50 text-blue-800 border-blue-300'
                            : 'bg-amber-50 text-amber-900 border-amber-300'
                        }`}
                      >
                        <option value="Kasa Lipat" className="bg-white text-slate-900 font-medium">Kasa Lipat</option>
                        <option value="Kasa Roll" className="bg-white text-slate-900 font-medium">Kasa Roll</option>
                      </select>
                      <ChevronDown className={`w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${
                        r.jenis === 'Kasa Roll' ? 'text-blue-600' : 'text-amber-700'
                      }`} />
                    </div>
                  </td>

                  {/* Nama Material / Bahan Baku */}
                  <td className="py-2 px-3 border-r border-slate-200 font-medium text-slate-900">
                    <input
                      type="text"
                      value={r.nama}
                      placeholder="24/20, 24/20s, SHQ..."
                      onChange={(e) => onUpdateRow(r.id, { nama: e.target.value })}
                      className="w-full bg-transparent border-0 focus:ring-1 focus:ring-emerald-500 rounded px-1 -mx-1 py-0.5"
                    />
                  </td>

                  {/* Qty */}
                  <td className="py-2 px-3 text-right font-mono tabular-nums border-r border-slate-200 font-bold text-slate-900 whitespace-nowrap min-w-[90px]">
                    <input
                      type="number"
                      value={r.qty}
                      onChange={(e) => onUpdateRow(r.id, { qty: Number(e.target.value) || 0 })}
                      className="w-full text-right bg-transparent border-0 focus:ring-1 focus:ring-emerald-500 rounded px-1 -mx-1 py-0.5 font-bold"
                    />
                  </td>

                  {/* Hari with Colored Dropdown Badge */}
                  <td className="py-2 px-2 text-center border-r border-slate-200 whitespace-nowrap min-w-[125px] w-30">
                    <div className="relative inline-block w-full min-w-[112px]">
                      <select
                        value={r.hari}
                        onChange={(e) => onUpdateRow(r.id, { hari: e.target.value })}
                        className={`w-full text-xs font-bold py-1 pl-2.5 pr-6 rounded-md border appearance-none cursor-pointer text-center transition-all whitespace-nowrap focus:outline-hidden focus:ring-1 focus:ring-emerald-500 shadow-2xs ${getDayBadge(r.hari)}`}
                      >
                        {days.filter(d => d !== 'Semua').map(d => (
                          <option key={d} value={d} className="bg-white text-slate-900 font-medium">{d}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-70" />
                    </div>
                  </td>

                  {/* Sumber with Colored Dropdown Pill Chip */}
                  <td className="py-2 px-2 text-center border-r border-slate-200 whitespace-nowrap min-w-[140px] w-36">
                    <div className="relative inline-block w-full min-w-[126px]">
                      <select
                        value={r.sumber}
                        onChange={(e) => onUpdateRow(r.id, { sumber: e.target.value })}
                        className={`w-full text-xs font-bold py-1 pl-2.5 pr-6 rounded-full border appearance-none cursor-pointer text-center transition-all whitespace-nowrap focus:outline-hidden focus:ring-1 focus:ring-emerald-500 shadow-2xs ${getSumberBadge(r.sumber)}`}
                      >
                        {sumberOptions.map((s) => (
                          <option key={s} value={s} className="bg-white text-slate-900 font-medium">{s}</option>
                        ))}
                      </select>
                      <ChevronDown className={`w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${['PLESTER', 'SAMBUNG'].includes(r.sumber) ? 'text-white' : 'opacity-70'}`} />
                    </div>
                  </td>

                  {/* Status with Colored Dropdown Pill Chip */}
                  <td className="py-2 px-2 text-center border-r border-slate-200 whitespace-nowrap min-w-[135px] w-34">
                    <div className="relative inline-block w-full min-w-[122px]">
                      <select
                        value={r.status}
                        onChange={(e) => {
                          const newStatus = e.target.value;
                          const updatePayload: Partial<MaterialRekapRow> = { status: newStatus };
                          if (newStatus === 'Sudah' && !r.waktu) {
                            updatePayload.waktu = new Date().toISOString();
                            updatePayload.oleh = r.oleh || 'Operator';
                          }
                          onUpdateRow(r.id, updatePayload);
                        }}
                        className={`w-full text-xs font-bold py-1 pl-2.5 pr-6 rounded-full border appearance-none cursor-pointer text-center transition-all whitespace-nowrap focus:outline-hidden focus:ring-1 focus:ring-emerald-500 shadow-2xs ${getStatusBadge(r.status)}`}
                      >
                        {statusOptions.map((st) => (
                          <option key={st} value={st} className="bg-white text-slate-900 font-medium">{st}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-70" />
                    </div>
                  </td>

                  {/* Keterangan */}
                  <td className="py-2 px-3 border-r border-slate-200 text-slate-700">
                    <input
                      type="text"
                      value={r.keterangan}
                      onChange={(e) => onUpdateRow(r.id, { keterangan: e.target.value })}
                      placeholder="Kode produk (S0001, S0003, dll.)..."
                      className="w-full bg-transparent border-0 focus:ring-1 focus:ring-emerald-500 rounded px-1 -mx-1 py-0.5 text-xs font-mono"
                    />
                  </td>

                  {/* Oleh */}
                  <td className="py-2 px-2 border-r border-slate-200 text-slate-700 whitespace-nowrap min-w-[85px]">
                    <input
                      type="text"
                      value={r.oleh}
                      placeholder="-"
                      onChange={(e) => onUpdateRow(r.id, { oleh: e.target.value })}
                      className="w-full bg-transparent border-0 focus:ring-1 focus:ring-emerald-500 rounded px-1 -mx-1 py-0.5 text-xs text-center"
                    />
                  </td>

                  {/* Waktu */}
                  <td className="py-2 px-2 border-r border-slate-200 font-mono text-[11px] text-slate-500 whitespace-nowrap min-w-[120px]">
                    <input
                      type="text"
                      value={r.waktu}
                      placeholder="-"
                      onChange={(e) => onUpdateRow(r.id, { waktu: e.target.value })}
                      className="w-full bg-transparent border-0 focus:ring-1 focus:ring-emerald-500 rounded px-1 -mx-1 py-0.5 text-[11px] text-center"
                    />
                  </td>

                  {/* No. MR */}
                  <td className="py-2 px-3 border-r border-slate-200 font-mono text-xs font-semibold text-slate-800 whitespace-nowrap min-w-[110px]">
                    <input
                      type="text"
                      value={r.noMr}
                      placeholder="MR..."
                      onChange={(e) => onUpdateRow(r.id, { noMr: e.target.value })}
                      className="w-full bg-transparent border-0 focus:ring-1 focus:ring-emerald-500 rounded px-1 -mx-1 py-0.5 font-mono"
                    />
                  </td>

                  {/* Actions */}
                  <td className="py-2 px-2 text-center whitespace-nowrap">
                    <button
                      onClick={() => onUpdateRow(r.id, { isHighlighted: !r.isHighlighted })}
                      className={`p-1 rounded transition-colors mr-1 ${
                        r.isHighlighted ? 'text-amber-800 bg-amber-300' : 'text-slate-400 hover:text-amber-600'
                      }`}
                      title="Tandai baris prioritas (Highlight Kuning)"
                    >
                      <Highlighter className="w-3.5 h-3.5" />
                    </button>
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
          {/* Table Footer */}
          <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900 sticky bottom-0 z-10">
            <tr>
              <td colSpan={4} className="py-3 px-3 text-right border-r border-slate-300 text-xs uppercase tracking-wider">
                Total Kuantitas Material Terfilter:
              </td>
              <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-950 bg-emerald-100/70 border-r border-slate-300 text-sm">
                {filtered.reduce((acc, c) => acc + (c.qty || 0), 0).toLocaleString('id-ID')}
              </td>
              <td colSpan={8} className="py-3 px-3 text-slate-500 font-normal text-[11px]">
                {filtered.filter(f => f.status === 'Sudah').length} dari {filtered.length} baris telah berstatus "Sudah"
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
