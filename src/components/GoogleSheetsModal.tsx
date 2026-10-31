import React, { useState, useEffect } from 'react';
import { MaterialRekapRow, DailyProcessRow, MasterCodeMapping } from '../types/material';
import {
  getSavedGasUrl,
  saveGasUrl,
  testGasConnection,
  syncToGoogleSheetsViaGas,
  importFromGoogleSheetsViaGas,
  GOOGLE_APPS_SCRIPT_TEMPLATE,
} from '../services/googleSheets';
import {
  FileSpreadsheet,
  RefreshCw,
  ExternalLink,
  Upload,
  Download,
  X,
  Check,
  AlertTriangle,
  Info,
  Code,
  Copy,
  Link,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  materialData: MaterialRekapRow[];
  processData: DailyProcessRow[];
  masterCodes: MasterCodeMapping[];
  onImportData: (imported: {
    materialRows: MaterialRekapRow[];
    processRows: DailyProcessRow[];
    title: string;
  }) => void;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  materialData,
  processData,
  onImportData,
}) => {
  const [gasUrl, setGasUrl] = useState<string>(() => getSavedGasUrl());
  const [activeTab, setActiveTab] = useState<'sync' | 'import' | 'guide'>('sync');
  const [syncOption, setSyncOption] = useState<'both' | 'material' | 'process'>('both');

  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    title?: string;
    url?: string;
    message: string;
  } | null>(null);

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
    link?: string;
  } | null>(null);

  const [copiedScript, setCopiedScript] = useState(false);

  // Otomatis verifikasi jika URL sudah tersimpan saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      const saved = getSavedGasUrl();
      setGasUrl(saved);
      if (saved) {
        testGasConnection(saved).then((res) => {
          if (res.success) {
            setTestResult({
              success: true,
              title: res.title,
              url: res.spreadsheetUrl,
              message: res.message,
            });
          }
        });
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveAndTestUrl = async () => {
    const clean = gasUrl.trim();
    if (!clean) {
      setFeedback({ type: 'error', text: 'Silakan masukkan URL Web App Google Apps Script.' });
      return;
    }

    if (!clean.includes('script.google.com') || !clean.includes('/exec')) {
      setFeedback({
        type: 'error',
        text: 'URL harus berupa tautan Web App Google Apps Script yang valid (berakhiran /exec).',
      });
      return;
    }

    saveGasUrl(clean);
    setIsTesting(true);
    setTestResult(null);
    setFeedback(null);

    try {
      const res = await testGasConnection(clean);
      setIsTesting(false);
      if (res.success) {
        setTestResult({
          success: true,
          title: res.title,
          url: res.spreadsheetUrl,
          message: res.message,
        });
        setFeedback({
          type: 'success',
          text: `Koneksi berhasil terverifikasi ke "${res.title || 'Spreadsheet'}"!`,
          link: res.spreadsheetUrl,
        });
      } else {
        setTestResult({
          success: false,
          message: res.message,
        });
        setFeedback({
          type: 'error',
          text: res.message || 'Gagal menghubungi Google Apps Script.',
        });
      }
    } catch (err) {
      setIsTesting(false);
      const msg = err instanceof Error ? err.message : 'Koneksi gagal.';
      setTestResult({ success: false, message: msg });
      setFeedback({ type: 'error', text: msg });
    }
  };

  const handleSyncData = async () => {
    const clean = gasUrl.trim();
    if (!clean) {
      setFeedback({ type: 'error', text: 'Masukkan URL Google Apps Script terlebih dahulu.' });
      return;
    }

    setIsLoading(true);
    setFeedback(null);

    try {
      saveGasUrl(clean);
      const res = await syncToGoogleSheetsViaGas(clean, materialData, processData, {
        syncMaterial: syncOption === 'both' || syncOption === 'material',
        syncProcess: syncOption === 'both' || syncOption === 'process',
      });

      setIsLoading(false);
      setFeedback({
        type: 'success',
        text: `${res.message} (${res.materialRowsCount} baris material, ${res.processRowsCount} baris proses)`,
        link: res.spreadsheetUrl,
      });
    } catch (err) {
      setIsLoading(false);
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal mengirim data ke Google Sheets.',
      });
    }
  };

  const handleImportData = async () => {
    const clean = gasUrl.trim();
    if (!clean) {
      setFeedback({ type: 'error', text: 'Masukkan URL Google Apps Script terlebih dahulu.' });
      return;
    }

    setIsLoading(true);
    setFeedback(null);

    try {
      saveGasUrl(clean);
      const res = await importFromGoogleSheetsViaGas(clean);
      setIsLoading(false);

      if (res.materialRows.length === 0 && res.processRows.length === 0) {
        setFeedback({
          type: 'error',
          text: 'Tidak ditemukan baris data pada sheet "Rekap Material Mesin" atau "Rencana Proses Mesin".',
        });
      } else {
        onImportData({
          materialRows: res.materialRows,
          processRows: res.processRows,
          title: res.title,
        });
        setFeedback({
          type: 'success',
          text: `Berhasil menarik ${res.materialRows.length} baris material dan ${res.processRows.length} baris proses dari "${res.title}"!`,
          link: res.spreadsheetUrl,
        });
      }
    } catch (err) {
      setIsLoading(false);
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal menarik data dari Google Sheets.',
      });
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-4 sm:my-8 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white backdrop-blur-xs border border-white/20">
              <FileSpreadsheet className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight">
                Sinkronisasi Google Sheets (Apps Script)
              </h2>
              <p className="text-xs text-emerald-200">
                Koneksi langsung tanpa perlu login akun Google pada browser
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Apps Script URL Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-2 shrink-0">
          <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Link className="w-3.5 h-3.5 text-emerald-600" />
            <span>URL Web App Google Apps Script (*.exec):</span>
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="url"
              value={gasUrl}
              onChange={(e) => setGasUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/AKfycb.../exec"
              className="flex-1 px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-slate-900"
            />
            <button
              onClick={handleSaveAndTestUrl}
              disabled={isTesting || !gasUrl.trim()}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50 shrink-0 shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Menguji...' : 'Uji Koneksi'}</span>
            </button>
          </div>

          {/* Test Status Badge */}
          {testResult && (
            <div
              className={`p-2.5 rounded-lg text-xs flex items-center justify-between gap-2 border ${
                testResult.success
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                  : 'bg-rose-50 text-rose-900 border-rose-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>
                  <strong>{testResult.success ? 'Terkoneksi:' : 'Kendala Koneksi:'}</strong>{' '}
                  {testResult.title || testResult.message}
                </span>
              </div>
              {testResult.url && (
                <a
                  href={testResult.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-emerald-800 hover:underline shrink-0 text-[11px]"
                >
                  <span>Buka Sheet</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 bg-white gap-3 pt-2 shrink-0">
          <button
            onClick={() => setActiveTab('sync')}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'sync'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Kirim ke Sheets (Sync)</span>
          </button>

          <button
            onClick={() => setActiveTab('import')}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'import'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Tarik dari Sheets (Impor)</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'guide'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Code className="w-4 h-4" />
            <span>Salin Skrip Code.gs & Panduan</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Feedback message */}
          {feedback && (
            <div
              className={`p-3 rounded-lg text-xs flex items-start gap-2.5 border ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                  : 'bg-rose-50 text-rose-900 border-rose-300'
              }`}
            >
              {feedback.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-medium">{feedback.text}</p>
                {feedback.link && (
                  <a
                    href={feedback.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-emerald-800 underline mt-1 text-[11px]"
                  >
                    <span>Buka Google Spreadsheet Terkait</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* TAB 1: SYNC */}
          {activeTab === 'sync' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs text-emerald-950 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Format Baku Otomatis Terapan Apps Script:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-emerald-800 text-[11px]">
                  <li>Header hijau tua gelap (#0F766E) dengan baris 1 terkunci (*freeze row 1*).</li>
                  <li>Warna latar belakang baris otomatis sesuai hari (Senin s/d Sabtu).</li>
                  <li>Validasi dropdown interaktif untuk kolom <em>sumber</em> dan <em>status</em>.</li>
                </ul>
              </div>

              {/* Data Summary */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-slate-500 text-[11px] block">Rekap Material Mesin</span>
                  <strong className="text-slate-900 text-sm font-mono">{materialData.length} baris</strong>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-slate-500 text-[11px] block">Rencana Proses Mesin</span>
                  <strong className="text-slate-900 text-sm font-mono">{processData.length} baris</strong>
                </div>
              </div>

              {/* Scope Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Pilih Lembar yang Disinkronkan:</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setSyncOption('both')}
                    className={`p-2.5 rounded-lg border text-left transition-colors ${
                      syncOption === 'both'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    Keduanya (Material & Proses)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSyncOption('material')}
                    className={`p-2.5 rounded-lg border text-left transition-colors ${
                      syncOption === 'material'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    Hanya Rekap Material
                  </button>
                  <button
                    type="button"
                    onClick={() => setSyncOption('process')}
                    className={`p-2.5 rounded-lg border text-left transition-colors ${
                      syncOption === 'process'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    Hanya Rencana Proses
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSyncData}
                disabled={isLoading || !gasUrl.trim()}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                <span>{isLoading ? 'Sedang Menyinkronkan...' : 'Kirim / Sinkronkan ke Google Sheets Sekarang'}</span>
              </button>
            </div>
          )}

          {/* TAB 2: IMPORT */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-lg text-xs text-sky-950 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-sky-600" />
                  Tarik Data dari Spreadsheet Cloud:
                </p>
                <p className="text-[11px] text-sky-800 leading-relaxed">
                  Aplikasi akan membaca lembar kerja <strong>Rekap Material Mesin</strong> dan <strong>Rencana Proses Mesin</strong> dari spreadsheet Google Sheets Anda dan memasukkannya langsung ke dalam tabel aktif browser.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800">Catatan Keamanan Data:</p>
                <p className="text-[11px]">
                  Data di tabel browser saat ini akan diperbarui dengan data terbaru yang diambil dari Google Spreadsheet.
                </p>
              </div>

              <button
                type="button"
                onClick={handleImportData}
                disabled={isLoading || !gasUrl.trim()}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors shadow-xs disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{isLoading ? 'Sedang Mengambil Data...' : 'Tarik Data dari Google Sheets Sekarang'}</span>
              </button>
            </div>
          )}

          {/* TAB 3: GUIDE & CODE.GS */}
          {activeTab === 'guide' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 space-y-2">
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <span>Langkah Cepat Memasang Google Apps Script:</span>
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-700 text-xs">
                  <li>Buka Google Spreadsheet target Anda di peramban.</li>
                  <li>
                    Klik menu <strong>Ekstensi (Extensions)</strong> &rarr; <strong>Apps Script</strong>.
                  </li>
                  <li>
                    Hapus kode bawaan di file <code>Code.gs</code>, lalu klik tombol <strong>Salin Kode Skrip</strong> di bawah dan tempelkan.
                  </li>
                  <li>
                    Klik menu <strong>Terapkan (Deploy)</strong> di kanan atas &rarr; <strong>Penerapan Baru (New Deployment)</strong>.
                  </li>
                  <li>
                    Pilih jenis: <strong>Aplikasi Web (Web App)</strong>:
                    <ul className="list-disc list-inside pl-4 pt-1 space-y-0.5 text-slate-600">
                      <li>Jalankan sebagai (Execute as): <strong>Saya (Me)</strong></li>
                      <li>Yang memiliki akses (Who has access): <strong>Siapa saja (Anyone)</strong></li>
                    </ul>
                  </li>
                  <li>
                    Klik <strong>Terapkan</strong>, berikan izin akses spreadsheet, lalu <strong>salin URL Web App</strong> (berakhiran <code>/exec</code>) dan masukkan ke kolom URL di atas!
                  </li>
                </ol>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Kode Lengkap Google Apps Script (Code.gs):</span>
                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-lg transition-colors shadow-2xs"
                >
                  {copiedScript ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Berhasil Disalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Seluruh Kode Skrip</span>
                    </>
                  )}
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto border border-slate-300 rounded-lg p-3 bg-slate-900 text-slate-200 font-mono text-[11px] leading-relaxed">
                <pre>{GOOGLE_APPS_SCRIPT_TEMPLATE}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 font-medium">
            Mendukung sinkronisasi multi-perangkat via Google Apps Script Web App
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors shadow-2xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
