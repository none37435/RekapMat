import React, { useState, useMemo } from 'react';
import {
  Scissors,
  Check,
  Search,
  Info,
  RotateCcw,
  History,
  Sparkles,
  ArrowLeft,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  Save,
} from 'lucide-react';
import { FoldingCuttingItem } from '../types/material';

interface FoldingCuttingViewProps {
  items: FoldingCuttingItem[];
  onSave: (updatedItems: FoldingCuttingItem[]) => void;
  onNavigateBack: () => void;
  onResetToAutoHierarchy?: () => void;
}

export const FoldingCuttingView: React.FC<FoldingCuttingViewProps> = ({
  items,
  onSave,
  onNavigateBack,
  onResetToAutoHierarchy,
}) => {
  const [localItems, setLocalItems] = useState<FoldingCuttingItem[]>(items);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'included' | 'ignored' | 'priorWeek'>('all');
  const [dayFilter, setDayFilter] = useState<string>('all');
  const [isSavedFeedback, setIsSavedFeedback] = useState(false);

  // Keep localItems in sync when items prop changes
  React.useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const handleToggle = (id: string) => {
    setLocalItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isIncluded: !item.isIncluded } : item
      )
    );
    setIsSavedFeedback(false);
  };

  const handleIncludeAll = () => {
    setLocalItems((prev) => prev.map((item) => ({ ...item, isIncluded: true })));
    setIsSavedFeedback(false);
  };

  const handleIgnoreAll = () => {
    setLocalItems((prev) => prev.map((item) => ({ ...item, isIncluded: false })));
    setIsSavedFeedback(false);
  };

  const handleResetToAuto = () => {
    if (onResetToAutoHierarchy) {
      onResetToAutoHierarchy();
    } else {
      setLocalItems(items);
    }
    setIsSavedFeedback(false);
  };

  const handleSaveOnly = () => {
    onSave(localItems);
    setIsSavedFeedback(true);
    setTimeout(() => setIsSavedFeedback(false), 3000);
  };

  const handleSaveAndReturn = () => {
    onSave(localItems);
    onNavigateBack();
  };

  // Extract distinct days for day filter
  const availableDays = useMemo(() => {
    const days = new Set<string>();
    localItems.forEach((i) => {
      if (i.hari) days.add(i.hari);
    });
    return Array.from(days);
  }, [localItems]);

  const filteredItems = useMemo(() => {
    return localItems.filter((item) => {
      if (statusFilter === 'included' && !item.isIncluded) return false;
      if (statusFilter === 'ignored' && item.isIncluded) return false;
      if (statusFilter === 'priorWeek' && !item.isPriorWeekSlit) return false;
      if (dayFilter !== 'all' && item.hari !== dayFilter) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        item.kode.toLowerCase().includes(q) ||
        item.namaProduk.toLowerCase().includes(q) ||
        item.keterangan.toLowerCase().includes(q) ||
        item.hari.toLowerCase().includes(q) ||
        item.sheetName.toLowerCase().includes(q) ||
        (item.precedenceReason || '').toLowerCase().includes(q)
      );
    });
  }, [localItems, statusFilter, dayFilter, search]);

  const includedCount = localItems.filter((i) => i.isIncluded).length;
  const ignoredCount = localItems.filter((i) => !i.isIncluded).length;
  const priorWeekCount = localItems.filter((i) => i.isPriorWeekSlit).length;

  const getDayBadgeColor = (day: string) => {
    switch (day) {
      case 'Senin':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'Selasa':
        return 'bg-sky-100 text-sky-900 border-sky-300';
      case 'Rabu':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'Kamis':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'Jumat':
        return 'bg-rose-100 text-rose-900 border-rose-300';
      case 'Sabtu':
        return 'bg-indigo-100 text-indigo-900 border-indigo-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="space-y-5 animate-fade-in pb-12">
      {/* Top Header Card with Back Button & Direct Actions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              onClick={onNavigateBack}
              title="Kembali ke Rekap Material"
              className="mt-0.5 p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors shrink-0 shadow-2xs"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <Scissors className="w-4 h-4" />
                </div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                  Keputusan Bagian Folding Mesin & Cutting
                </h1>
                <span className="text-xs font-semibold font-mono px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  {localItems.length} Item Terdeteksi
                </span>
                {isSavedFeedback && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 animate-fade-in">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Keputusan Disimpan!
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                Halaman penuh untuk memverifikasi dan memutuskan penarikan bahan baku pada stasiun <strong>Folding Mesin</strong> dan <strong>Cutting</strong> sesuai hierarki rantai proses:
                <span className="font-semibold text-slate-800 ml-1">Slitting (Hulu) → Folding Mesin (Antara) → Cutting (Hilir)</span>.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSaveOnly}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-2xs"
            >
              <Save className="w-4 h-4 text-slate-600" />
              <span>Simpan Saja</span>
            </button>
            <button
              type="button"
              onClick={handleSaveAndReturn}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>Simpan & Kembali ({includedCount} Disertakan)</span>
            </button>
          </div>
        </div>

        {/* 4 Stat Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
              Total Item Diperiksa
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold font-mono text-slate-900">{localItems.length}</span>
              <span className="text-xs text-slate-500">baris Excel</span>
            </div>
          </div>

          <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3">
            <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block">
              Diabaikan (Lanjutan)
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold font-mono text-amber-900">{ignoredCount}</span>
              <span className="text-xs text-amber-700 font-medium">Bahan ditarik di Slitting</span>
            </div>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3">
            <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
              Disertakan (Tarik Bahan)
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold font-mono text-emerald-900">{includedCount}</span>
              <span className="text-xs text-emerald-700 font-medium">Masuk Rekap Bahan Baku</span>
            </div>
          </div>

          <div className="bg-indigo-50/70 border border-indigo-200 rounded-lg p-3">
            <span className="text-[11px] font-semibold text-indigo-800 uppercase tracking-wider block">
              Sisa Slit / Week Lalu (Slit/Cut W1)
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold font-mono text-indigo-900">{priorWeekCount}</span>
              <span className="text-xs text-indigo-700 font-medium">Otomatis Diabaikan</span>
            </div>
          </div>
        </div>

        {/* Detailed Industrial Logic Guidance Banner */}
        <div className="mt-4 p-3.5 rounded-lg bg-amber-50/90 border border-amber-200 text-xs text-amber-950 flex items-start gap-3">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1 leading-relaxed">
            <p className="font-bold text-amber-950">
              Prinsip Aliran Waktu & Alokasi Bahan Baku Otomatis:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-amber-900 pt-0.5">
              <div>
                <strong className="text-amber-950">• Status Diabaikan (Lanjutan / Sisa Slit / Slit W1 / Cut W1):</strong> Jika kode ini telah memiliki proses Slitting pada hari tersebut/sebelumnya, atau terdeteksi pengerjaan week lalu (keterangan <em>"Slit W1"</em>, <em>"Cut W1"</em>, <em>"Sisa Cut W1"</em>, dll. baik dengan/tanpa kata SISA). Bahan sudah ditarik di stasiun hulu sehingga TIDAK diduplikasi.
              </div>
              <div>
                <strong className="text-amber-950">• Status Disertakan (Tarik Bahan Mentah):</strong> Jika kode ini belum memiliki proses Slitting hingga hari tersebut dan bukan merupakan pengerjaan week lalu, barulah proses Folding/Cutting bertindak sebagai penarik bahan mentah pertama ke dalam Rekap Material.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Container & Controls */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Controls Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/60 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari kode, nama produk, keterangan Excel, alasan..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-800 placeholder-slate-400"
              />
            </div>

            {/* Filter Status Tabs */}
            <div className="flex rounded-lg border border-slate-300 p-0.5 bg-white text-[11px] font-medium shrink-0">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-slate-900 text-white font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua ({localItems.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('ignored')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  statusFilter === 'ignored'
                    ? 'bg-amber-100 text-amber-900 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Diabaikan ({ignoredCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('included')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  statusFilter === 'included'
                    ? 'bg-emerald-100 text-emerald-900 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Disertakan ({includedCount})
              </button>
              {priorWeekCount > 0 && (
                <button
                  type="button"
                  onClick={() => setStatusFilter('priorWeek')}
                  className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                    statusFilter === 'priorWeek'
                      ? 'bg-indigo-100 text-indigo-900 font-bold shadow-2xs'
                      : 'text-indigo-700 hover:text-indigo-900'
                  }`}
                >
                  <History className="w-3 h-3" />
                  <span>Sisa Slit / Week Lalu ({priorWeekCount})</span>
                </button>
              )}
            </div>

            {/* Day Filter */}
            {availableDays.length > 0 && (
              <div className="flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={dayFilter}
                  onChange={(e) => setDayFilter(e.target.value)}
                  className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-700 font-medium focus:ring-2 focus:ring-amber-500"
                >
                  <option value="all">Semua Hari</option>
                  {availableDays.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Bulk Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleResetToAuto}
              title="Reset pilihan sesuai saran otomatis hierarki sistem"
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Saran Sistem</span>
            </button>
            <button
              type="button"
              onClick={handleIgnoreAll}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1 shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Abaikan Semua</span>
            </button>
            <button
              type="button"
              onClick={handleIncludeAll}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-1 shadow-2xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Sertakan Semua</span>
            </button>
          </div>
        </div>

        {/* Table Content (Full Width, No Truncation, Natural Layout) */}
        {filteredItems.length === 0 ? (
          <div className="py-16 text-center text-slate-500 bg-slate-50/50">
            <Scissors className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">
              Tidak ada data yang sesuai dengan filter atau pencarian
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Coba sesuaikan kata kunci atau ubah filter status di atas.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 w-14 text-center border-r border-slate-200">
                    Pilih
                  </th>
                  <th className="py-3 px-3 w-28 border-r border-slate-200">
                    Hari / Sheet
                  </th>
                  <th className="py-3 px-3 w-28 border-r border-slate-200">
                    Kode Produk
                  </th>
                  <th className="py-3 px-3 min-w-[220px] border-r border-slate-200">
                    Nama Produk
                  </th>
                  <th className="py-3 px-3 text-right w-24 border-r border-slate-200">
                    Folding Mesin
                  </th>
                  <th className="py-3 px-3 text-right w-24 border-r border-slate-200">
                    Cutting
                  </th>
                  <th className="py-3 px-4 min-w-[320px] bg-slate-100 text-slate-900 font-bold border-r border-slate-200">
                    Alasan Hierarki & Status Ketergantungan
                  </th>
                  <th className="py-3 px-3 min-w-[200px] bg-amber-50/70 text-amber-950 font-bold border-r border-slate-200">
                    Keterangan Asli Excel
                  </th>
                  <th className="py-3 px-3 w-32 text-center">
                    Status Keputusan
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => handleToggle(item.id)}
                    className={`cursor-pointer transition-colors ${
                      item.isIncluded
                        ? 'bg-emerald-50/50 hover:bg-emerald-50'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Checkbox */}
                    <td
                      className="py-3 px-3 text-center border-r border-slate-200"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={item.isIncluded}
                        onChange={() => handleToggle(item.id)}
                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                      />
                    </td>

                    {/* Hari / Sheet */}
                    <td className="py-3 px-3 border-r border-slate-200">
                      <div className="space-y-1">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border ${getDayBadgeColor(
                            item.hari
                          )}`}
                        >
                          {item.hari}
                        </span>
                        {item.sheetName && item.sheetName !== item.hari && (
                          <div className="text-[10px] text-slate-500 font-mono font-medium">
                            {item.sheetName}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Kode Produk (Never cut off) */}
                    <td className="py-3 px-3 font-mono font-bold text-slate-900 border-r border-slate-200 text-xs">
                      {item.kode || '-'}
                    </td>

                    {/* Nama Produk (Full text wrap) */}
                    <td className="py-3 px-3 text-slate-800 font-medium border-r border-slate-200 leading-normal">
                      {item.namaProduk}
                    </td>

                    {/* Folding Mesin */}
                    <td className="py-3 px-3 text-right font-mono font-bold text-amber-700 border-r border-slate-200">
                      {item.folding > 0 ? item.folding.toLocaleString() : '-'}
                    </td>

                    {/* Cutting */}
                    <td className="py-3 px-3 text-right font-mono font-bold text-rose-700 border-r border-slate-200">
                      {item.cutting > 0 ? item.cutting.toLocaleString() : '-'}
                    </td>

                    {/* Alasan Hierarki & Status Ketergantungan (Full text, informative, no truncation) */}
                    <td className="py-3 px-4 border-r border-slate-200">
                      <div className="space-y-1.5">
                        {/* Badges */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {item.isPriorWeekSlit ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-200">
                              <History className="w-3 h-3 text-indigo-600" />
                              <span>Sisa Slit / Week Lalu</span>
                            </span>
                          ) : item.precedenceType === 'ignored_by_slitting' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-900 border border-amber-200">
                              <span>Lanjutan dari Slitting</span>
                            </span>
                          ) : item.precedenceType === 'ignored_by_folding' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                              <span>Lanjutan dari Folding</span>
                            </span>
                          ) : item.precedenceType === 'included_folding' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                              <span>Folding Mandiri (Tarik Bahan)</span>
                            </span>
                          ) : item.precedenceType === 'included_cutting' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                              <span>Cutting Mandiri (Tarik Bahan)</span>
                            </span>
                          ) : null}

                          {item.recommendedSumber && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 font-mono text-slate-700 font-bold border border-slate-200">
                              Sumber: {item.recommendedSumber}
                            </span>
                          )}
                        </div>

                        {/* Full Explanation Text */}
                        <p className="text-[11px] text-slate-700 leading-relaxed font-normal">
                          {item.precedenceReason ||
                            (item.reason === 'only_folding_cutting'
                              ? 'Murni pengerjaan Folding & Cutting'
                              : 'Pengerjaan campuran')}
                        </p>

                        {/* Prior Week Source Reference if matched */}
                        {item.priorWeekSource && (
                          <div className="text-[10px] font-mono text-indigo-800 bg-indigo-50 px-2 py-1 rounded border border-indigo-200/80 inline-block leading-tight">
                            📁 {item.priorWeekSource.fileName} ({item.priorWeekSource.day} - Slit {item.priorWeekSource.slittingQty?.toLocaleString()})
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Keterangan Asli Excel (Full, bold, no cutoff) */}
                    <td className="py-3 px-3 border-r border-slate-200 bg-amber-50/20">
                      {item.keterangan && item.keterangan !== '-' ? (
                        <div className="inline-block px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-100 text-amber-950 border border-amber-300 font-mono leading-normal">
                          {item.keterangan}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">
                          (Tanpa keterangan)
                        </span>
                      )}
                    </td>

                    {/* Status Keputusan Action */}
                    <td className="py-3 px-3 text-center">
                      {item.isIncluded ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggle(item.id);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200 transition-colors shadow-2xs"
                        >
                          <Check className="w-3 h-3" />
                          <span>Disertakan</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggle(item.id);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition-colors"
                        >
                          <span>Diabaikan</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Bar with Live Counts & Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-600">
            Menampilkan <strong>{filteredItems.length}</strong> dari {localItems.length} item ·{' '}
            <strong className="text-emerald-700">{includedCount} Disertakan</strong> (menarik bahan baku) ·{' '}
            <strong className="text-amber-800">{ignoredCount} Diabaikan</strong> (proses lanjutan / sisa slit)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateBack}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 transition-colors rounded-lg"
            >
              Kembali
            </button>
            <button
              onClick={handleSaveAndReturn}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
            >
              <span>Simpan & Terapkan ({includedCount} Disertakan)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
