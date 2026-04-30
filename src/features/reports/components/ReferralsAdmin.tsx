'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/shared/lib/supabase/client';
import { Users, CheckCircle, Clock, Plus } from 'lucide-react';

type Referral = {
  id: string;
  referrer_doc: string;
  referred_doc: string;
  status: 'pending' | 'completed';
  created_at: string;
};

type PatientDirectory = {
  doc_id: string;
  full_name: string;
  phone: string;
  referral_code: string;
  created_at: string;
};

export function ReferralsAdmin() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [patients, setPatients] = useState<PatientDirectory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [newReferrer, setNewReferrer] = useState('');
  const [newReferred, setNewReferred] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchReferrals();
  }, []);

  const fetchReferrals = async () => {
    setIsLoading(true);
    const supabase = createClient();
    
    // Fetch referrals
    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching referrals', error);
    } else {
      setReferrals(data || []);
    }
    
    // Fetch patient directory
    const { data: dirData, error: dirError } = await supabase
      .from('patients_directory')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (!dirError) {
      setPatients(dirData || []);
    }

    setIsLoading(false);
  };

  const handleAddReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReferrer || !newReferred) return;

    setIsSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('referrals')
      .insert([
        { referrer_doc: newReferrer, referred_doc: newReferred, status: 'pending' }
      ]);

    if (error) {
      alert('Error al agregar referido: ' + error.message);
    } else {
      setNewReferrer('');
      setNewReferred('');
      fetchReferrals();
    }
    setIsSubmitting(false);
  };

  const handleCompleteReferral = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('referrals')
      .update({ status: 'completed' })
      .eq('id', id);

    if (error) {
      alert('Error al completar referido: ' + error.message);
    } else {
      fetchReferrals();
    }
  };

  const handleDeleteReferral = async (id: string) => {
    if(!confirm('¿Eliminar este registro de referido?')) return;
    
    setIsLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('referrals')
      .delete()
      .eq('id', id);
      
    if (error) {
      alert('Error al eliminar referido: ' + error.message);
      setIsLoading(false);
    } else {
      fetchReferrals();
    }
  };

  // Agrupamiento simple para ver quién tiene recompensas pendientes
  const completedByReferrer = referrals
    .filter(r => r.status === 'completed')
    .reduce((acc, curr) => {
      acc[curr.referrer_doc] = (acc[curr.referrer_doc] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Formulario de Nuevo Referido */}
      <div className="bg-white p-6 rounded-3xl shadow-[4px_4px_10px_#b8b9be,-4px_-4px_10px_#ffffff]">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-blue-500" /> Nuevo Referido
        </h2>
        <form onSubmit={handleAddReferral} className="flex flex-col md:flex-row items-end gap-4">
          <div className="flex-1 w-full">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Cédula del que Invita (Embajador)</label>
            <input
              type="text"
              value={newReferrer}
              onChange={(e) => setNewReferrer(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="Ej. 111"
              required
            />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Cédula del Nuevo Paciente</label>
            <input
              type="text"
              value={newReferred}
              onChange={(e) => setNewReferred(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="Ej. 222"
              required
            />
          </div>
          <div className="w-full md:w-auto">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full md:w-auto px-8 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 transition-all whitespace-nowrap"
            >
              {isSubmitting ? 'Registrando...' : 'Registrar Referido'}
            </button>
          </div>
        </form>
      </div>

      {/* Resumen de Recompensas */}
      <div className="bg-white p-6 rounded-3xl shadow-[4px_4px_10px_#b8b9be,-4px_-4px_10px_#ffffff]">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-emerald-500" /> Recompensas a Liberar (Meta: 2)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="text-gray-700 bg-gray-50">
              <tr>
                <th className="px-4 py-3 rounded-l-xl">Embajador (Cédula)</th>
                <th className="px-4 py-3">Referidos Asistidos</th>
                <th className="px-4 py-3 rounded-r-xl">Estado</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(completedByReferrer).map(([doc, count]) => (
                <tr key={doc} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 font-semibold text-gray-800">{doc}</td>
                  <td className="px-4 py-3 font-bold text-blue-600">{count}</td>
                  <td className="px-4 py-3">
                    {count >= 2 ? (
                      <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                        ¡Recompensa Desbloqueada!
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">Le falta {2 - count}</span>
                    )}
                  </td>
                </tr>
              ))}
              {Object.keys(completedByReferrer).length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-400 italic">
                    Aún no hay referidos completados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lista de Referidos */}
      <div className="bg-white p-6 rounded-3xl shadow-[4px_4px_10px_#b8b9be,-4px_-4px_10px_#ffffff]">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Historial de Referidos</h2>
        {isLoading ? (
          <div className="py-8 text-center text-gray-500">Cargando...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="text-gray-700 bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 font-semibold">Fecha Registro</th>
                  <th className="px-4 py-3 font-semibold">Embajador (Invitó)</th>
                  <th className="px-4 py-3 font-semibold">Nuevo Paciente</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((ref) => (
                  <tr key={ref.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-xs">{new Date(ref.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{ref.referrer_doc}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{ref.referred_doc}</td>
                    <td className="px-4 py-3">
                      {ref.status === 'completed' ? (
                        <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg w-max text-xs font-semibold">
                          <CheckCircle className="w-3 h-3" /> Asistió
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-orange-500 bg-orange-50 px-2 py-1 rounded-lg w-max text-xs font-semibold">
                          <Clock className="w-3 h-3" /> Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {ref.status === 'pending' && (
                        <button
                          onClick={() => handleCompleteReferral(ref.id)}
                          className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold rounded-lg text-xs transition-colors"
                        >
                          Marcar Asistencia
                        </button>
                      )}
                      <button
                          onClick={() => handleDeleteReferral(ref.id)}
                          className="px-2 py-1.5 text-gray-400 hover:text-red-500 transition-colors text-xs"
                          title="Eliminar"
                        >
                          ✕
                      </button>
                    </td>
                  </tr>
                ))}
                {referrals.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">
                      No se encontraron registros de referidos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Directorio de Pacientes / Códigos de Referido */}
      <div className="bg-white p-6 rounded-3xl shadow-[4px_4px_10px_#b8b9be,-4px_-4px_10px_#ffffff]">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" /> Directorio de Embajadores (Pacientes Históricos)
          </h2>
          <div className="w-full md:w-64">
            <input
              type="text"
              placeholder="Buscar por nombre o cédula..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
            />
          </div>
        </div>
        
        {isLoading ? (
          <div className="py-8 text-center text-gray-500">Cargando directorio...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="text-gray-700 bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 font-semibold rounded-l-xl">Nombres</th>
                  <th className="px-4 py-3 font-semibold">Documento</th>
                  <th className="px-4 py-3 font-semibold">Celular</th>
                  <th className="px-4 py-3 font-semibold rounded-r-xl">Código de Referido</th>
                </tr>
              </thead>
              <tbody>
                {patients
                  .filter(p => p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || p.doc_id.includes(searchQuery))
                  .slice(0, 50) // Mostrar máximo 50 para evitar lags en el DOM
                  .map((p) => (
                  <tr key={p.doc_id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{p.full_name}</td>
                    <td className="px-4 py-3">{p.doc_id}</td>
                    <td className="px-4 py-3">{p.phone || '-'}</td>
                    <td className="px-4 py-3">
                      <span className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg font-mono font-bold tracking-widest text-xs border border-indigo-100">
                        {p.referral_code}
                      </span>
                    </td>
                  </tr>
                ))}
                {patients.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400 italic">
                      Aún no hay pacientes en el directorio. Carga un archivo de médicos en la página principal para poblarlos.
                    </td>
                  </tr>
                )}
                {patients.length > 0 && patients.filter(p => p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || p.doc_id.includes(searchQuery)).length === 0 && (
                   <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400 italic">
                      No se encontraron resultados para tu búsqueda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {patients.length > 50 && searchQuery === '' && (
              <p className="text-center text-xs text-gray-400 mt-4">
                Mostrando los últimos 50 pacientes. Usa el buscador para encontrar a alguien específico.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
