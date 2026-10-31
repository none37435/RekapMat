import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, X, RefreshCw } from 'lucide-react';

interface ConfirmClearModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmClearAll: () => void;
  onConfirmClearMaterial: () => void;
  onConfirmClearProcess: () => void;
  materialCount: number;
  processCount: number;
  sheetName?: string;
}

export const ConfirmClearModal: React.FC<ConfirmClearModalProps> = ({
  isOpen,
  onClose,
  onConfirmClearAll,
  onConfirmClearMaterial,
  onConfirmClearProcess,
  materialCount,
  processCount,
  sheetName,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalRows = materialCount + processCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div 
        className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="clear-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-rose-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shadow-2xs">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h3 id="clear-modal-title" className="text-sm sm:text-base font-bold text-slate-900">
                Kosongkan Seluruh Tabel?
              </h3>
              <p className="text-xs text-rose-700 font-medium">
                Konfirmasi penghapusan data pengerjaan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors hover:bg-white"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Data pada tabel saat ini dan riwayat lokal di browser akan dibersihkan. Pastikan Anda telah mengekspor ke Excel atau menyinkronkan ke Google Sheets jika data masih diperlukan.
          </p>

          {/* Data Summary Stats */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div className="border-r border-slate-200 pr-2">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                Rekap Material
              </span>
              <span className="text-lg font-bold font-mono text-slate-900">
                {materialCount}{' '}
                <span className="text-xs font-normal text-slate-500 font-sans">baris</span>
              </span>
            </div>
            <div className="pl-1">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                Rencana Proses
              </span>
              <span className="text-lg font-bold font-mono text-slate-900">
                {processCount}{' '}
                <span className="text-xs font-normal text-slate-500 font-sans">baris</span>
              </span>
            </div>
          </div>

          {sheetName && (
            <div className="text-[11px] text-slate-500 bg-slate-100/70 px-3 py-1.5 rounded border border-slate-200 font-mono truncate">
              File / Sheet aktif saat ini: <span className="font-semibold text-slate-700">{sheetName}</span>
            </div>
          )}

          {/* Granular Option Links if user wants specific table */}
          {materialCount > 0 && processCount > 0 && (
            <div className="pt-1">
              <p className="text-[11px] text-slate-500 mb-1.5">Atau kosongkan satu tabel saja:</p>
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    onConfirmClearMaterial();
                    onClose();
                  }}
                  className="px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition-colors"
                >
                  Kosongkan Rekap Material Saja
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onConfirmClearProcess();
                    onClose();
                  }}
                  className="px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition-colors"
                >
                  Kosongkan Rencana Proses Saja
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/70 rounded-lg border border-slate-300 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirmClearAll();
              onClose();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-lg shadow-2xs transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Ya, Kosongkan Semua ({totalRows} Baris)
          </button>
        </div>
      </div>
    </div>
  );
};
