import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload,
  X,
  Clipboard,
  Check,
  AlertCircle,
  FileSpreadsheet,
  ArrowRight,
  Layers,
  Scissors,
  Calendar,
  Trash2,
  Clock,
  History,
  RotateCcw,
} from 'lucide-react';
import {
  parseExcelWorkbook,
  parsePastedTabularData,
  ParseResult,
  filterProcessRowsByFoldingCutting,
  autoConvertProcessToRekap,
  extractFoldingCuttingItems,
} from '../utils/excelParser';
import {
  DailyProcessRow,
  MaterialRekapRow,
  MasterCodeMapping,
  FoldingCuttingItem,
  PriorWeekPlanMeta,
} from '../types/material';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterCodes: MasterCodeMapping[];
  priorWeekRows: DailyProcessRow[];
  priorWeekMeta: PriorWeekPlanMeta | null;
  onSavePriorWeekPlan: (rows: DailyProcessRow[], meta: PriorWeekPlanMeta) => void;
  onClearPriorWeekPlan: () => void;
  onApplyData: (result: {
    fileType: 'dailyProcess' | 'materialRekap';
    processRows?: DailyProcessRow[];
    rawProcessRows?: DailyProcessRow[];
    materialRows?: MaterialRekapRow[];
    detectedFoldingCutting?: FoldingCuttingItem[];
    sheetName: string;
  }) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  masterCodes,
  priorWeekRows,
  priorWeekMeta,
  onSavePriorWeekPlan,
  onClearPriorWeekPlan,
  onApplyData,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'priorWeek'>('upload');
  const [pastedText, setPastedText] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [dragOverPrior, setDragOverPrior] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingPrior, setLoadingPrior] = useState(false);
  const [priorSuccess, setPriorSuccess] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [selectedSheetMode, setSelectedSheetMode] = useState<string>('ALL'); // 'ALL' or specific sheet name
  const [detectedFC, setDetectedFC] = useState<FoldingCuttingItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const priorFileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      processFile(files[0]);
    }
  };

  const processFile = async (file: File) => {
    setLoading(true);
    setParseResult(null);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      // Sertakan priorWeekRows dan nama filenya agar cross-week matching berjalan otomatis
      const res = parseExcelWorkbook(wb, masterCodes, priorWeekRows, priorWeekMeta?.fileName);
      setParseResult(res);
      setDetectedFC(res.detectedFoldingCutting || []);
      setSelectedSheetMode('ALL'); // Default to import all sheets
    } catch (err) {
      setParseResult({
        fileType: 'unknown',
        sheets: [],
        activeSheet: '',
        error: `Gagal membaca file: ${err instanceof Error ? err.message : 'Format file tidak didukung.'}`,
      });
      setDetectedFC([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePasteSubmit = () => {
    if (!pastedText.trim()) return;
    setLoading(true);
    try {
      const res = parsePastedTabularData(pastedText, masterCodes, priorWeekRows, priorWeekMeta?.fileName);
      setParseResult(res);
      setDetectedFC(res.detectedFoldingCutting || []);
      setSelectedSheetMode('ALL');
    } catch (err) {
      setParseResult({
        fileType: 'unknown',
        sheets: [],
        activeSheet: '',
        error: `Gagal memproses data teks: ${err instanceof Error ? err.message : 'Format tidak valid.'}`,
      });
      setDetectedFC([]);
    } finally {
      setLoading(false);
    }
  };

  // Upload & proses file plan minggu sebelumnya
  const processPriorWeekFile = async (file: File) => {
    setLoadingPrior(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const parsed = parseExcelWorkbook(wb, masterCodes);
      const rawRows = parsed.rawProcessRows || [];
      const slittingCount = rawRows.filter((r) => (Number(r.slitting) || 0) > 0).length;

      const meta: PriorWeekPlanMeta = {
        fileName: file.name,
        uploadedAt: new Date().toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        totalRows: rawRows.length,
        slittingItemCount: slittingCount,
      };

      onSavePriorWeekPlan(rawRows, meta);
      setPriorSuccess(`Berhasil memuat file minggu lalu: ${file.name} (${rawRows.length} baris, ${slittingCount} item Slitting)`);
      setTimeout(() => setPriorSuccess(null), 4000);

      // Jika file aktif minggu ini sudah diparse di layar, evaluasi ulang dengan acuan minggu lalu yang baru
      if (parseResult && parseResult.rawProcessRows) {
        const reEvaluatedFC = extractFoldingCuttingItems(parseResult.rawProcessRows, rawRows, file.name);
        setDetectedFC(reEvaluatedFC);
      }
    } catch (err) {
      alert(`Gagal membaca file minggu sebelumnya: ${err instanceof Error ? err.message : 'Format tidak didukung'}`);
    } finally {
      setLoadingPrior(false);
    }
  };

  const handleToggleFC = (id: string) => {
    setDetectedFC((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isIncluded: !item.isIncluded } : item
      )
    );
  };

  // Hitung baris efektif sesuai keputusan
  const getEffectiveRows = () => {
    if (!parseResult) return { processRows: [], rawProcessRows: [], materialRows: [], label: '' };

    let rawRows: DailyProcessRow[] = [];
    let label = '';

    if (parseResult.sheetDetails && parseResult.sheetDetails.length > 0) {
      if (selectedSheetMode === 'ALL') {
        rawRows = parseResult.rawProcessRows || parseResult.dailyProcessRows || [];
        label = `Semua Lembar (${parseResult.sheetDetails.length} Hari)`;
      } else {
        const detail = parseResult.sheetDetails.find((d) => d.sheetName === selectedSheetMode);
        if (detail) {
          rawRows = detail.rawProcessRows || detail.processRows;
          label = `${detail.sheetName} (${detail.dayName})`;
        }
      }
    } else {
      rawRows = parseResult.rawProcessRows || parseResult.dailyProcessRows || [];
      label = parseResult.activeSheet || 'Rencana Proses';
    }

    const filteredProcess = filterProcessRowsByFoldingCutting(rawRows, detectedFC);
    const filteredMaterial = autoConvertProcessToRekap(filteredProcess, label, masterCodes);

    return {
      processRows: filteredProcess,
      rawProcessRows: rawRows,
      materialRows: filteredMaterial,
      label,
    };
  };

  const handleApply = () => {
    if (!parseResult) return;
    const effective = getEffectiveRows();

    onApplyData({
      fileType: 'dailyProcess',
      processRows: effective.processRows,
      rawProcessRows: effective.rawProcessRows,
      materialRows: effective.materialRows,
      detectedFoldingCutting: detectedFC,
      sheetName: effective.label,
    });
    onClose();
  };

  const effective = getEffectiveRows();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">
              Impor Data Excel & Sinkronisasi Jadwal (.xlsx)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-slate-200 px-6 bg-white gap-4 pt-2">
          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'upload'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-4 h-4" />
            Upload Plan Minggu Berjalan (.xlsx)
          </button>

          <button
            onClick={() => setActiveTab('paste')}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'paste'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clipboard className="w-4 h-4" />
            Tempel Data (Copy-Paste)
          </button>

          <button
            onClick={() => setActiveTab('priorWeek')}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'priorWeek'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4 text-indigo-600" />
            <span>Plan Minggu Sebelumnya</span>
            {priorWeekMeta ? (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-800 font-bold">
                Aktif
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-500">
                Kosong
              </span>
            )}
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'upload' && (
            <div>
              {/* Prior Week Banner Note */}
              {priorWeekMeta && (
                <div className="mb-3 px-3.5 py-2.5 bg-indigo-50/80 border border-indigo-200 rounded-lg text-xs text-indigo-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>
                      Data Acuan Minggu Lalu Aktif: <strong>{priorWeekMeta.fileName}</strong> ({priorWeekMeta.slittingItemCount} item Slitting). Sistem akan mencocokkan sisa slit otomatis.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('priorWeek')}
                    className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 underline shrink-0"
                  >
                    Kelola File
                  </button>
                </div>
              )}

              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-emerald-500 bg-emerald-50/50'
                    : 'border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                />
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-emerald-600 shadow-xs mx-auto mb-3 border border-slate-200">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-800 mb-1">
                  Klik untuk pilih file rencana minggu ini atau tarik file ke sini
                </p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Mendukung file multi-sheet per hari (Senin s/d Sabtu) dengan deteksi hierarki otomatis (Slitting → Folding → Cutting).
                </p>
              </div>
            </div>
          )}

          {activeTab === 'paste' && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700">
                Salin baris tabel dari Google Sheets / Excel lalu tempel di bawah:
              </label>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="No&#9;Kode&#9;Nama Produk&#9;Slitting&#9;Folding&#9;Cutting&#9;Total&#9;Keterangan&#10;1&#9;S0791&#9;HOS PAK GAUZE SWABS...&#9;0&#9;0&#9;10000&#9;10000&#9;SISA CUT W1"
                rows={7}
                className="w-full text-xs font-mono p-3 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-slate-50"
              />
              <button
                onClick={handlePasteSubmit}
                disabled={!pastedText.trim()}
                className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                Proses Data Tempelan
              </button>
            </div>
          )}

          {activeTab === 'priorWeek' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-lg text-xs text-indigo-950 flex items-start gap-2.5">
                <History className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Manfaat Upload File Plan Minggu Sebelumnya:</p>
                  <p className="text-[11px] text-indigo-900 leading-relaxed">
                    Sistem akan menyimpan dan memeriksa data pengerjaan <strong>Slitting</strong> minggu lalu secara silang. Jika pada minggu ini terdapat order Folding atau Cutting dengan kode yang sama, sistem langsung mendeteksi bahwa bahan fisiknya sudah di-slit di minggu lalu sehingga tidak perlu meminta bahan mentah baru (*No. MR*) ke gudang!
                  </p>
                </div>
              </div>

              {priorSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-xs font-semibold text-emerald-800 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>{priorSuccess}</span>
                </div>
              )}

              {/* Status File Minggu Lalu Saat Ini */}
              {priorWeekMeta ? (
                <div className="p-4 bg-white border border-indigo-200 rounded-xl space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{priorWeekMeta.fileName}</h4>
                        <p className="text-[11px] text-slate-500">Diunggah: {priorWeekMeta.uploadedAt}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onClearPriorWeekPlan}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md border border-rose-200 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Arsip</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-slate-500 text-[11px] block">Total Baris Pengerjaan</span>
                      <strong className="text-slate-900 font-mono text-sm">{priorWeekMeta.totalRows} baris</strong>
                    </div>
                    <div className="p-2.5 bg-indigo-50/80 rounded-lg border border-indigo-200">
                      <span className="text-indigo-700 text-[11px] block">Kode Slitting Terdeteksi</span>
                      <strong className="text-indigo-900 font-mono text-sm">{priorWeekMeta.slittingItemCount} item</strong>
                    </div>
                  </div>

                  {/* Cuplikan Item Slitting Minggu Lalu */}
                  {priorWeekRows.filter((r) => (Number(r.slitting) || 0) > 0).length > 0 && (
                    <div className="pt-2">
                      <span className="text-[11px] font-bold text-slate-700 block mb-1.5">
                        Daftar Kode Slitting Minggu Lalu (Acuan Sisa Slit):
                      </span>
                      <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-md text-[11px]">
                        <table className="w-full text-left font-mono">
                          <thead className="bg-slate-100 text-slate-700 sticky top-0 font-semibold font-sans">
                            <tr>
                              <th className="py-1 px-2 border-r border-slate-200">Kode</th>
                              <th className="py-1 px-2 border-r border-slate-200 font-sans">Nama Produk</th>
                              <th className="py-1 px-2 text-right border-r border-slate-200">Slitting</th>
                              <th className="py-1 px-2 font-sans">Hari / Sheet</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-800">
                            {priorWeekRows
                              .filter((r) => (Number(r.slitting) || 0) > 0)
                              .slice(0, 15)
                              .map((r, i) => (
                                <tr key={i} className="hover:bg-slate-50">
                                  <td className="py-1 px-2 font-bold text-indigo-700 border-r border-slate-200">{r.kode}</td>
                                  <td className="py-1 px-2 truncate max-w-[180px] font-sans border-r border-slate-200">{r.namaProduk}</td>
                                  <td className="py-1 px-2 text-right font-bold text-slate-900 border-r border-slate-200">{(Number(r.slitting) || 0).toLocaleString()}</td>
                                  <td className="py-1 px-2 font-sans text-slate-600">{r.hari || r.sheetName}</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Dropzone untuk Ganti / Upload Baru */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOverPrior(true); }}
                onDragLeave={() => setDragOverPrior(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverPrior(false);
                  if (e.dataTransfer.files?.[0]) processPriorWeekFile(e.dataTransfer.files[0]);
                }}
                onClick={() => priorFileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  dragOverPrior
                    ? 'border-indigo-500 bg-indigo-50/50'
                    : 'border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <input
                  type="file"
                  ref={priorFileInputRef}
                  onChange={(e) => {
                    if (e.target.files?.[0]) processPriorWeekFile(e.target.files[0]);
                  }}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                />
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-indigo-600 shadow-xs mx-auto mb-2 border border-slate-200">
                  <History className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-800 mb-0.5">
                  {priorWeekMeta ? 'Klik untuk mengganti berkas minggu sebelumnya' : 'Klik untuk unggah file jadwal minggu sebelumnya (.xlsx)'}
                </p>
                <p className="text-[11px] text-slate-500">
                  Sistem membaca stasiun Slitting dari seluruh sheet hari di minggu lalu.
                </p>
              </div>

              {loadingPrior && (
                <div className="p-3 bg-indigo-50 rounded-lg text-center text-xs text-indigo-700 font-medium">
                  Sedang membaca berkas minggu sebelumnya...
                </div>
              )}
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="p-4 bg-slate-100 rounded-lg text-center text-xs text-slate-600 font-medium">
              Memproses dan membaca seluruh lembar kerja spreadsheet...
            </div>
          )}

          {/* Parse Result Preview (Only for upload or paste tab) */}
          {activeTab !== 'priorWeek' && parseResult && !loading && (
            <div
              className={`p-4 rounded-xl border ${
                parseResult.error
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-emerald-50/70 border-emerald-200 text-slate-800'
              }`}
            >
              {parseResult.error ? (
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-rose-800">Gagal Membaca File</h4>
                    <p className="text-xs text-rose-700 mt-0.5">{parseResult.error}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-emerald-900">
                        {parseResult.sheetDetails && parseResult.sheetDetails.length > 1
                          ? `Terdeteksi: Multi-Sheets (${parseResult.sheetDetails.length} Hari Kerja)`
                          : 'Terdeteksi: File Rencana Proses Produksi'}
                      </span>
                    </div>
                    <span className="text-xs font-mono bg-white px-2 py-0.5 rounded border border-emerald-300 text-emerald-800 font-semibold">
                      {effective.processRows.length} Baris Produk
                    </span>
                  </div>

                  {/* Multi-sheet Mode Selector */}
                  {parseResult.sheetDetails && parseResult.sheetDetails.length > 1 && (
                    <div className="bg-white p-3 rounded-lg border border-emerald-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Pilih Cakupan Impor Lembar Kerja (Sheets):</span>
                        </span>
                        <span className="text-[11px] text-emerald-700 font-medium">
                          Bawaan: Ambil Semua Hari
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedSheetMode('ALL')}
                          className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors flex items-center gap-1.5 ${
                            selectedSheetMode === 'ALL'
                              ? 'bg-emerald-700 text-white shadow-2xs'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          <span>🌟 Ambil Semua Lembar ({parseResult.sheetDetails.length} Hari Sekaligus)</span>
                        </button>

                        {parseResult.sheetDetails.map((detail) => (
                          <button
                            type="button"
                            key={detail.sheetName}
                            onClick={() => setSelectedSheetMode(detail.sheetName)}
                            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                              selectedSheetMode === detail.sheetName
                                ? 'bg-slate-900 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {detail.sheetName} ({detail.dayName}: {detail.rowCount} baris)
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dedicated Folding & Cutting Section with Hierarchical Notes */}
                  {detectedFC.length > 0 && (
                    <div className="bg-white rounded-lg border border-amber-300 overflow-hidden shadow-2xs">
                      <div className="px-3.5 py-2.5 bg-amber-50/90 border-b border-amber-200 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Scissors className="w-4 h-4 text-amber-700" />
                          <span className="text-xs font-bold text-amber-950">
                            Deteksi Bagian Folding & Cutting ({detectedFC.length} Item)
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-600">
                          {detectedFC.filter((i) => i.isIncluded).length} Disertakan · {detectedFC.filter((i) => !i.isIncluded).length} Diabaikan Otomatis
                        </span>
                      </div>

                      <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 text-xs">
                        {detectedFC.map((fc) => (
                          <div
                            key={fc.id}
                            className={`p-2.5 flex items-start justify-between gap-3 ${
                              fc.isIncluded ? 'bg-emerald-50/50' : 'bg-white'
                            }`}
                          >
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-slate-900">{fc.kode}</span>
                                <span className="text-slate-700 font-medium">{fc.namaProduk}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                                  {fc.hari}
                                </span>
                                {fc.isPriorWeekSlit && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold">
                                    Sisa Slit Minggu Lalu
                                  </span>
                                )}
                              </div>

                              {/* Alasan Hierarki Kronologis / Sisa Slit */}
                              {fc.precedenceReason && (
                                <p className="text-[11px] text-slate-600 leading-tight">
                                  💡 <em>{fc.precedenceReason}</em>
                                </p>
                              )}

                              <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                                {fc.folding > 0 && <span>Folding: <strong>{fc.folding.toLocaleString()}</strong></span>}
                                {fc.cutting > 0 && <span>Cutting: <strong>{fc.cutting.toLocaleString()}</strong></span>}
                                {fc.slitting > 0 && <span>Slitting: <strong>{fc.slitting.toLocaleString()}</strong></span>}
                              </div>
                            </div>

                            <label className="flex items-center gap-1.5 shrink-0 cursor-pointer pt-0.5">
                              <input
                                type="checkbox"
                                checked={fc.isIncluded}
                                onChange={() => handleToggleFC(fc.id)}
                                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                              />
                              <span className="text-[11px] font-semibold text-slate-700">
                                {fc.isIncluded ? 'Sertakan' : 'Abaikan'}
                              </span>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Preview of auto-generated Rekap Material */}
                  {effective.materialRows.length > 0 && (
                    <div className="mt-3 bg-white rounded-lg border border-emerald-200 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">
                          Hasil Rekap Material Mesin ({effective.label}):
                        </span>
                        <span className="text-[11px] text-emerald-700 font-semibold font-mono">
                          {effective.materialRows.length} Bahan Baku Dihasilkan
                        </span>
                      </div>

                      <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-md">
                        <table className="w-full text-left text-[11px]">
                          <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0">
                            <tr>
                              <th className="py-1 px-2 border-r border-slate-200">Nama (Bahan Baku)</th>
                              <th className="py-1 px-2 text-right border-r border-slate-200">Total Qty</th>
                              <th className="py-1 px-2 text-center border-r border-slate-200">Hari</th>
                              <th className="py-1 px-1.5 text-center border-r border-slate-200">Sumber</th>
                              <th className="py-1 px-1.5 text-center border-r border-slate-200">Status</th>
                              <th className="py-1 px-2">Keterangan (Kode Produk)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono text-slate-800">
                            {effective.materialRows.slice(0, 10).map((m, i) => (
                              <tr key={i} className="hover:bg-slate-50">
                                <td className="py-1 px-2 font-semibold text-slate-900 border-r border-slate-200">
                                  {m.nama}
                                </td>
                                <td className="py-1 px-2 text-right font-bold text-emerald-700 border-r border-slate-200">
                                  {m.qty.toLocaleString()}
                                </td>
                                <td className="py-1 px-2 text-center border-r border-slate-200 font-sans text-slate-600 font-medium">
                                  {m.hari}
                                </td>
                                <td className="py-1 px-1.5 text-center border-r border-slate-200 text-rose-700 font-semibold">
                                  {m.sumber}
                                </td>
                                <td className="py-1 px-1.5 text-center border-r border-slate-200 text-rose-700 font-semibold">
                                  {m.status}
                                </td>
                                <td className="py-1 px-2 text-slate-700 font-sans truncate max-w-[200px]" title={m.keterangan}>
                                  {m.keterangan || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
          >
            Tutup
          </button>

          {activeTab !== 'priorWeek' && (
            <button
              onClick={handleApply}
              disabled={!parseResult || !!parseResult.error}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50 transition-colors shadow-xs"
            >
              <span>Terapkan ({effective.processRows.length} Baris Produk)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {activeTab === 'priorWeek' && (
            <button
              onClick={() => setActiveTab('upload')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
            >
              <span>Kembali ke Upload Jadwal Aktif</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
