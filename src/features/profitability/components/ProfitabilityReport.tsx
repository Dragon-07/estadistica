'use client';

export function ProfitabilityReport() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
      <div className="bg-[#e6e7ee] p-12 rounded-[3rem] shadow-[10px_10px_20px_#b8b9be,-10px_-10px_20px_#ffffff] text-center max-w-lg">
        <div className="w-20 h-20 mx-auto bg-blue-500/10 rounded-3xl flex items-center justify-center mb-6 shadow-[inset_4px_4px_8px_#b8b9be,inset_-4px_-4px_8px_#ffffff]">
          <span className="text-4xl">📊</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4" style={{ fontFamily: 'var(--font-manrope)' }}>
          Rentabilidad y Costos
        </h2>
        <p className="text-gray-500 leading-relaxed">
          Este módulo está en construcción. Próximamente se visualizarán aquí los reportes de análisis de rentabilidad y costos operativos.
        </p>
      </div>
    </div>
  );
}
