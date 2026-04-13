import { create } from 'zustand';

interface ReportesState {
  reporteFacturacionData: any[][] | null;
  reporteTransaccionData: any[][] | null;
  filteredCount: number;
  transaccionFilteredCount: number;
  setReporteFacturacionData: (data: any[][], filteredCount: number) => void;
  setReporteTransaccionData: (data: any[][], filteredCount: number) => void;
  appendReporteData: (data: any[][], filteredCount: number) => void;
  clearReporteFacturacionData: () => void;
}

export const useReportesStore = create<ReportesState>((set) => ({
  reporteFacturacionData: null,
  reporteTransaccionData: null,
  filteredCount: 0,
  transaccionFilteredCount: 0,
  setReporteFacturacionData: (data, filteredCount) => set({ reporteFacturacionData: data, filteredCount }),
  setReporteTransaccionData: (data, filteredCount) => set({ reporteTransaccionData: data, transaccionFilteredCount: filteredCount }),
  appendReporteData: (newData, newFilteredCount) => set((state) => {
    // Si no hay datos previos, inicializar reporteFacturacionData con los nuevos datos
    if (!state.reporteFacturacionData) {
      return { 
        reporteFacturacionData: newData, 
        filteredCount: newFilteredCount 
      };
    }
    
    // Omitir el encabezado del nuevo set de datos al concatenar
    const dataWithoutHeader = newData.slice(1);
    return {
      reporteFacturacionData: [...state.reporteFacturacionData, ...dataWithoutHeader],
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
