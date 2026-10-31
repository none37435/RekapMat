import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  X,
  Upload,
  Download,
  Trash2,
  FileSpreadsheet,
  Database,
  Cloud,
  ChevronRight,
  Scissors,
  Server,
} from 'lucide-react';

interface HeaderProps {
  onOpenUpload: () => void;
  onOpenMaster: () => void;
  onOpenGoogleSheets: () => void;
  onOpenFoldingCutting?: () => void;
  onOpenDeployment?: () => void;
  fcCount?: number;
  fcIncludedCount?: number;
  masterCount: number;
  onClearData: () => void;
  onExport: () => void;
  activeView: 'process' | 'material' | 'summary' | 'sop' | 'folding-cutting';
  setActiveView: (view: 'process' | 'material' | 'summary' | 'sop' | 'folding-cutting') => void;
  totalItems: number;
  hasData?: boolean;
  sheetName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenUpload,
  onOpenMaster,
  onOpenGoogleSheets,
  onOpenFoldingCutting,
  onOpenDeployment,
  fcCount = 0,
  fcIncludedCount = 0,
  masterCount,
  onClearData,
  onExport,
  activeView,
  setActiveView,
  totalItems,
  hasData = totalItems > 0,
  sheetName,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-3">
          
          {/* Zone 1: Brand & Status Wordmark */}
          <div className="flex items-center gap-2.5 shrink-0 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold shadow-xs shrink-0">
              <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-bold text-slate-900 tracking-tight whitespace-nowrap">
                  REKAP MATERIAL MESIN
                </span>
                <span className="text-[10px] sm:text-xs bg-slate-100 text-slate-600 font-mono px-2 py-0.5 rounded font-semibold border border-slate-200 shrink-0">
                  {totalItems} Item
                </span>
                {fcCount > 0 && onOpenFoldingCutting && (
                  <button
                    onClick={onOpenFoldingCutting}
                    title="Buka halaman Keputusan Bagian Folding Mesin & Cutting"
                    className={`inline-flex items-center gap-1 text-[10px] sm:text-xs font-mono px-2 py-0.5 rounded font-semibold border shrink-0 transition-colors shadow-2xs ${
                      activeView === 'folding-cutting'
                        ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                        : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                    }`}
                  >
                    <Scissors className={`w-3 h-3 ${activeView === 'folding-cutting' ? 'text-white' : 'text-amber-600'}`} />
                    <span>{fcCount - fcIncludedCount} FC Diabaikan</span>
                  </button>
                )}
              </div>
              {sheetName && (
                <p className="text-[11px] text-slate-500 font-mono truncate max-w-[170px] sm:max-w-xs">
                  {sheetName}
                </p>
              )}
            </div>
          </div>

          {/* Zone 2: Navigation Links (Clean and unobstructed) */}
          <nav className="hidden md:flex items-center gap-1 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveView('material')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                activeView === 'material'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              1. Rekap Material Mesin
            </button>
            <button
              onClick={() => setActiveView('process')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                activeView === 'process'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              2. Rencana Proses Mesin
            </button>
            <button
              onClick={() => setActiveView('summary')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                activeView === 'summary'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              3. Rekapitulasi Otomatis
            </button>
            <button
              onClick={() => setActiveView('folding-cutting')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                activeView === 'folding-cutting'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200/80'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>4. Keputusan Folding & Cutting</span>
              {fcCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    activeView === 'folding-cutting'
                      ? 'bg-amber-800 text-amber-100'
                      : 'bg-amber-200 text-amber-900'
                  }`}
                >
                  {fcCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveView('sop')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                activeView === 'sop'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              5. Modul SOP Onboarding
            </button>
          </nav>

          {/* Zone 3: Burger Menu (Consolidates all action buttons cleanly) */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-expanded={isMenuOpen}
              aria-label="Buka menu aksi"
              className={`inline-flex items-center gap-2 px-3 py-1.5 sm:py-2 text-xs font-bold rounded-lg border transition-all shadow-2xs active:scale-[0.98] ${
                isMenuOpen
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {isMenuOpen ? (
                <X className="w-4 h-4 text-white" />
              ) : (
                <Menu className="w-4 h-4 text-slate-700" />
              )}
              <span className="hidden sm:inline">Menu Aksi</span>
              <span className="sm:hidden text-[10px] font-mono">Menu</span>
            </button>

            {/* Dropdown Panel */}
            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-fade-in divide-y divide-slate-100">
                {/* Mobile Navigation section (only shown on small screens) */}
                <div className="p-2 md:hidden">
                  <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Navigasi Tampilan
                  </p>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <button
                      onClick={() => {
                        setActiveView('material');
                        setIsMenuOpen(false);
                      }}
                      className={`px-2.5 py-1.5 text-left rounded-md font-medium text-[11px] truncate ${
                        activeView === 'material' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      1. Rekap Material
                    </button>
                    <button
                      onClick={() => {
                        setActiveView('process');
                        setIsMenuOpen(false);
                      }}
                      className={`px-2.5 py-1.5 text-left rounded-md font-medium text-[11px] truncate ${
                        activeView === 'process' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      2. Rencana Proses
                    </button>
                    <button
                      onClick={() => {
                        setActiveView('summary');
                        setIsMenuOpen(false);
                      }}
                      className={`px-2.5 py-1.5 text-left rounded-md font-medium text-[11px] truncate ${
                        activeView === 'summary' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      3. Rekapitulasi
                    </button>
                    <button
                      onClick={() => {
                        setActiveView('folding-cutting');
                        setIsMenuOpen(false);
                      }}
                      className={`px-2.5 py-1.5 text-left rounded-md font-medium text-[11px] truncate ${
                        activeView === 'folding-cutting' ? 'bg-amber-600 text-white font-bold' : 'hover:bg-amber-50 text-amber-900'
                      }`}
                    >
                      4. Keputusan F&C
                    </button>
                    <button
                      onClick={() => {
                        setActiveView('sop');
                        setIsMenuOpen(false);
                      }}
                      className={`px-2.5 py-1.5 text-left rounded-md font-medium text-[11px] truncate col-span-2 ${
                        activeView === 'sop' ? 'bg-emerald-700 text-white' : 'hover:bg-slate-100 text-emerald-800'
                      }`}
                    >
                      5. Modul SOP Onboarding
                    </button>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="p-1.5 space-y-0.5">
                  <p className="px-2.5 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Aksi Data & Sistem
                  </p>

                  {/* 1. Upload .xlsx */}
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenUpload();
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg text-left hover:bg-slate-50 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center text-slate-700">
                        <Upload className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">
                          Upload File (.xlsx)
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Impor Excel harian / multi-sheets
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                  </button>

                  {/* 2. Google Sheets */}
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenGoogleSheets();
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg text-left hover:bg-emerald-50/70 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 group-hover:bg-emerald-200 flex items-center justify-center text-emerald-800">
                        <Cloud className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-emerald-950 block">
                          Google Sheets
                        </span>
                        <span className="text-[11px] text-emerald-700">
                          Sinkronkan & buat spreadsheet
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-emerald-600" />
                  </button>

                  {/* 3. Master Kode */}
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenMaster();
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg text-left hover:bg-slate-50 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center text-slate-700">
                        <Database className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900">
                            Master Kode
                          </span>
                          <span className="px-1.5 py-0.2 bg-slate-800 text-white rounded-full text-[10px] font-mono">
                            {masterCount}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500">
                          Needle Punch, 24/20, SHQ, dll.
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                  </button>

                  {/* 3.5. Kelola Folding & Cutting Excel */}
                  {fcCount > 0 && (
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenFoldingCutting?.();
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-lg text-left hover:bg-amber-50/70 transition-colors group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 group-hover:bg-amber-200 flex items-center justify-center text-amber-800">
                          <Scissors className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900">
                              Folding & Cutting Excel
                            </span>
                            <span className="px-1.5 py-0.2 bg-amber-600 text-white rounded-full text-[10px] font-mono font-semibold">
                              {fcIncludedCount}/{fcCount}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500">
                            Tinjau keterangan Excel & putuskan
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-amber-600 group-hover:text-amber-800" />
                    </button>
                  )}

                  {/* 4. Ekspor Excel */}
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onExport();
                    }}
                    disabled={!hasData}
                    className="w-full flex items-center justify-between p-2 rounded-lg text-left hover:bg-emerald-50/70 transition-colors disabled:opacity-40 disabled:cursor-not-allowed group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-2xs">
                        <Download className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">
                          Ekspor Excel (.xlsx)
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Unduh rekap tabel pengerjaan
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                  </button>

                  {/* 4.5. Panduan Deployment (Netlify, Vercel, Server Private) */}
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenDeployment?.();
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg text-left hover:bg-sky-50/70 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-sky-100 group-hover:bg-sky-200 flex items-center justify-center text-sky-700">
                        <Server className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">
                          Panduan Deploy
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Netlify, Vercel, & Server Private
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                  </button>
                </div>

                {/* 5. Kosongkan Data (Destructive Action) */}
                <div className="p-1.5">
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onClearData();
                    }}
                    disabled={!hasData}
                    className="w-full flex items-center gap-2.5 p-2 rounded-lg text-left hover:bg-rose-50 text-rose-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold block">
                        Kosongkan Seluruh Tabel
                      </span>
                      <span className="text-[11px] text-rose-500">
                        Reset dan bersihkan data saat ini
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
