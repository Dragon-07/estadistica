'use client';

import { useCallback, useState } from 'react';
import { useExcelParser } from '@/features/data-parser/use-excel-parser';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X, Loader2 } from 'lucide-react';

export function ExcelUploader() {
  const { processFiles, isLoading, error, result } = useExcelParser();
  const [dragOver, setDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const excels = Array.from(files).filter(
      (f) => f.name.endsWith('.xlsx') || f.name.endsWith('.xls') || f.name.endsWith('.csv')
    );
    setSelectedFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      const newFiles = excels.filter((f) => !existingNames.has(f.name));
      return [...prev, ...newFiles];
    });
  }, []);

  const removeFile = (name: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.name !== name));
  };

  const handleProcess = async () => {
    if (selectedFiles.length === 0) return;
    await processFiles(selectedFiles);
  };

  return (
    <div className="space-y-6">
      {/* Zona de carga */}
      <div
        className={`
          relative border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all duration-300
          ${dragOver
            ? 'border-blue-400 bg-blue-50 shadow-[inset_4px_4px_12px_#b8b9be,inset_-4px_-4px_12px_#ffffff]'
            : 'border-[#c8c9d0] bg-[#e6e7ee] shadow-[6px_6px_14px_#b8b9be,-6px_-6px_14px_#ffffff] hover:shadow-[4px_4px_10px_#b8b9be,-4px_-4px_10px_#ffffff]'
          }
        `}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          multiple
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-[#e6e7ee] shadow-[4px_4px_10px_#b8b9be,-4px_-4px_10px_#ffffff] flex items-center justify-center">
            <Upload className="w-7 h-7 text-blue-500" />
          </div>
          <div>
            <p className="text-gray-700 font-semibold text-lg">Arrastra tus archivos Excel aquí</p>
            <p className="text-gray-400 text-sm mt-1">o haz clic para seleccionar · .xlsx · .xls · .csv</p>
          </div>
        </div>
      </div>

      {/* Lista de archivos seleccionados */}
      {selectedFiles.length > 0 && (
        <div className="space-y-3">
          {selectedFiles.map((file) => (
            <div
              key={file.name}
              className="flex items-center justify-between bg-[#e6e7ee] rounded-2xl px-5 py-4 shadow-[4px_4px_10px_#b8b9be,-4px_-4px_10px_#ffffff]"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#e6e7ee] shadow-[3px_3px_6px_#b8b9be,-3px_-3px_6px_#ffffff] flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4 text-green-500" />
                </div>
                <div>
                  <p className="text-gray-700 font-medium text-sm">{file.name}</p>
                  <p className="text-gray-400 text-xs">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); removeFile(file.name); }}
                className="w-8 h-8 rounded-full bg-[#e6e7ee] shadow-[2px_2px_5px_#b8b9be,-2px_-2px_5px_#ffffff] flex items-center justify-center hover:shadow-[inset_2px_2px_5px_#b8b9be,inset_-2px_-2px_5px_#ffffff] transition-shadow duration-200"
              >
                <X className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Botón de procesar */}
      {selectedFiles.length > 0 && (
        <button
          onClick={handleProcess}
          disabled={isLoading}
          className="w-full py-4 rounded-2xl font-semibold text-white text-base transition-all duration-200
            bg-gradient-to-r from-blue-500 to-blue-600
            shadow-[0_6px_20px_rgba(59,130,246,0.4)]
            hover:shadow-[0_8px_25px_rgba(59,130,246,0.5)] hover:-translate-y-0.5
            disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none
            flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Procesando y eliminando duplicados...</>
          ) : (
            <><Upload className="w-5 h-5" /> Procesar {selectedFiles.length} archivo{selectedFiles.length > 1 ? 's' : ''}</>
          )}
        </button>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Resultado */}
      {result && (
        <div className="bg-[#e6e7ee] rounded-3xl p-6 shadow-[8px_8px_16px_#b8b9be,-8px_-8px_16px_#ffffff]">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-gray-700 font-semibold">Procesamiento completado</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Registros totales', value: result.totalProcessed, color: 'text-blue-600' },
              { label: 'Únicos guardados', value: result.unique.length, color: 'text-green-600' },
              { label: 'Duplicados eliminados', value: result.totalDuplicates, color: 'text-amber-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-[#e6e7ee] rounded-2xl p-4 shadow-[inset_3px_3px_7px_#b8b9be,inset_-3px_-3px_7px_#ffffff] text-center">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-gray-500 text-xs mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
