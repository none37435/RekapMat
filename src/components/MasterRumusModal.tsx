import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calculator,
  X,
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  Download,
  Upload,
  Cloud,
  RefreshCw,
  Search,
  Check,
  AlertCircle,
  HelpCircle,
  Scissors,
  Zap,
  Divide,
  Sigma,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { FormulaType, MasterCodeMapping, MasterRumusMapping } from '../types/material';
import {
  INITIAL_FORMULAS,
  sanitizeFormulas,
  resetFormulaMappings,
  exportFormulasToJson,
  exportFormulasToCsv,
  parseFormulasFromCsv,
} from '../utils/formulaStorage';
import { calculateFormulaQty, formatNumber } from '../utils/formulaCalculator';
import { fetchMasterRumusFromGas, saveMasterRumusToGas, getSavedGasUrl } from '../services/googleSheets';

interface MasterRumusModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterCodes: MasterCodeMapping[];
  formulas: MasterRumusMapping[];
  onSaveFormulas: (newFormulas: MasterRumusMapping[]) => void;
}

export const MasterRumusModal: React.FC<MasterRumusModalProps> = ({
  isOpen,
  onClose,
  masterCodes,
  formulas,
  onSaveFormulas,
}) => {
  const [list, setList] = useState<MasterRumusMapping[]>(() => sanitizeFormulas(formulas));
  const [search, setSearch] = useState('');
  const [editingTargetKode, setEditingTargetKode] = useState<string | null>(null);

  // Form Fields
  const [kode, setKode] = useState('');
  const [namaProduk, setNamaProduk] = useState('');
  const [tipeRumus, setTipeRumus] = useState<FormulaType>('MULTIPLIER');
  const [faktor, setFaktor] = useState<string>('2.7');
  const [lebarMaster, setLebarMaster] = useState<string>('110');
  const [spekLebar, setSpekLebar] = useState<string>('10');
  const [rumusCustom, setRumusCustom] = useState<string>('qty * 2.7');
  const [satuanHasil, setSatuanHasil] = useState<string>('meter');
  const [keterangan, setKeterangan] = useState<string>('');
  const [berlakuUntuk, setBerlakuUntuk] = useState<'Kasa Roll' | 'Semua'>('Kasa Roll');

  // Simulator Test Box
  const [testPlanQty, setTestPlanQty] = useState<string>('100');

  // Cloud State
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'delete' | 'reset';
    kode?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const gasUrl = getSavedGasUrl();

  useEffect(() => {
    if (isOpen) {
      setList(sanitizeFormulas(formulas));
    }
  }, [formulas, isOpen]);

  const safeList = useMemo(() => {
    return Array.isArray(list) && list.length > 0 ? list : sanitizeFormulas(INITIAL_FORMULAS);
  }, [list]);

  const filtered = useMemo(() => {
    const q = (search || '').trim().toLowerCase();
    if (!q) return safeList;

    return safeList.filter((f) => {
      if (!f) return false;
      const k = String(f.kode || '').toLowerCase();
      const n = String(f.namaProduk || '').toLowerCase();
      const ket = String(f.keterangan || '').toLowerCase();
      const t = String(f.tipeRumus || '').toLowerCase();
      return k.includes(q) || n.includes(q) || ket.includes(q) || t.includes(q);
    });
  }, [safeList, search]);

  // Kalkulasi Preview Simulator
  const simulatedResult = useMemo(() => {
    const tempFormula: MasterRumusMapping = {
      kode: kode || 'SIMULASI',
      tipeRumus,
      faktor: faktor ? Number(faktor) : undefined,
      lebarMaster: lebarMaster ? Number(lebarMaster) : undefined,
      spekLebar: spekLebar ? Number(spekLebar) : undefined,
      rumusCustom,
      satuanHasil,
      berlakuUntuk,
    };
    return calculateFormulaQty(Number(testPlanQty) || 0, tempFormula);
  }, [kode, tipeRumus, faktor, lebarMaster, spekLebar, rumusCustom, satuanHasil, berlakuUntuk, testPlanQty]);

  if (!isOpen) return null;

  const triggerSuccess = (msg: string) => {
    setSavedSuccess(msg);
    setTimeout(() => setSavedSuccess(null), 3000);
  };

  const handleTipeRumusChange = (newTipe: FormulaType) => {
    setTipeRumus(newTipe);
    if (newTipe === 'MULTIPLIER') {
      if (!faktor) setFaktor('2.7');
      setSatuanHasil('meter');
    } else if (newTipe === 'SLITTING') {
      if (!lebarMaster) setLebarMaster('110');
      if (!spekLebar) setSpekLebar('10');
      setSatuanHasil('roll induk');
    } else if (newTipe === 'DIVIDER') {
      if (!faktor) setFaktor('11');
      setSatuanHasil('roll');
    } else if (newTipe === 'CUSTOM') {
      if (!rumusCustom) setRumusCustom('qty * 2.7');
      setSatuanHasil('meter');
    }
  };

  const handleSelectMasterCode = (selectedKode: string) => {
    setKode(selectedKode);
    const foundMaster = masterCodes.find((m) => m.kode.toUpperCase() === selectedKode.toUpperCase());
    if (foundMaster && !namaProduk) {
      setNamaProduk(`${foundMaster.bahanBaku} (${foundMaster.jenis})`);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKode = (kode || '').trim().toUpperCase();
    if (!cleanKode) return;

    const newItem: MasterRumusMapping = {
      kode: cleanKode,
      namaProduk: namaProduk.trim() || undefined,
      tipeRumus,
      faktor: tipeRumus === 'MULTIPLIER' || tipeRumus === 'DIVIDER' ? (Number(faktor) || 1) : undefined,
      lebarMaster: tipeRumus === 'SLITTING' ? (Number(lebarMaster) || 110) : undefined,
      spekLebar: tipeRumus === 'SLITTING' ? (Number(spekLebar) || 10) : undefined,
      rumusCustom: tipeRumus === 'CUSTOM' ? rumusCustom.trim() : undefined,
      satuanHasil: satuanHasil.trim() || 'roll',
      keterangan: keterangan.trim() || undefined,
      berlakuUntuk,
    };

    let updatedList: MasterRumusMapping[];
    if (editingTargetKode) {
      const targetUpper = editingTargetKode.toUpperCase();
      updatedList = safeList.map((f) => (f && f.kode.toUpperCase() === targetUpper ? newItem : f));
      setEditingTargetKode(null);
      triggerSuccess(`Rumus untuk kode ${cleanKode} berhasil diperbarui!`);
    } else {
      const existingIdx = safeList.findIndex((f) => f && f.kode.toUpperCase() === cleanKode);
      if (existingIdx >= 0) {
        updatedList = [...safeList];
        updatedList[existingIdx] = newItem;
        triggerSuccess(`Rumus untuk kode ${cleanKode} berhasil diperbarui!`);
      } else {
        updatedList = [newItem, ...safeList];
        triggerSuccess(`Rumus baru untuk kode ${cleanKode} berhasil ditambahkan!`);
      }
    }

    const sanitized = sanitizeFormulas(updatedList);
    setList(sanitized);
    onSaveFormulas(sanitized);

    // Auto push to GAS in background if URL configured
    if (gasUrl) {
      saveMasterRumusToGas(gasUrl, sanitized).catch(() => {});
    }

    // Reset Form
    handleCancelEdit();
  };

  const handleStartEdit = (f: MasterRumusMapping) => {
    setEditingTargetKode(f.kode);
    setKode(f.kode);
    setNamaProduk(f.namaProduk || '');
    setTipeRumus(f.tipeRumus || 'MULTIPLIER');
    setFaktor(f.faktor != null ? String(f.faktor) : '2.7');
    setLebarMaster(f.lebarMaster != null ? String(f.lebarMaster) : '110');
    setSpekLebar(f.spekLebar != null ? String(f.spekLebar) : '10');
    setRumusCustom(f.rumusCustom || 'qty * 2.7');
    setSatuanHasil(f.satuanHasil || 'meter');
    setKeterangan(f.keterangan || '');
    setBerlakuUntuk(f.berlakuUntuk || 'Kasa Roll');
  };

  const handleCancelEdit = () => {
    setEditingTargetKode(null);
    setKode('');
    setNamaProduk('');
    setTipeRumus('MULTIPLIER');
    setFaktor('2.7');
    setLebarMaster('110');
    setSpekLebar('10');
    setRumusCustom('qty * 2.7');
    setSatuanHasil('meter');
    setKeterangan('');
    setBerlakuUntuk('Kasa Roll');
  };

  const executeDelete = (kodeToDelete: string) => {
    const updated = safeList.filter((f) => f && f.kode.toUpperCase() !== kodeToDelete.toUpperCase());
    const sanitized = sanitizeFormulas(updated);
    setList(sanitized);
    onSaveFormulas(sanitized);
    if (editingTargetKode && editingTargetKode.toUpperCase() === kodeToDelete.toUpperCase()) {
      handleCancelEdit();
    }
    setConfirmDialog(null);
    triggerSuccess(`Rumus untuk ${kodeToDelete} berhasil dihapus.`);

    if (gasUrl) {
      saveMasterRumusToGas(gasUrl, sanitized).catch(() => {});
    }
  };

  const executeResetDefaults = () => {
    const defaults = resetFormulaMappings();
    setList(defaults);
    onSaveFormulas(defaults);
    handleCancelEdit();
    setConfirmDialog(null);
    triggerSuccess('Master rumus berhasil dikembalikan ke standar bawaan!');

    if (gasUrl) {
      saveMasterRumusToGas(gasUrl, defaults).catch(() => {});
    }
  };

  // Cloud Pull
  const handleCloudPull = async () => {
    if (!gasUrl) {
      alert('URL Google Apps Script belum diisi di modal Google Sheets.');
      return;
    }
    setIsCloudSyncing(true);
    try {
      const cloudData = await fetchMasterRumusFromGas(gasUrl);
      setIsCloudSyncing(false);
      if (cloudData && cloudData.length > 0) {
        const sanitized = sanitizeFormulas(cloudData);
        setList(sanitized);
        onSaveFormulas(sanitized);
        triggerSuccess(`Berhasil menarik ${sanitized.length} master rumus dari Google Sheets!`);
      } else {
        alert('Sheet "Master Rumus" di Google Sheets Anda belum ada atau masih kosong. Klik "Kirim ke Cloud" untuk membuatnya.');
      }
    } catch (err) {
      setIsCloudSyncing(false);
      alert(`Gagal mengambil dari cloud: ${err instanceof Error ? err.message : 'Koneksi error'}`);
    }
  };

  // Cloud Push
  const handleCloudPush = async () => {
    if (!gasUrl) {
      alert('URL Google Apps Script belum diisi di modal Google Sheets.');
      return;
    }
    setIsCloudSyncing(true);
    try {
      const ok = await saveMasterRumusToGas(gasUrl, safeList);
      setIsCloudSyncing(false);
      if (ok) {
        triggerSuccess(`Berhasil menyimpan ${safeList.length} master rumus ke sheet "Master Rumus" di Google Sheets!`);
      } else {
        alert('Gagal menyimpan master rumus ke cloud.');
      }
    } catch (err) {
      setIsCloudSyncing(false);
      alert(`Gagal menyimpan ke cloud: ${err instanceof Error ? err.message : 'Koneksi error'}`);
    }
  };

  // File Upload (JSON, CSV, Excel)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileName = file.name.toLowerCase();
      let imported: MasterRumusMapping[] = [];

      if (fileName.endsWith('.json')) {
        const text = await file.text();
        imported = sanitizeFormulas(JSON.parse(text));
      } else if (fileName.endsWith('.csv')) {
        const text = await file.text();
        imported = parseFormulasFromCsv(text);
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rawJson: (string | number)[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (rawJson.length > 1) {
          const header = rawJson[0].map((h) => String(h || '').toLowerCase());
          const kIdx = header.findIndex((h) => h.includes('kode'));
          const nIdx = header.findIndex((h) => h.includes('nama'));
          const tIdx = header.findIndex((h) => h.includes('tipe'));
          const fIdx = header.findIndex((h) => h.includes('faktor'));
          const lIdx = header.findIndex((h) => h.includes('master'));
          const sIdx = header.findIndex((h) => h.includes('spek'));
          const cIdx = header.findIndex((h) => h.includes('custom'));
          const satIdx = header.findIndex((h) => h.includes('satuan'));
          const ketIdx = header.findIndex((h) => h.includes('ket'));

          const listItems: MasterRumusMapping[] = [];
          for (let i = 1; i < rawJson.length; i++) {
            const row = rawJson[i];
            if (!row || row.length === 0) continue;
            const itemKode = kIdx >= 0 ? String(row[kIdx] || '').trim() : String(row[0] || '').trim();
            if (!itemKode) continue;

            const rawTipe = tIdx >= 0 ? String(row[tIdx] || '').trim().toUpperCase() : 'MULTIPLIER';
            const tipeRumus = (['MULTIPLIER', 'SLITTING', 'DIVIDER', 'CUSTOM'].includes(rawTipe)
              ? rawTipe
              : 'MULTIPLIER') as FormulaType;

            listItems.push({
              kode: itemKode.toUpperCase(),
              namaProduk: nIdx >= 0 ? String(row[nIdx] || '').trim() : undefined,
              tipeRumus,
              faktor: fIdx >= 0 && row[fIdx] != null ? Number(row[fIdx]) : undefined,
              lebarMaster: lIdx >= 0 && row[lIdx] != null ? Number(row[lIdx]) : undefined,
              spekLebar: sIdx >= 0 && row[sIdx] != null ? Number(row[sIdx]) : undefined,
              rumusCustom: cIdx >= 0 ? String(row[cIdx] || '').trim() : undefined,
              satuanHasil: satIdx >= 0 ? String(row[satIdx] || '').trim() : undefined,
              keterangan: ketIdx >= 0 ? String(row[ketIdx] || '').trim() : undefined,
              berlakuUntuk: 'Kasa Roll',
            });
          }
          imported = sanitizeFormulas(listItems);
        }
      }

      if (imported.length === 0) {
        alert('Tidak ditemukan data master rumus yang valid di dalam berkas.');
        return;
      }

      const map = new Map<string, MasterRumusMapping>();
      safeList.forEach((f) => map.set(f.kode.toUpperCase(), f));
      imported.forEach((f) => map.set(f.kode.toUpperCase(), f));

      const merged = sanitizeFormulas(Array.from(map.values()));
      setList(merged);
      onSaveFormulas(merged);
      triggerSuccess(`Berhasil mengimpor ${imported.length} master rumus dari ${file.name}!`);

      if (gasUrl) {
        saveMasterRumusToGas(gasUrl, merged).catch(() => {});
      }
    } catch (err) {
      alert(`Gagal membaca berkas: ${err instanceof Error ? err.message : 'Format tidak didukung'}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="relative bg-white rounded-xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Sistem Master Rumus (Konversi Bahan Baku)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold border border-indigo-200">
                  Kasa Roll & Pekerjaan Khusus
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Sistem mandiri terhubung dengan master kode & tersinkronisasi real-time via Google Sheets
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
          {/* Cloud Action Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${gasUrl ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
              <span className="font-semibold text-slate-800">
                {gasUrl ? 'Cloud Real-Time Aktif (Sheet: "Master Rumus")' : 'Penyimpanan Lokal Aktif (Atur Google Sheets untuk Cloud)'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {gasUrl && (
                <>
                  <button
                    type="button"
                    onClick={handleCloudPull}
                    disabled={isCloudSyncing}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 font-semibold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 rounded-md transition-colors disabled:opacity-50"
                    title="Tarik data master rumus terbaru dari Google Sheets"
                  >
                    <Cloud className={`w-3.5 h-3.5 ${isCloudSyncing ? 'animate-bounce' : ''}`} />
                    <span>Tarik dari Cloud</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCloudPush}
                    disabled={isCloudSyncing}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 font-semibold text-emerald-800 bg-emerald-100/90 hover:bg-emerald-200 border border-emerald-300 rounded-md transition-colors disabled:opacity-50"
                    title="Kirim master rumus ke Google Sheets"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCloudSyncing ? 'animate-spin' : ''}`} />
                    <span>Kirim ke Cloud</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => exportFormulasToCsv(safeList)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors shadow-2xs"
                title="Unduh master rumus sebagai CSV"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Ekspor CSV</span>
              </button>

              <button
                type="button"
                onClick={() => exportFormulasToJson(safeList)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors shadow-2xs"
                title="Unduh master rumus sebagai JSON"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Ekspor JSON</span>
              </button>

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
                title="Impor file JSON, CSV, atau Excel"
              >
                <Upload className="w-3.5 h-3.5 text-indigo-600" />
                <span>Impor File</span>
              </button>
            </div>
          </div>

          {/* Alert Message */}
          {savedSuccess && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-lg p-3 text-xs flex items-center gap-2 animate-fade-in font-medium">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{savedSuccess}</span>
            </div>
          )}

          {/* Form: Tambah / Edit Rumus */}
          <form
            onSubmit={handleFormSubmit}
            className={`border rounded-lg p-4 space-y-4 transition-colors ${
              editingTargetKode ? 'bg-amber-50/70 border-amber-300' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                {editingTargetKode ? (
                  <>
                    <Pencil className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-amber-900">
                      Mode Edit Rumus Kode: <strong>{editingTargetKode}</strong>
                    </span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Tambah / Konfigurasi Rumus Baru</span>
                  </>
                )}
              </div>

              {editingTargetKode && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium underline"
                >
                  Batal Edit
                </button>
              )}
            </div>

            {/* Tipe Rumus Selector Buttons */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                Pilih Tipe Rumus Perhitungan:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleTipeRumusChange('MULTIPLIER')}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    tipeRumus === 'MULTIPLIER'
                      ? 'bg-indigo-50 border-indigo-400 text-indigo-950 ring-1 ring-indigo-400'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>1. Pengali (Multiplier)</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Contoh: 8320311RB (dikali 2.7m)</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleTipeRumusChange('SLITTING')}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    tipeRumus === 'SLITTING'
                      ? 'bg-indigo-50 border-indigo-400 text-indigo-950 ring-1 ring-indigo-400'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Scissors className="w-3.5 h-3.5 text-indigo-600" />
                    <span>2. Slitting Lebar Induk</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Contoh: Polifix 110 / (spek 5/10/15/20)</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleTipeRumusChange('DIVIDER')}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    tipeRumus === 'DIVIDER'
                      ? 'bg-indigo-50 border-indigo-400 text-indigo-950 ring-1 ring-indigo-400'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Divide className="w-3.5 h-3.5 text-emerald-600" />
                    <span>3. Pembagi Tetap</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Plan / Nilai Pembagi</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleTipeRumusChange('CUSTOM')}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    tipeRumus === 'CUSTOM'
                      ? 'bg-indigo-50 border-indigo-400 text-indigo-950 ring-1 ring-indigo-400'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Sigma className="w-3.5 h-3.5 text-purple-600" />
                    <span>4. Rumus Bebas (Custom)</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Ekspresi matematika bebas</p>
                </button>
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Kode Produk Target <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={kode}
                    onChange={(e) => setKode(e.target.value.toUpperCase())}
                    placeholder="Contoh: 8320311RB, POLIFIX-10"
                    required
                    className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-md font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                {/* Autocomplete suggestion buttons from Master Codes */}
                <div className="flex flex-wrap gap-1 mt-1">
                  <span className="text-[10px] text-slate-400">Pilih dari Master:</span>
                  {masterCodes
                    .filter((m) => m && m.jenis === 'Kasa Roll')
                    .slice(0, 4)
                    .map((m) => (
                      <button
                        key={m.kode}
                        type="button"
                        onClick={() => handleSelectMasterCode(m.kode)}
                        className="text-[10px] px-1.5 py-0.5 bg-slate-200 hover:bg-indigo-100 hover:text-indigo-800 text-slate-700 rounded font-mono transition-colors"
                      >
                        {m.kode}
                      </button>
                    ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Nama Produk / Keterangan Pekerjaan
                </label>
                <input
                  type="text"
                  value={namaProduk}
                  onChange={(e) => setNamaProduk(e.target.value)}
                  placeholder="Contoh: Needle Punch Roll, Polifix 10cm"
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Satuan Kebutuhan Bahan
                </label>
                <input
                  type="text"
                  value={satuanHasil}
                  onChange={(e) => setSatuanHasil(e.target.value)}
                  placeholder="Contoh: meter, roll, roll induk, pcs"
                  required
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Dynamic Formula Parameter Inputs */}
            <div className="p-3 bg-white border border-indigo-100 rounded-lg space-y-3">
              <div className="text-xs font-semibold text-indigo-900 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                <span>Parameter Rumus:</span>
              </div>

              {tipeRumus === 'MULTIPLIER' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Faktor Pengali (Meter/Pcs per Qty)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={faktor}
                      onChange={(e) => setFaktor(e.target.value)}
                      placeholder="Contoh: 2.7"
                      required
                      className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-md font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Rumus: <code>Qty Asli = Qty Plan × {faktor || 1}</code> {satuanHasil}
                    </p>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Berlaku Untuk Kategori
                    </label>
                    <select
                      value={berlakuUntuk}
                      onChange={(e) => setBerlakuUntuk(e.target.value as 'Kasa Roll' | 'Semua')}
                      className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-md"
                    >
                      <option value="Kasa Roll">Hanya Kasa Roll (Rekomendasi)</option>
                      <option value="Semua">Semua Kategori</option>
                    </select>
                  </div>
                </div>
              )}

              {tipeRumus === 'SLITTING' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Lebar Master Roll Induk (cm)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={lebarMaster}
                      onChange={(e) => setLebarMaster(e.target.value)}
                      placeholder="Contoh: 110"
                      required
                      className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-md font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Spek Lebar Potongan (cm)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={spekLebar}
                      onChange={(e) => setSpekLebar(e.target.value)}
                      placeholder="Contoh: 5, 10, 15, atau 20"
                      required
                      className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-md font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Hasil Potong per Roll Induk
                    </label>
                    <div className="text-xs px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-md font-mono text-slate-800 font-bold">
                      {Number(lebarMaster) > 0 && Number(spekLebar) > 0
                        ? `${formatNumber(Number(lebarMaster) / Number(spekLebar))} potong`
                        : '-'}
                    </div>
                  </div>
                </div>
              )}

              {tipeRumus === 'DIVIDER' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Nilai Pembagi
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={faktor}
                    onChange={(e) => setFaktor(e.target.value)}
                    placeholder="Contoh: 11"
                    required
                    className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-md font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Rumus: <code>Qty Asli = Qty Plan / {faktor || 1}</code> {satuanHasil}
                  </p>
                </div>
              )}

              {tipeRumus === 'CUSTOM' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Ekspresi Rumus (Gunakan kata kunci <code>qty</code>)
                  </label>
                  <input
                    type="text"
                    value={rumusCustom}
                    onChange={(e) => setRumusCustom(e.target.value)}
                    placeholder="Contoh: qty * 2.7 atau qty / (110 / 10)"
                    required
                    className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-md font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Variabel <code>qty</code> akan otomatis diganti dengan nilai rencana proses yang diinput.
                  </p>
                </div>
              )}

              {/* Live Test Simulator Box */}
              <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700">🧪 Uji Simulasi Langsung:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">Jika Plan =</span>
                    <input
                      type="number"
                      value={testPlanQty}
                      onChange={(e) => setTestPlanQty(e.target.value)}
                      className="w-20 px-2 py-0.5 border border-slate-300 rounded text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-md text-indigo-950 font-medium">
                  Kebutuhan Bahan:{' '}
                  <strong className="text-indigo-700 text-sm">{formatNumber(simulatedResult.qtyBahan)} {simulatedResult.satuan}</strong>{' '}
                  <span className="text-[11px] text-slate-500">({simulatedResult.rumusText})</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-md shadow-2xs transition-colors ${
                  editingTargetKode
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {editingTargetKode ? (
                  <>
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Simpan Perubahan Rumus</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Simpan Rumus ke Sistem</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Search & Counter */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari kode atau rumus..."
                className="w-full text-xs pl-8 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-mono">
                Total <strong>{safeList.length}</strong> Rumus Terdaftar
              </span>
              <button
                type="button"
                onClick={() => setConfirmDialog({ type: 'reset' })}
                title="Kembalikan ke rumus standar bawaan pabrik"
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors"
              >
                <RotateCcw className="w-3 h-3 text-slate-500" />
                <span>Reset Standar</span>
              </button>
            </div>
          </div>

          {/* Table of Registered Formulas */}
          <div className="border border-slate-200 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0 border-b border-slate-200 select-none z-10 shadow-2xs">
                <tr>
                  <th className="py-2.5 px-3 border-r border-slate-200 w-36 font-mono">Kode Produk</th>
                  <th className="py-2.5 px-3 border-r border-slate-200 min-w-[160px]">Nama / Pekerjaan</th>
                  <th className="py-2.5 px-2.5 border-r border-slate-200 w-32 text-center">Tipe Rumus</th>
                  <th className="py-2.5 px-3 border-r border-slate-200 min-w-[200px]">Formula Perhitungan</th>
                  <th className="py-2.5 px-2 text-center w-24">Satuan</th>
                  <th className="py-2.5 px-2 text-center w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Tidak ada master rumus yang cocok dengan pencarian.
                    </td>
                  </tr>
                ) : (
                  filtered.map((item, idx) => {
                    const sampleResult = calculateFormulaQty(100, item);
                    return (
                      <tr key={`${item.kode}-${idx}`} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3 border-r border-slate-200 font-mono font-bold text-indigo-900">
                          {item.kode}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 font-medium text-slate-800">
                          {item.namaProduk || '-'}
                        </td>
                        <td className="py-2 px-2.5 border-r border-slate-200 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              item.tipeRumus === 'SLITTING'
                                ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                : item.tipeRumus === 'MULTIPLIER'
                                ? 'bg-amber-50 text-amber-900 border-amber-200'
                                : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                            }`}
                          >
                            {item.tipeRumus}
                          </span>
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 font-mono text-[11px] text-slate-700">
                          {item.tipeRumus === 'MULTIPLIER' && `Qty × ${item.faktor || 1}`}
                          {item.tipeRumus === 'SLITTING' && `Qty / (${item.lebarMaster || 110} / ${item.spekLebar || 10})`}
                          {item.tipeRumus === 'DIVIDER' && `Qty / ${item.faktor || 1}`}
                          {item.tipeRumus === 'CUSTOM' && (item.rumusCustom || 'qty')}
                          <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                            Plan 100 ➔ <strong>{formatNumber(sampleResult.qtyBahan)} {sampleResult.satuan}</strong>
                          </div>
                        </td>
                        <td className="py-2 px-2 border-r border-slate-200 text-center font-semibold text-slate-600">
                          {item.satuanHasil || 'roll'}
                        </td>
                        <td className="py-2 px-2 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(item)}
                              className="p-1 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                              title="Edit rumus ini"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDialog({ type: 'delete', kode: item.kode })}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Hapus rumus ini"
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

        {/* Confirmation Modal */}
        {confirmDialog && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-5 max-w-sm w-full space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {confirmDialog.type === 'delete' ? 'Hapus Rumus?' : 'Reset ke Standar Bawaan?'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {confirmDialog.type === 'delete'
                      ? `Apakah Anda yakin ingin menghapus rumus untuk kode "${confirmDialog.kode}"?`
                      : 'Seluruh rumus khusus akan dikembalikan ke pengaturan standar awal.'}
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
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
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-md transition-colors shadow-2xs"
                >
                  Ya, Lanjutkan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
