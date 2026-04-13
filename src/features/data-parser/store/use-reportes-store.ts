import { create } from 'zustand';

interface ReportesState {
  reporteFacturacionData: any[][] | null;
  setReporteFacturacionData: (data: any[][]) => void;
  clearReporteFacturacionData: () => void;
}

export const useReportesStore = create<ReportesState>((set) => ({
  reporteFacturacionData: null,
  setReporteFacturacionData: (data) => set({ reporteFacturacionData: data }),
  clearReporteFacturacionData: () => set({ reporteFacturacionData: null }),
}));
