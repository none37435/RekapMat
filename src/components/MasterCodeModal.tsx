import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MasterCodeMapping } from '../types/material';
import {
  Database,
  Plus,
  Trash2,
  Search,
  RotateCcw,
  X,
  Check,
  Tag,
  Pencil,
  Save,
  AlertCircle,
  Download,
  Upload,
  Cloud,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';
import {
  INITIAL_MASTER_CODES,
  sanitizeMasterCodes,
  resetMasterCodeMappings,
  exportMasterCodesToJson,
  exportMasterCodesToCsv,
  parseMasterCodesFromCsv,
} from '../utils/masterCodeStorage';
import {
  getSavedGasUrl,
  fetchMasterCodesFromGas,
  saveMasterCodesToGas,
} from '../services/googleSheets';
import * as XLSX from 'xlsx';

interface MasterCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterCodes: MasterCodeMapping[];
  onSaveMasterCodes: (codes: MasterCodeMapping[]) => void;
}

export const MasterCodeModal: React.FC<MasterCodeModalProps> = ({
  isOpen,
  onClose,
  masterCodes,
  onSaveMasterCodes,
}) => {
  const [list, setList] = useState<MasterCodeMapping[]>(() => sanitizeMasterCodes(masterCodes));
  const [search, setSearch] = useState('');

  // Top Form State
  const [newKode, setNewKode] = useState('');
  const [newBahan, setNewBahan] = useState('24/20');
  const [newJenis, setNewJenis] = useState<'Kasa Lipat' | 'Kasa Roll'>('Kasa Lipat');
  const [newCatatan, setNewCatatan] = useState('');
  const [editingTargetKode, setEditingTargetKode] = useState<string | null>(null);

  // Inline Table Edit State
  const [inlineEditKode, setInlineEditKode] = useState<string | null>(null);
  const [inlineEditData, setInlineEditData] = useState<MasterCodeMapping | null>(null);

  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const gasUrl = getSavedGasUrl();

  // Dialog konfirmasi in-app
  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'delete' | 'reset';
    kode?: string;
  } | null>(null);

  // Sinkronisasi list internal ketika props masterCodes berubah
  useEffect(() => {
    if (isOpen) {
      setList(sanitizeMasterCodes(masterCodes));
    }
  }, [masterCodes, isOpen]);

  // Daftar aman yang dijamin berupa array valid
  const safeList = useMemo(() => {
    return Array.isArray(list) && list.length > 0 ? list : sanitizeMasterCodes(INITIAL_MASTER_CODES);
  }, [list]);

  // Filter pencarian dengan proteksi nilai undefined/null
  const filtered = useMemo(() => {
    const q = (search || '').trim().toLowerCase();
    if (!q) return safeList;

    return safeList.filter((m) => {
      if (!m) return false;
      const kode = String(m.kode || '').toLowerCase();
      const bahan = String(m.bahanBaku || '').toLowerCase();
      const catatan = String(m.catatan || '').toLowerCase();
      return kode.includes(q) || bahan.includes(q) || catatan.includes(q);
    });
  }, [safeList, search]);

  if (!isOpen) return null;

  const triggerSuccess = (msg: string) => {
    setSavedSuccess(msg);
    setTimeout(() => setSavedSuccess(null), 3000);
  };

  // Handle Form Submit (Tambah atau Perbarui)
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKode = (newKode || '').trim().toUpperCase();
    if (!cleanKode) return;

    const newItem: MasterCodeMapping = {
      kode: cleanKode,
      bahanBaku: (newBahan || '').trim() || '24/20',
      jenis: newJenis,
      catatan: (newCatatan || '').trim() || undefined,
    };

    let updatedList: MasterCodeMapping[];

    if (editingTargetKode) {
      const targetUpper = editingTargetKode.toUpperCase();
      updatedList = safeList.map((m) =>
        m && m.kode && m.kode.toUpperCase() === targetUpper ? newItem : m
      );
      setEditingTargetKode(null);
      triggerSuccess(`Kode master ${cleanKode} berhasil diperbarui!`);
    } else {
      const existingIndex = safeList.findIndex(
        (m) => m && m.kode && m.kode.toUpperCase() === cleanKode
      );
      if (existingIndex >= 0) {
        updatedList = [...safeList];
        updatedList[existingIndex] = newItem;
        triggerSuccess(`Kode master ${cleanKode} berhasil diperbarui!`);
      } else {
        updatedList = [newItem, ...safeList];
        triggerSuccess(`Kode master ${cleanKode} berhasil ditambahkan!`);
      }
    }

    const sanitized = sanitizeMasterCodes(updatedList);
    setList(sanitized);
    onSaveMasterCodes(sanitized);
    setNewKode('');
    setNewCatatan('');
    setNewBahan('24/20');
  };

  const handleCancelFormEdit = () => {
    setEditingTargetKode(null);
    setNewKode('');
    setNewBahan('24/20');
    setNewCatatan('');
  };

  // Mulai mode edit pada formulir atas
  const handleStartFormEdit = (item: MasterCodeMapping) => {
    if (!item) return;
    setEditingTargetKode(item.kode || '');
    setNewKode(item.kode || '');
    setNewBahan(item.bahanBaku || '24/20');
    setNewJenis(item.jenis === 'Kasa Roll' ? 'Kasa Roll' : 'Kasa Lipat');
    setNewCatatan(item.catatan || '');
    setInlineEditKode(null);
    setInlineEditData(null);
  };

  // Mulai mode inline edit di baris tabel
  const handleStartInlineEdit = (item: MasterCodeMapping) => {
    if (!item) return;
    setInlineEditKode(item.kode || '');
    setInlineEditData({
      kode: item.kode || '',
      bahanBaku: item.bahanBaku || '24/20',
      jenis: item.jenis === 'Kasa Roll' ? 'Kasa Roll' : 'Kasa Lipat',
      catatan: item.catatan || '',
    });
  };

  // Simpan inline row edit
  const handleSaveInlineEdit = () => {
    if (!inlineEditData || !inlineEditKode) return;
    const cleanKode = (inlineEditData.kode || '').trim().toUpperCase();
    if (!cleanKode) return;

    const targetUpper = inlineEditKode.toUpperCase();
    const updatedList = safeList.map((m) => {
      if (m && m.kode && m.kode.toUpperCase() === targetUpper) {
        return {
          ...inlineEditData,
          kode: cleanKode,
          bahanBaku: (inlineEditData.bahanBaku || '').trim() || '24/20',
          jenis: inlineEditData.jenis === 'Kasa Roll' ? ('Kasa Roll' as const) : ('Kasa Lipat' as const),
          catatan: (inlineEditData.catatan || '').trim() || undefined,
        };
      }
      return m;
    });

    const sanitized = sanitizeMasterCodes(updatedList);
    setList(sanitized);
    onSaveMasterCodes(sanitized);
    setInlineEditKode(null);
    setInlineEditData(null);
    triggerSuccess(`Perubahan pada ${cleanKode} berhasil disimpan!`);
  };

  const handleCancelInlineEdit = () => {
    setInlineEditKode(null);
    setInlineEditData(null);
  };

  const handleDelete = (kodeToDelete: string) => {
    if (!kodeToDelete) return;
    setConfirmDialog({ type: 'delete', kode: kodeToDelete });
  };

  const executeDelete = (kodeToDelete: string) => {
    const targetUpper = (kodeToDelete || '').toUpperCase();
    const updated = safeList.filter((m) => m && m.kode && m.kode.toUpperCase() !== targetUpper);
    const sanitized = sanitizeMasterCodes(updated);
    setList(sanitized);
    onSaveMasterCodes(sanitized);
    if (editingTargetKode && editingTargetKode.toUpperCase() === targetUpper) {
      handleCancelFormEdit();
    }
    setConfirmDialog(null);
    triggerSuccess(`Kode master ${kodeToDelete} dihapus.`);
  };

  const handleResetDefaults = () => {
    setConfirmDialog({ type: 'reset' });
  };

  const executeResetDefaults = () => {
    const defaults = resetMasterCodeMappings();
    setList(defaults);
    onSaveMasterCodes(defaults);
    handleCancelFormEdit();
    handleCancelInlineEdit();
    setConfirmDialog(null);
    triggerSuccess('Master kode berhasil dikembalikan ke standar pabrik!');
  };

  // Ekspor JSON
  const handleExportJson = () => {
    exportMasterCodesToJson(safeList);
    triggerSuccess('Master kode berhasil diekspor ke format JSON!');
  };

  // Ekspor CSV
  const handleExportCsv = () => {
    exportMasterCodesToCsv(safeList);
    triggerSuccess('Master kode berhasil diekspor ke format CSV!');
  };

  // Impor File (JSON / CSV / Excel)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileName = file.name.toLowerCase();
      let importedItems: MasterCodeMapping[] = [];

      if (fileName.endsWith('.json')) {
        const text = await file.text();
        const parsed = JSON.parse(text);
        importedItems = sanitizeMasterCodes(parsed);
      } else if (fileName.endsWith('.csv')) {
        const text = await file.text();
        importedItems = parseMasterCodesFromCsv(text);
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rawJson: (string | number)[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (rawJson.length > 1) {
          const header = rawJson[0].map((h) => String(h || '').toLowerCase());
          const kodeIdx = header.findIndex((h) => h.includes('kode') || h.includes('code'));
          const bahanIdx = header.findIndex((h) => h.includes('bahan') || h.includes('material'));
          const jenisIdx = header.findIndex((h) => h.includes('jenis') || h.includes('type'));
          const catIdx = header.findIndex((h) => h.includes('catatan') || h.includes('note') || h.includes('keterangan'));

          const listItems: MasterCodeMapping[] = [];
          for (let i = 1; i < rawJson.length; i++) {
            const row = rawJson[i];
            if (!row || row.length === 0) continue;
            const kode = kodeIdx >= 0 ? String(row[kodeIdx] || '').trim() : String(row[0] || '').trim();
            const bahan = bahanIdx >= 0 ? String(row[bahanIdx] || '').trim() : String(row[1] || '').trim();
            const jenis = jenisIdx >= 0 ? String(row[jenisIdx] || '').trim() : 'Kasa Lipat';
            const catatan = catIdx >= 0 ? String(row[catIdx] || '').trim() : undefined;

            if (kode) {
              listItems.push({
                kode: kode.toUpperCase(),
                bahanBaku: bahan || '24/20',
                jenis: jenis.toLowerCase().includes('roll') ? 'Kasa Roll' : 'Kasa Lipat',
                catatan: catatan || undefined,
              });
            }
          }
          importedItems = sanitizeMasterCodes(listItems);
        }
      }

      if (importedItems.length === 0) {
        alert('Tidak ditemukan data master kode yang valid di dalam file.');
        return;
      }

      // Gabungkan dengan master kode yang ada (kode sama akan diperbarui)
      const mergedMap = new Map<string, MasterCodeMapping>();
      safeList.forEach((m) => mergedMap.set(m.kode.toUpperCase(), m));
      importedItems.forEach((m) => mergedMap.set(m.kode.toUpperCase(), m));

      const mergedList = sanitizeMasterCodes(Array.from(mergedMap.values()));
      setList(mergedList);
      onSaveMasterCodes(mergedList);
      triggerSuccess(`Berhasil mengimpor ${importedItems.length} master kode dari ${file.name}!`);
    } catch (err) {
      alert(`Gagal membaca berkas: ${err instanceof Error ? err.message : 'Format tidak didukung'}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Cloud Real-Time Pull (Ambil dari Google Sheets)
  const handleCloudPull = async () => {
    if (!gasUrl) {
      alert('URL Google Apps Script belum diisi. Silakan atur URL di menu Sinkronisasi Google Sheets terlebih dahulu.');
      return;
    }

    setIsCloudSyncing(true);
    try {
      const cloudCodes = await fetchMasterCodesFromGas(gasUrl);
      setIsCloudSyncing(false);
      if (cloudCodes && cloudCodes.length > 0) {
        const sanitized = sanitizeMasterCodes(cloudCodes);
        setList(sanitized);
        onSaveMasterCodes(sanitized);
        triggerSuccess(`Berhasil menarik ${sanitized.length} master kode dari cloud Google Sheets!`);
      } else {
        alert('Sheet "Master_Kode" di Google Sheets Anda masih kosong.');
      }
    } catch (err) {
      setIsCloudSyncing(false);
      alert(`Gagal mengambil dari cloud: ${err instanceof Error ? err.message : 'Koneksi error'}`);
    }
  };

  // Cloud Real-Time Push (Kirim ke Google Sheets)
  const handleCloudPush = async () => {
    if (!gasUrl) {
      alert('URL Google Apps Script belum diisi. Silakan atur URL di menu Sinkronisasi Google Sheets terlebih dahulu.');
      return;
    }

    setIsCloudSyncing(true);
    try {
      const ok = await saveMasterCodesToGas(gasUrl, safeList);
      setIsCloudSyncing(false);
      if (ok) {
        triggerSuccess(`Berhasil menyimpan ${safeList.length} master kode ke cloud Google Sheets (Real-Time di semua device)!`);
      } else {
        alert('Gagal menyimpan ke cloud.');
      }
    } catch (err) {
      setIsCloudSyncing(false);
      alert(`Gagal menyimpan ke cloud: ${err instanceof Error ? err.message : 'Koneksi error'}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="relative bg-white rounded-xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Sistem Master Data Kode Produk & Bahan Baku (Real-Time)
              </h2>
              <p className="text-xs text-slate-500">
                Tersinkronisasi otomatis di semua device & mendukung ekspor/impor multi-format
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-md transition-colors"
            title="Tutup dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Real-time Cloud Status & Action Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${gasUrl ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
              <span className="font-semibold text-slate-800">
                {gasUrl ? 'Cloud Real-Time Aktif (Google Sheets)' : 'Penyimpanan Lokal Aktif (Atur URL Sheets untuk Cloud Multi-Device)'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {gasUrl && (
                <>
                  <button
                    type="button"
                    onClick={handleCloudPull}
                    disabled={isCloudSyncing}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-300 rounded-md transition-colors disabled:opacity-50"
                    title="Tarik data master kode terbaru dari Google Sheets"
                  >
                    <Cloud className={`w-3.5 h-3.5 ${isCloudSyncing ? 'animate-bounce' : ''}`} />
                    <span>Tarik dari Cloud</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCloudPush}
                    disabled={isCloudSyncing}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 font-semibold text-emerald-800 bg-emerald-100/90 hover:bg-emerald-200 border border-emerald-300 rounded-md transition-colors disabled:opacity-50"
                    title="Kirim seluruh master kode ke sheet Master_Kode di Google Sheets"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCloudSyncing ? 'animate-spin' : ''}`} />
                    <span>Kirim ke Cloud</span>
                  </button>
                </>
              )}

              {/* Ekspor Dropdown / Buttons */}
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors shadow-2xs"
                title="Unduh master kode sebagai file CSV (Excel)"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Ekspor CSV</span>
              </button>

              <button
                type="button"
                onClick={handleExportJson}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors shadow-2xs"
                title="Unduh master kode sebagai file JSON"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Ekspor JSON</span>
              </button>

              {/* Impor Button */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".json,.csv,.xlsx,.xls"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 font-semibold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 rounded-md transition-colors shadow-2xs"
                title="Unggah dan gabungkan file JSON / CSV / Excel master kode"
              >
                <Upload className="w-3.5 h-3.5 text-indigo-600" />
                <span>Impor File</span>
              </button>
            </div>
          </div>

          {/* Success Feedback Alert */}
          {savedSuccess && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-lg p-3 text-xs flex items-center gap-2 animate-fade-in font-medium">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{savedSuccess}</span>
            </div>
          )}

          {/* Explanation Banner */}
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-950 flex items-start gap-2.5">
            <Tag className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Aturan Prioritas Master Kode & Sinkronisasi Real-Time:</p>
              <p className="text-slate-600 mt-0.5 leading-relaxed">
                Setiap kode yang terdaftar (seperti <strong>8320311RB</strong> &rarr; <strong>Needle Punch</strong>, <strong>S0791</strong> &rarr; <strong>24/20</strong>) langsung diprioritaskan. Kode yang <em>tidak terdaftar</em> otomatis berjenis <strong>Kasa Lipat</strong> secara bawaan.
              </p>
              <div className="mt-1.5 p-2 bg-emerald-100/70 rounded border border-emerald-300 text-[11px] text-emerald-900 font-medium">
                ✨ <strong>Multi-Bahan dalam 1 Kode:</strong> Tuliskan tanda tambah <code>+</code> atau <code>&</code> (contoh: <code>Carded Laps 87,5 + Bembliese</code>), dan sistem secara otomatis memetakan keduanya menjadi 2 baris terpisah di rekapitulasi!
              </div>
            </div>
          </div>

          {/* Form: Tambah / Edit Kode */}
          <form
            onSubmit={handleFormSubmit}
            className={`border rounded-lg p-4 space-y-3 transition-colors ${
              editingTargetKode ? 'bg-amber-50/70 border-amber-300' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                {editingTargetKode ? (
                  <>
                    <Pencil className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-amber-900">
                      Mode Edit Kode: <strong>{editingTargetKode}</strong>
                    </span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Tambah / Perbarui Master Kode Baru</span>
                  </>
                )}
              </div>

              {editingTargetKode && (
                <button
                  type="button"
                  onClick={handleCancelFormEdit}
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium underline"
                >
                  Batal Edit
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Kode Produk <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newKode}
                  onChange={(e) => setNewKode(e.target.value.toUpperCase())}
                  placeholder="Contoh: 8320311RB, S0791"
                  required
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-md font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Bahan Baku Target <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newBahan}
                  onChange={(e) => setNewBahan(e.target.value)}
                  placeholder="Contoh: 24/20, Needle Punch, SHQ"
                  required
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Jenis Mesin
                </label>
                <select
                  value={newJenis}
                  onChange={(e) => setNewJenis(e.target.value as 'Kasa Lipat' | 'Kasa Roll')}
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                >
                  <option value="Kasa Lipat">Kasa Lipat (Bawaan)</option>
                  <option value="Kasa Roll">Kasa Roll</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Catatan Keterangan
                </label>
                <input
                  type="text"
                  value={newCatatan}
                  onChange={(e) => setNewCatatan(e.target.value)}
                  placeholder="Opsional: Keterangan stasiun"
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-md shadow-2xs transition-colors ${
                  editingTargetKode
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {editingTargetKode ? (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan Perubahan Kode</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Simpan ke Master Data</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Search & Counter Strip */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari kode atau bahan..."
                className="w-full text-xs pl-8 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-mono">
                Total <strong>{safeList.length}</strong> Kode Master
              </span>
              <button
                type="button"
                onClick={handleResetDefaults}
                title="Reset ke kode bawaan standar pabrik"
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors"
              >
                <RotateCcw className="w-3 h-3 text-slate-500" />
                <span>Reset Standar</span>
              </button>
            </div>
          </div>

          {/* Master Table Grid with Inline Editing */}
          <div className="border border-slate-200 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0 border-b border-slate-200 select-none z-10 shadow-2xs">
                <tr>
                  <th className="py-2.5 px-3 border-r border-slate-200 w-36 font-mono">Kode Produk</th>
                  <th className="py-2.5 px-3 border-r border-slate-200 min-w-[180px]">Bahan Baku Target</th>
                  <th className="py-2.5 px-2.5 border-r border-slate-200 w-32 text-center">Jenis Mesin</th>
                  <th className="py-2.5 px-3 border-r border-slate-200">Catatan</th>
                  <th className="py-2.5 px-2 text-center w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Tidak ada kode master yang cocok dengan pencarian.
                    </td>
                  </tr>
                ) : (
                  filtered.map((item, idx) => {
                    if (!item) return null;
                    const itemKode = item.kode || `KODE-${idx}`;
                    const isInlineEditing = inlineEditKode && inlineEditKode.toUpperCase() === itemKode.toUpperCase();

                    if (isInlineEditing && inlineEditData) {
                      return (
                        <tr key={`edit-${itemKode}-${idx}`} className="bg-amber-50/80 border-y border-amber-300">
                          <td className="py-1.5 px-2 border-r border-slate-200 font-mono">
                            <input
                              type="text"
                              value={inlineEditData.kode}
                              onChange={(e) =>
                                setInlineEditData({ ...inlineEditData, kode: e.target.value.toUpperCase() })
                              }
                              className="w-full bg-white border border-slate-300 px-2 py-0.5 rounded text-xs font-mono font-bold"
                            />
                          </td>
                          <td className="py-1.5 px-2 border-r border-slate-200">
                            <input
                              type="text"
                              value={inlineEditData.bahanBaku}
                              onChange={(e) =>
                                setInlineEditData({ ...inlineEditData, bahanBaku: e.target.value })
                              }
                              className="w-full bg-white border border-slate-300 px-2 py-0.5 rounded text-xs font-medium"
                            />
                          </td>
                          <td className="py-1.5 px-2 border-r border-slate-200 text-center">
                            <select
                              value={inlineEditData.jenis}
                              onChange={(e) =>
                                setInlineEditData({
                                  ...inlineEditData,
                                  jenis: e.target.value as 'Kasa Lipat' | 'Kasa Roll',
                                })
                              }
                              className="w-full bg-white border border-slate-300 px-1 py-0.5 rounded text-xs font-medium text-center"
                            >
                              <option value="Kasa Lipat">Kasa Lipat</option>
                              <option value="Kasa Roll">Kasa Roll</option>
                            </select>
                          </td>
                          <td className="py-1.5 px-2 border-r border-slate-200">
                            <input
                              type="text"
                              value={inlineEditData.catatan || ''}
                              onChange={(e) =>
                                setInlineEditData({ ...inlineEditData, catatan: e.target.value })
                              }
                              placeholder="Catatan..."
                              className="w-full bg-white border border-slate-300 px-2 py-0.5 rounded text-xs"
                            />
                          </td>
                          <td className="py-1.5 px-2 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={handleSaveInlineEdit}
                                className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                                title="Simpan baris ini"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelInlineEdit}
                                className="p-1 rounded bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
                                title="Batal"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={`${itemKode}-${idx}`} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3 border-r border-slate-200 font-mono font-bold text-slate-900">
                          {item.kode}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 font-semibold text-emerald-950">
                          {item.bahanBaku}
                        </td>
                        <td className="py-2 px-2.5 border-r border-slate-200 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${
                              item.jenis === 'Kasa Roll'
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : 'bg-amber-50 text-amber-900 border-amber-200'
                            }`}
                          >
                            {item.jenis}
                          </span>
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-slate-600 text-[11px]">
                          {item.catatan || '-'}
                        </td>
                        <td className="py-2 px-2 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStartFormEdit(item)}
                              className="p-1 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                              title="Edit pada form atas"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStartInlineEdit(item)}
                              className="p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                              title="Edit langsung di baris ini"
                            >
                              <Tag className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item.kode)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Hapus kode"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">
            💡 Perubahan master kode otomatis tersinkronisasi realtime ke semua tab & device yang terhubung
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors shadow-2xs"
          >
            Tutup
          </button>
        </div>

        {/* In-App Confirmation Dialog */}
        {confirmDialog && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs animate-fade-in">
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-5 max-w-sm w-full space-y-3">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>
                  {confirmDialog.type === 'delete' ? 'Konfirmasi Hapus Kode' : 'Kembalikan Standar Pabrik?'}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {confirmDialog.type === 'delete'
                  ? `Apakah Anda yakin ingin menghapus kode "${confirmDialog.kode}" dari master data?`
                  : 'Seluruh kode kustom akan direset ke konfigurasi bawaan standar.'}
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirmDialog.type === 'delete' && confirmDialog.kode) {
                      executeDelete(confirmDialog.kode);
                    } else if (confirmDialog.type === 'reset') {
                      executeResetDefaults();
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-md"
                >
                  {confirmDialog.type === 'delete' ? 'Ya, Hapus' : 'Ya, Reset Standar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
