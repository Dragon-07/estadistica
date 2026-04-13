import { create } from 'zustand';

interface ReportesState {
  reporteFacturacionData: any[][] | null;
  filteredCount: number;
  setReporteFacturacionData: (data: any[][], filteredCount: number) => void;
  appendReporteData: (data: any[][], filteredCount: number) => void;
  clearReporteFacturacionData: () => void;
}

export const useReportesStore = create<ReportesState>((set) => ({
  reporteFacturacionData: null,
  filteredCount: 0,
  setReporteFacturacionData: (data, filteredCount) => set({ reporteFacturacionData: data, filteredCount }),
  appendReporteData: (newData, newFilteredCount) => set((state) => {
    if (!state.reporteFacturacionData) return { reporteFacturacionData: newData, filteredCount: newFilteredCount };
    
    // Omitir el encabezado del nuevo set de datos al concatenar
    const dataWithoutHeader = newData.slice(1);
    return {
      reporteFacturacionData: [...state.reporteFacturacionData, ...dataWithoutHeader],
      filteredCount: state.filteredCount + newFilteredCount
    };
  }),
  clearReporteFacturacionData: () => set({ reporteFacturacionData: null, filteredCount: 0 }),
}));
