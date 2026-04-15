import { create } from 'zustand';

interface ReportesState {
  reporteFacturacionData: any[][] | null;
  reporteTransaccionData: any[][] | null;
  filteredCount: number;
  transaccionFilteredCount: number;
  setReporteFacturacionData: (data: any[][], filteredCount: number) => void;
  setReporteTransaccionData: (data: any[][], filteredCount: number) => void;
  appendReporteData: (data: any[][], filteredCount: number) => void;
  updateReporteFacturacionData: (data: any[][]) => void;
  clearReporteFacturacionData: () => void;
}

export const useReportesStore = create<ReportesState>((set) => ({
  reporteFacturacionData: null,
  reporteTransaccionData: null,
  filteredCount: 0,
  transaccionFilteredCount: 0,
  setReporteFacturacionData: (data, filteredCount) => set({ 
    reporteFacturacionData: data ? [
      data[0], // Header
      ...data.slice(1).sort((a, b) => String(a[1] || '').localeCompare(String(b[1] || '')))
    ] : null, 
    filteredCount 
  }),
  setReporteTransaccionData: (data, filteredCount) => set({ reporteTransaccionData: data, transaccionFilteredCount: filteredCount }),
  updateReporteFacturacionData: (data) => set({ 
    reporteFacturacionData: data ? [
      data[0], // Header
      ...data.slice(1).sort((a, b) => String(a[1] || '').localeCompare(String(b[1] || '')))
    ] : null 
  }),
  appendReporteData: (newData, newFilteredCount) => set((state) => {
    // Si no hay datos previos, inicializar reporteFacturacionData con los nuevos datos
    if (!state.reporteFacturacionData) {
      const sorted = [
        newData[0],
        ...newData.slice(1).sort((a, b) => String(a[1] || '').localeCompare(String(b[1] || '')))
      ];
      return { 
        reporteFacturacionData: sorted, 
        filteredCount: newFilteredCount 
      };
    }
    
    // Omitir el encabezado del nuevo set de datos al concatenar
    const combinedData = [...state.reporteFacturacionData, ...newData.slice(1)];
    const sortedCombined = [
      combinedData[0],
      ...combinedData.slice(1).sort((a, b) => String(a[1] || '').localeCompare(String(b[1] || '')))
    ];

    return {
      reporteFacturacionData: sortedCombined,
      filteredCount: state.filteredCount + newFilteredCount
    };
  }),
  clearReporteFacturacionData: () => set({ 
    reporteFacturacionData: null, 
    reporteTransaccionData: null,
    filteredCount: 0, 
    transaccionFilteredCount: 0 
  }),
}));
