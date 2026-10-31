import React, { useState, useEffect } from 'react';
import { MaterialRekapRow, DailyProcessRow, MasterCodeMapping, MasterRumusMapping, FoldingCuttingItem, PriorWeekPlanMeta } from './types/material';
import {
  autoConvertProcessToRekap,
  exportToExcel,
  filterProcessRowsByFoldingCutting,
  extractFoldingCuttingItems,
  getCurrentWeekString,
} from './utils/excelParser';
import {
  getMasterCodeMappings,
  saveMasterCodeMappings,
  subscribeToMasterCodeUpdates,
} from './utils/masterCodeStorage';
import {
  getFormulaMappings,
  saveFormulaMappings,
  subscribeFormulaChanges,
} from './utils/formulaStorage';
import {
  getSavedGasUrl,
  fetchMasterCodesFromGas,
  saveMasterCodesToGas,
  fetchMasterRumusFromGas,
  saveMasterRumusToGas,
} from './services/googleSheets';
import { Header } from './components/Header';
import { MaterialTable } from './components/MaterialTable';
import { DailyProcessTable } from './components/DailyProcessTable';
import { ScheduleSummary } from './components/ScheduleSummary';
import { SOPModule } from './components/SOPModule';
import { UploadModal } from './components/UploadModal';
import { MasterCodeModal } from './components/MasterCodeModal';
import { MasterRumusModal } from './components/MasterRumusModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { ConfirmClearModal } from './components/ConfirmClearModal';
import { FoldingCuttingView } from './components/FoldingCuttingView';
import { DeploymentModal } from './components/DeploymentModal';
import { Check } from 'lucide-react';

const STORAGE_KEY_MAT = 'rekap_material_clean_v6';
const STORAGE_KEY_PROC = 'daily_process_clean_v6';
const STORAGE_KEY_FC = 'rekap_fc_items_v7';
const STORAGE_KEY_RAW_PROC = 'daily_raw_process_v7';
const STORAGE_KEY_PRIOR_WEEK_PROC = 'prior_week_process_rows_v1';
const STORAGE_KEY_PRIOR_WEEK_META = 'prior_week_plan_meta_v1';

// Purge any legacy keys from previous sessions
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('rekap_material_data_v2');
    localStorage.removeItem('daily_process_data_v2');
    localStorage.removeItem('rekap_material_user_data_v3');
    localStorage.removeItem('daily_process_user_data_v3');
    localStorage.removeItem('rekap_material_clean_v5');
    localStorage.removeItem('daily_process_clean_v5');
  } catch {}
}

export default function App() {
  const [activeView, setActiveView] = useState<'process' | 'material' | 'summary' | 'sop' | 'folding-cutting'>('material');
  const [activeDayFilter, setActiveDayFilter] = useState<string>('Semua');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isMasterOpen, setIsMasterOpen] = useState(false);
  const [isMasterRumusOpen, setIsMasterRumusOpen] = useState(false);
  const [isGoogleSheetsOpen, setIsGoogleSheetsOpen] = useState(false);
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);
  const [isDeploymentOpen, setIsDeploymentOpen] = useState(false);
  const [sheetName, setSheetName] = useState('Semua Lembar (Multi-Sheets)');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Master Code Mappings State
  const [masterCodes, setMasterCodes] = useState<MasterCodeMapping[]>(() => getMasterCodeMappings());

  // Master Rumus Mappings State
  const [formulas, setFormulas] = useState<MasterRumusMapping[]>(() => getFormulaMappings());

  // Detected Folding & Cutting Items from Excel (Default: ignored)
  const [detectedFC, setDetectedFC] = useState<FoldingCuttingItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FC);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // Raw Process Rows (Unfiltered Excel data)
  const [rawProcessData, setRawProcessData] = useState<DailyProcessRow[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RAW_PROC);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // Initialize Material Data - starts completely empty & deduplicates keys safely
  const [materialData, setMaterialData] = useState<MaterialRekapRow[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MAT);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const seen = new Set<string>();
          return parsed.map((row, idx) => {
            let rowId = row.id || `mat-saved-${Date.now()}-${idx}`;
            if (seen.has(rowId)) {
              rowId = `${rowId}-uniq-${idx}-${Math.random().toString(36).slice(2, 6)}`;
            }
            seen.add(rowId);
            return { ...row, id: rowId };
          });
        }
      }
    } catch {}
    return [];
  });

  // Initialize Process Data - starts completely empty & deduplicates keys safely
  const [processData, setProcessData] = useState<DailyProcessRow[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PROC);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const seen = new Set<string>();
          return parsed.map((row, idx) => {
            let rowId = row.id || `proc-saved-${Date.now()}-${idx}`;
            if (seen.has(rowId)) {
              rowId = `${rowId}-uniq-${idx}-${Math.random().toString(36).slice(2, 6)}`;
            }
            seen.add(rowId);
            return { ...row, id: rowId };
          });
        }
      }
    } catch {}
    return [];
  });

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MAT, JSON.stringify(materialData));
    } catch {}
  }, [materialData]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PROC, JSON.stringify(processData));
    } catch {}
  }, [processData]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_FC, JSON.stringify(detectedFC));
    } catch {}
  }, [detectedFC]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_RAW_PROC, JSON.stringify(rawProcessData));
    } catch {}
  }, [rawProcessData]);

  // Prior Week Process Rows & Metadata (Historical Reference)
  const [priorWeekRows, setPriorWeekRows] = useState<DailyProcessRow[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PRIOR_WEEK_PROC);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const [priorWeekMeta, setPriorWeekMeta] = useState<PriorWeekPlanMeta | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PRIOR_WEEK_META);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return null;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PRIOR_WEEK_PROC, JSON.stringify(priorWeekRows));
    } catch {}
  }, [priorWeekRows]);

  useEffect(() => {
    try {
      if (priorWeekMeta) {
        localStorage.setItem(STORAGE_KEY_PRIOR_WEEK_META, JSON.stringify(priorWeekMeta));
      } else {
        localStorage.removeItem(STORAGE_KEY_PRIOR_WEEK_META);
      }
    } catch {}
  }, [priorWeekMeta]);

  const handleSavePriorWeekPlan = (rows: DailyProcessRow[], meta: PriorWeekPlanMeta) => {
    setPriorWeekRows(rows);
    setPriorWeekMeta(meta);

    // Jika data rawProcessData minggu berjalan sudah ada, evaluasi ulang dengan acuan minggu lalu yang baru
    if (rawProcessData.length > 0) {
      const newFC = extractFoldingCuttingItems(rawProcessData, rows, meta.fileName);
      setDetectedFC(newFC);
      const filteredProc = filterProcessRowsByFoldingCutting(rawProcessData, newFC);
      setProcessData(filteredProc);
      const newMat = autoConvertProcessToRekap(filteredProc, sheetName, masterCodes);
      setMaterialData(newMat);
      showToast(`Data minggu lalu "${meta.fileName}" aktif! ${newFC.filter((i) => i.isPriorWeekSlit).length} sisa slit terhubung.`);
    } else {
      showToast(`Data minggu lalu "${meta.fileName}" disimpan (${meta.slittingItemCount} item Slitting).`);
    }
  };

  const handleClearPriorWeekPlan = () => {
    setPriorWeekRows([]);
    setPriorWeekMeta(null);
    try {
      localStorage.removeItem(STORAGE_KEY_PRIOR_WEEK_PROC);
      localStorage.removeItem(STORAGE_KEY_PRIOR_WEEK_META);
    } catch {}

    if (rawProcessData.length > 0) {
      const newFC = extractFoldingCuttingItems(rawProcessData, [], undefined);
      setDetectedFC(newFC);
      const filteredProc = filterProcessRowsByFoldingCutting(rawProcessData, newFC);
      setProcessData(filteredProc);
      const newMat = autoConvertProcessToRekap(filteredProc, sheetName, masterCodes);
      setMaterialData(newMat);
    }
    showToast('Data arsip minggu sebelumnya telah dihapus.');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Master Code Operations
  const handleSaveMasterCodes = (updatedCodes: MasterCodeMapping[]) => {
    setMasterCodes(updatedCodes);
    saveMasterCodeMappings(updatedCodes);
    const gasUrl = getSavedGasUrl();
    if (gasUrl) {
      saveMasterCodesToGas(gasUrl, updatedCodes).catch(() => {});
    }
    // Jika sudah ada data proses, perbarui rekap material dengan pemetaan master terbaru
    const sourceRows = rawProcessData.length > 0 ? rawProcessData : processData;
    if (sourceRows.length > 0) {
      const remapped = autoConvertProcessToRekap(sourceRows, sheetName, updatedCodes);
      setMaterialData(remapped);
      showToast(`Master kode disimpan & ${remapped.length} baris material disinkronkan!`);
    } else {
      showToast('Master kode berhasil disimpan!');
    }
  };

  // Real-time synchronization listener for Master Codes across tabs and cloud
  useEffect(() => {
    const unsubscribeCodes = subscribeToMasterCodeUpdates((updatedCodes) => {
      setMasterCodes(updatedCodes);
    });

    const unsubscribeFormulas = subscribeFormulaChanges((updatedFormulas) => {
      setFormulas(updatedFormulas);
    });

    const gasUrl = getSavedGasUrl();
    if (gasUrl) {
      fetchMasterCodesFromGas(gasUrl)
        .then((cloudCodes) => {
          if (cloudCodes && cloudCodes.length > 0) {
            setMasterCodes(cloudCodes);
            saveMasterCodeMappings(cloudCodes, false);
          }
        })
        .catch(() => {});

      fetchMasterRumusFromGas(gasUrl)
        .then((cloudFormulas) => {
          if (cloudFormulas && cloudFormulas.length > 0) {
            setFormulas(cloudFormulas);
            saveFormulaMappings(cloudFormulas);
          }
        })
        .catch(() => {});
    }

    return () => {
      unsubscribeCodes();
      unsubscribeFormulas();
    };
  }, []);

  // Master Rumus Operations
  const handleSaveFormulas = (updatedFormulas: MasterRumusMapping[]) => {
    setFormulas(updatedFormulas);
    saveFormulaMappings(updatedFormulas);
    const gasUrl = getSavedGasUrl();
    if (gasUrl) {
      saveMasterRumusToGas(gasUrl, updatedFormulas).catch(() => {});
    }
    // Remap rekapitulasi material dengan rumus terbaru
    const sourceRows = rawProcessData.length > 0 ? rawProcessData : processData;
    if (sourceRows.length > 0) {
      const remapped = autoConvertProcessToRekap(sourceRows, sheetName, masterCodes, updatedFormulas);
      setMaterialData(remapped);
      showToast(`Master rumus disimpan & ${remapped.length} baris material disinkronkan!`);
    } else {
      showToast('Master rumus berhasil disimpan!');
    }
  };

  // Material Table Operations
  const handleUpdateMaterial = (id: string, updated: Partial<MaterialRekapRow>) => {
    setMaterialData((prev) => prev.map((row) => (row.id === id ? { ...row, ...updated } : row)));
  };

  const handleAddMaterial = () => {
    const newRow: MaterialRekapRow = {
      id: `mat-custom-${Date.now()}`,
      week: getCurrentWeekString(),
      tanggal: new Date().toISOString().slice(0, 10),
      jenis: 'Kasa Lipat',
      nama: '24/20', // Default bahan baku murni
      qty: 0,
      hari: activeDayFilter !== 'Semua' ? activeDayFilter : 'Senin',
      sumber: 'MR', // DEFAULT MR SESUAI INSTRUKSI
      status: 'Belum', // DEFAULT BELUM SESUAI INSTRUKSI
      keterangan: '', // Tempat kode produk
      oleh: '',
      waktu: '',
      noMr: '',
      isHighlighted: false,
    };
    setMaterialData((prev) => [newRow, ...prev]);
    showToast('Baris bahan baku baru berhasil ditambahkan');
  };

  const handleDeleteMaterial = (id: string) => {
    setMaterialData((prev) => prev.filter((r) => r.id !== id));
    showToast('Baris bahan baku dihapus');
  };

  // Process Table Operations
  const handleUpdateProcess = (id: string, updated: Partial<DailyProcessRow>) => {
    setProcessData((prev) => prev.map((row) => (row.id === id ? { ...row, ...updated } : row)));
    setRawProcessData((prev) => prev.map((row) => (row.id === id ? { ...row, ...updated } : row)));
  };

  const handleAddProcess = () => {
    const newRow: DailyProcessRow = {
      id: `proc-custom-${Date.now()}`,
      no: (rawProcessData.length > 0 ? rawProcessData.length : processData.length) + 1,
      kode: '',
      namaProduk: '',
      slitting: 0,
      folding: 0,
      cutting: 0,
      sambung: 0,
      inspection: 0,
      total: 0,
      keterangan: '',
      hari: activeDayFilter !== 'Semua' ? activeDayFilter : 'Senin',
      sheetName,
    };
    setProcessData((prev) => [newRow, ...prev]);
    setRawProcessData((prev) => [newRow, ...prev]);
    showToast('Baris produk pengerjaan baru berhasil ditambahkan');
  };

  const handleDeleteProcess = (id: string) => {
    setProcessData((prev) => prev.filter((r) => r.id !== id));
    setRawProcessData((prev) => prev.filter((r) => r.id !== id));
    showToast('Baris produk dihapus');
  };

  // Sync Daily Process to Rekap Material
  const handleSyncProcessToMaterial = () => {
    const converted = autoConvertProcessToRekap(processData, sheetName, masterCodes);
    if (converted.length === 0) {
      showToast('Tidak ada data yang dapat dikonversi');
      return;
    }
    setMaterialData(converted);
    setActiveView('material');
    showToast(`Berhasil merekap ${converted.length} bahan baku (Needle Punch, 24/20, SHQ, dll.) dengan kode produk di keterangan!`);
  };

  // Clear all data (Replaced window.confirm with reliable in-app modal)
  const handleOpenClearModal = () => {
    setIsConfirmClearOpen(true);
  };

  const handleConfirmClearAll = () => {
    setMaterialData([]);
    setProcessData([]);
    setRawProcessData([]);
    setDetectedFC([]);
    setSheetName('');
    try {
      localStorage.removeItem(STORAGE_KEY_MAT);
      localStorage.removeItem(STORAGE_KEY_PROC);
      localStorage.removeItem(STORAGE_KEY_FC);
      localStorage.removeItem(STORAGE_KEY_RAW_PROC);
    } catch {}
    showToast('Seluruh data tabel berhasil dikosongkan!');
  };

  const handleConfirmClearMaterial = () => {
    setMaterialData([]);
    try {
      localStorage.removeItem(STORAGE_KEY_MAT);
    } catch {}
    showToast('Tabel Rekap Material Mesin berhasil dikosongkan.');
  };

  const handleConfirmClearProcess = () => {
    setProcessData([]);
    try {
      localStorage.removeItem(STORAGE_KEY_PROC);
    } catch {}
    showToast('Tabel Rencana Proses Mesin berhasil dikosongkan.');
  };

  // Export to Excel
  const handleExport = () => {
    exportToExcel(materialData, processData, activeView === 'process' ? 'process' : 'both', 'REKAP_MATERIAL_MESIN');
    showToast('File Excel berhasil diunduh!');
  };

  // Apply parsed uploaded data (supports Multi-Sheets at once, folding & cutting ignored by default)
  const handleApplyUploadedData = (res: {
    fileType: 'dailyProcess' | 'materialRekap';
    processRows?: DailyProcessRow[];
    rawProcessRows?: DailyProcessRow[];
    materialRows?: MaterialRekapRow[];
    detectedFoldingCutting?: FoldingCuttingItem[];
    sheetName: string;
  }) => {
    setSheetName(res.sheetName);
    if (res.rawProcessRows) {
      setRawProcessData(res.rawProcessRows);
    }
    if (res.detectedFoldingCutting) {
      setDetectedFC(res.detectedFoldingCutting);
    }
    if (res.processRows && res.processRows.length > 0) {
      setProcessData(res.processRows);
    }
    if (res.materialRows && res.materialRows.length > 0) {
      setMaterialData(res.materialRows);
    }
    // Langsung arahkan ke tampilan Rekap Material Mesin
    setActiveView('material');

    const fcIgnoredCount = (res.detectedFoldingCutting || []).filter(i => !i.isIncluded).length;
    const fcMsg = fcIgnoredCount > 0 ? ` (${fcIgnoredCount} bagian folding & cutting diabaikan secara bawaan)` : '';
    showToast(`Berhasil mengimpor & merekap ${res.materialRows?.length || 0} bahan baku${fcMsg}!`);
  };

  // Handle decisions from FoldingCuttingModal
  const handleSaveFoldingCutting = (updatedFC: FoldingCuttingItem[]) => {
    setDetectedFC(updatedFC);
    const sourceRows = rawProcessData.length > 0 ? rawProcessData : processData;
    const newProcessData = filterProcessRowsByFoldingCutting(sourceRows, updatedFC);
    const newMaterialData = autoConvertProcessToRekap(newProcessData, sheetName, masterCodes);

    setProcessData(newProcessData);
    setMaterialData(newMaterialData);

    const included = updatedFC.filter(i => i.isIncluded).length;
    showToast(`Keputusan Folding & Cutting disimpan: ${included} disertakan ke proses & rekap material.`);
  };

  // Re-evaluate folding & cutting automatically when parser rules update or on button click
  const handleResetToAutoHierarchy = () => {
    const sourceRows = rawProcessData.length > 0 ? rawProcessData : processData;
    if (sourceRows.length > 0) {
      const refreshed = extractFoldingCuttingItems(sourceRows, priorWeekRows, priorWeekMeta?.fileName);
      handleSaveFoldingCutting(refreshed);
      showToast('Saran sistem hierarki & deteksi week sebelumnya (Slit/Cut W1) berhasil diterapkan!');
    }
  };

  // Handle data pulled from Google Sheets via Apps Script Web App
  const handleImportGoogleSheetsData = (res: {
    materialRows: MaterialRekapRow[];
    processRows: DailyProcessRow[];
    title: string;
  }) => {
    if (res.materialRows.length > 0) {
      setMaterialData(res.materialRows);
    }
    if (res.processRows.length > 0) {
      setProcessData(res.processRows);
      setRawProcessData(res.processRows);
      const newFC = extractFoldingCuttingItems(res.processRows, priorWeekRows, priorWeekMeta?.fileName);
      setDetectedFC(newFC);
    }
    setSheetName(res.title);
    setActiveView('material');
    showToast(`Berhasil menarik data dari Google Spreadsheet "${res.title}" via Apps Script!`);
  };

  const fcIncludedCount = detectedFC.filter(i => i.isIncluded).length;
  const fcIgnoredCount = detectedFC.filter(i => !i.isIncluded).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      {/* Top Header - Single Authoritative Navigation & Action Bar */}
      <Header
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenMaster={() => setIsMasterOpen(true)}
        onOpenMasterRumus={() => setIsMasterRumusOpen(true)}
        onOpenGoogleSheets={() => setIsGoogleSheetsOpen(true)}
        onOpenFoldingCutting={() => setActiveView('folding-cutting')}
        onOpenDeployment={() => setIsDeploymentOpen(true)}
        fcCount={detectedFC.length}
        fcIncludedCount={fcIncludedCount}
        masterCount={masterCodes.length}
        formulaCount={formulas.length}
        onClearData={handleOpenClearModal}
        onExport={handleExport}
        activeView={activeView}
        setActiveView={setActiveView}
        totalItems={activeView === 'process' ? processData.length : materialData.length}
        hasData={materialData.length > 0 || processData.length > 0}
        sheetName={sheetName}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5">
        {activeView === 'material' && (
          <MaterialTable
            rows={materialData}
            onUpdateRow={handleUpdateMaterial}
            onAddRow={handleAddMaterial}
            onDeleteRow={handleDeleteMaterial}
            activeDayFilter={activeDayFilter}
            setActiveDayFilter={setActiveDayFilter}
            onOpenUpload={() => setIsUploadOpen(true)}
            onOpenFoldingCutting={() => setActiveView('folding-cutting')}
            fcCount={detectedFC.length}
            fcIgnoredCount={fcIgnoredCount}
          />
        )}

        {activeView === 'process' && (
          <DailyProcessTable
            rows={processData}
            onUpdateRow={handleUpdateProcess}
            onAddRow={handleAddProcess}
            onDeleteRow={handleDeleteProcess}
            onSyncToMaterialRekap={handleSyncProcessToMaterial}
            currentSheetName={sheetName}
            onOpenUpload={() => setIsUploadOpen(true)}
            onOpenFoldingCutting={() => setActiveView('folding-cutting')}
            fcCount={detectedFC.length}
            fcIgnoredCount={fcIgnoredCount}
          />
        )}

        {activeView === 'summary' && (
          <ScheduleSummary
            materials={materialData}
            activeDayFilter={activeDayFilter}
          />
        )}

        {activeView === 'folding-cutting' && (
          <FoldingCuttingView
            items={detectedFC}
            onSave={handleSaveFoldingCutting}
            onNavigateBack={() => setActiveView('material')}
            onResetToAutoHierarchy={handleResetToAutoHierarchy}
          />
        )}

        {activeView === 'sop' && <SOPModule />}
      </main>

      {/* Upload & Paste Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        masterCodes={masterCodes}
        priorWeekRows={priorWeekRows}
        priorWeekMeta={priorWeekMeta}
        onSavePriorWeekPlan={handleSavePriorWeekPlan}
        onClearPriorWeekPlan={handleClearPriorWeekPlan}
        onApplyData={handleApplyUploadedData}
      />

      {/* Master Code Mapping Modal */}
      <MasterCodeModal
        isOpen={isMasterOpen}
        onClose={() => setIsMasterOpen(false)}
        masterCodes={masterCodes}
        onSaveMasterCodes={handleSaveMasterCodes}
      />

      {/* Master Rumus Modal (Perhitungan Kasa Roll & Slitting Khusus) */}
      <MasterRumusModal
        isOpen={isMasterRumusOpen}
        onClose={() => setIsMasterRumusOpen(false)}
        masterCodes={masterCodes}
        formulas={formulas}
        onSaveFormulas={handleSaveFormulas}
      />

      {/* Google Sheets Sync Modal */}
      <GoogleSheetsModal
        isOpen={isGoogleSheetsOpen}
        onClose={() => setIsGoogleSheetsOpen(false)}
        materialData={materialData}
        processData={processData}
        masterCodes={masterCodes}
        onImportData={handleImportGoogleSheetsData}
      />

      {/* Confirm Clear Modal (Replaces blocked window.confirm) */}
      <ConfirmClearModal
        isOpen={isConfirmClearOpen}
        onClose={() => setIsConfirmClearOpen(false)}
        onConfirmClearAll={handleConfirmClearAll}
        onConfirmClearMaterial={handleConfirmClearMaterial}
        onConfirmClearProcess={handleConfirmClearProcess}
        materialCount={materialData.length}
        processCount={processData.length}
        sheetName={sheetName}
      />

      {/* Deployment Guide Modal (Netlify, Vercel, Server Private) */}
      <DeploymentModal
        isOpen={isDeploymentOpen}
        onClose={() => setIsDeploymentOpen(false)}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-lg border border-slate-700 text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
