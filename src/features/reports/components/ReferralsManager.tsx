'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/shared/lib/supabase/client';
import { 
  Users, 
  Gift, 
  Wallet, 
  Settings, 
  Search, 
  Plus, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  ArrowUpRight, 
  TrendingUp, 
  DollarSign, 
  UserPlus, 
  RefreshCw 
} from 'lucide-react';

type Referral = {
  id: string;
  referrer_doc: string;
  referrer_name?: string;
  referred_doc: string;
  referred_name?: string;
  reward_amount: number;
  discount_amount: number;
  status: 'completed' | 'pending' | 'cancelled';
  treatment_name?: string;
  invoice_number?: string;
  notes?: string;
  created_at: string;
};

type AmbassadorWallet = {
  doc_id: string;
  full_name: string;
  phone?: string;
  total_earned: number;
  total_redeemed: number;
  balance: number;
  referrals_count?: number;
};

type CampaignSettings = {
  id: number;
  campaign_name: string;
  referrer_reward: number;
  referred_discount: number;
  min_invoice_amount: number;
  is_active: boolean;
};

export function ReferralsManager() {
  const [activeTab, setActiveTab] = useState<'canje' | 'billeteras' | 'historial' | 'configuracion'>('canje');
  
  // Datos
  const [settings, setSettings] = useState<CampaignSettings>({
    id: 1,
    campaign_name: 'Campaña General Holística',
    referrer_reward: 15000,
    referred_discount: 15000,
    min_invoice_amount: 50000,
    is_active: true
  });
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [wallets, setWallets] = useState<AmbassadorWallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Formulario Canje Rápido
  const [referrerDoc, setReferrerDoc] = useState('');
  const [referrerName, setReferrerName] = useState('');
  const [referredDoc, setReferredDoc] = useState('');
  const [referredName, setReferredName] = useState('');
  const [treatmentName, setTreatmentName] = useState('');
  const [canjeSuccessMsg, setCanjeSuccessMsg] = useState('');

  // Búsqueda y Paginación
  const [searchQuery, setSearchQuery] = useState('');

  // Modal de Redención de Saldo
  const [selectedWallet, setSelectedWallet] = useState<AmbassadorWallet | null>(null);
  const [redeemAmount, setRedeemAmount] = useState<number>(0);
  const [isRedeeming, setIsRedeeming] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    const supabase = createClient();

    try {
      // 1. Cargar Configuración de Campaña
      const { data: settingsData } = await supabase
        .from('referral_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (settingsData) {
        setSettings({
          ...settingsData,
          referrer_reward: Number(settingsData.referrer_reward) || 15000,
          referred_discount: Number(settingsData.referred_discount) || 15000,
          min_invoice_amount: Number(settingsData.min_invoice_amount) || 50000,
        });
      }

      // 2. Cargar Referidos
      const { data: refData } = await supabase
        .from('referrals')
        .select('*')
        .order('created_at', { ascending: false });

      const safeRefs: Referral[] = (refData || []).map(r => ({
        ...r,
        reward_amount: Number(r.reward_amount) || 15000,
        discount_amount: Number(r.discount_amount) || 15000
      }));
      setReferrals(safeRefs);

      // 3. Cargar Billeteras
      const { data: walletData } = await supabase
        .from('ambassador_wallets')
        .select('*')
        .order('balance', { ascending: false });

      // Calcular número de referidos por embajador
      const countMap: Record<string, number> = {};
      safeRefs.filter(r => r.status === 'completed').forEach(r => {
        countMap[r.referrer_doc] = (countMap[r.referrer_doc] || 0) + 1;
      });

      const safeWallets: AmbassadorWallet[] = (walletData || []).map(w => ({
        ...w,
        total_earned: Number(w.total_earned) || 0,
        total_redeemed: Number(w.total_redeemed) || 0,
        balance: Number(w.balance) || 0,
        referrals_count: countMap[w.doc_id] || 0
      }));
      setWallets(safeWallets);

    } catch (err) {
      console.error('Error cargando datos de referidos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Registrar un Canje en Caja
  const handleCanjeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRefDoc = referrerDoc.trim();
    const cleanReferredDoc = referredDoc.trim();

    if (!cleanRefDoc || !cleanReferredDoc) {
      alert('Por favor ingresa la cédula del embajador y la del nuevo paciente.');
      return;
    }

    if (cleanRefDoc === cleanReferredDoc) {
      alert('La cédula del embajador y la del nuevo paciente no pueden ser la misma.');
      return;
    }

    setIsSaving(true);
    const supabase = createClient();

    try {
      const reward = settings.referrer_reward;
      const discount = settings.referred_discount;

      // 1. Insertar el registro de referido
      const { error: refError } = await supabase
        .from('referrals')
        .insert([{
          referrer_doc: cleanRefDoc,
          referrer_name: referrerName.trim() || `Embajador ${cleanRefDoc.slice(-4)}`,
          referred_doc: cleanReferredDoc,
          referred_name: referredName.trim() || `Paciente ${cleanReferredDoc.slice(-4)}`,
          reward_amount: reward,
          discount_amount: discount,
          treatment_name: treatmentName.trim() || 'Tratamiento Inicial',
          status: 'completed'
        }]);

      if (refError) throw refError;

      // 2. Actualizar o crear billetera del embajador
      const existingWallet = wallets.find(w => w.doc_id === cleanRefDoc);
      const newBalance = (existingWallet?.balance || 0) + reward;
      const newTotalEarned = (existingWallet?.total_earned || 0) + reward;

      const { error: walletError } = await supabase
        .from('ambassador_wallets')
        .upsert([{
          doc_id: cleanRefDoc,
          full_name: referrerName.trim() || existingWallet?.full_name || `Embajador ${cleanRefDoc}`,
          total_earned: newTotalEarned,
          total_redeemed: existingWallet?.total_redeemed || 0,
          balance: newBalance,
          updated_at: new Date().toISOString()
        }], { onConflict: 'doc_id' });

      if (walletError) throw walletError;

      // Éxito
      setCanjeSuccessMsg(`¡Bono de $${discount.toLocaleString('es-CO')} aplicado al nuevo paciente y $${reward.toLocaleString('es-CO')} acreditados al embajador!`);
      setReferrerDoc('');
      setReferrerName('');
      setReferredDoc('');
      setReferredName('');
      setTreatmentName('');
      setTimeout(() => setCanjeSuccessMsg(''), 6000);

      loadAllData();
    } catch (err: any) {
      alert('Error al registrar canje: ' + (err.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  // Guardar Configuración de Campaña
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('referral_settings')
        .upsert([{
          id: 1,
          campaign_name: settings.campaign_name,
          referrer_reward: Number(settings.referrer_reward),
          referred_discount: Number(settings.referred_discount),
          min_invoice_amount: Number(settings.min_invoice_amount),
          is_active: settings.is_active,
          updated_at: new Date().toISOString()
        }]);

      if (error) throw error;
      alert('¡Configuración de campaña actualizada exitosamente!');
    } catch (err: any) {
      alert('Error al guardar configuración: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Redimir Saldo de Billetera (Cuando el embajador gasta su saldo en una cita)
  const handleRedeemWallet = async () => {
    if (!selectedWallet || redeemAmount <= 0) return;
    if (redeemAmount > selectedWallet.balance) {
      alert('El monto a redimir no puede superar el saldo disponible.');
      return;
    }

    setIsRedeeming(true);
    const supabase = createClient();

    try {
      const updatedRedeemed = selectedWallet.total_redeemed + redeemAmount;
      const updatedBalance = selectedWallet.balance - redeemAmount;

      const { error } = await supabase
        .from('ambassador_wallets')
        .update({
          total_redeemed: updatedRedeemed,
          balance: updatedBalance,
          updated_at: new Date().toISOString()
        })
        .eq('doc_id', selectedWallet.doc_id);

      if (error) throw error;

      alert(`Se redimieron $${redeemAmount.toLocaleString('es-CO')} exitosamente.`);
      setSelectedWallet(null);
      setRedeemAmount(0);
      loadAllData();
    } catch (err: any) {
      alert('Error al redimir saldo: ' + err.message);
    } finally {
      setIsRedeeming(false);
    }
  };

  // Eliminar un registro de referido
  const handleDeleteReferral = async (id: string) => {
    if (!confirm('¿Eliminar este registro de referido?')) return;
    const supabase = createClient();
    const { error } = await supabase.from('referrals').delete().eq('id', id);
    if (!error) loadAllData();
  };

  // Totales de Métricas
  const totalReferidosCompletados = referrals.filter(r => r.status === 'completed').length;
  const totalDescuentosEntregados = referrals.reduce((sum, r) => sum + r.discount_amount, 0);
  const totalSaldoEnBilleteras = wallets.reduce((sum, w) => sum + w.balance, 0);
  const totalSaldoRedimido = wallets.reduce((sum, w) => sum + w.total_redeemed, 0);

  // Filtrado de Billeteras
  const filteredWallets = wallets.filter(w => 
    w.doc_id.includes(searchQuery) || 
    w.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in text-gray-800">
      
      {/* TARJETAS DE MÉTRICAS GLOBALES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl shadow-[4px_4px_10px_#b8b9be,-4px_-4px_10px_#ffffff] border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Referidos Atendidos</p>
            <p className="text-2xl font-black text-gray-800 mt-1">{totalReferidosCompletados}</p>
            <p className="text-[11px] text-emerald-600 font-bold mt-0.5">Pacientes nuevos captados</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <UserPlus className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl shadow-[4px_4px_10px_#b8b9be,-4px_-4px_10px_#ffffff] border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Descuentos en Caja</p>
            <p className="text-2xl font-black text-blue-600 mt-1">${totalDescuentosEntregados.toLocaleString('es-CO')}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Entregados a nuevos pacientes</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Gift className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl shadow-[4px_4px_10px_#b8b9be,-4px_-4px_10px_#ffffff] border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Saldo en Billeteras</p>
            <p className="text-2xl font-black text-amber-600 mt-1">${totalSaldoEnBilleteras.toLocaleString('es-CO')}</p>
            <p className="text-[11px] text-amber-700 font-bold mt-0.5">Por gastar en la clínica</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl shadow-[4px_4px_10px_#b8b9be,-4px_-4px_10px_#ffffff] border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Bono Vigente</p>
            <p className="text-2xl font-black text-purple-600 mt-1">${settings.referrer_reward.toLocaleString('es-CO')}</p>
            <p className="text-[11px] text-purple-600 font-bold mt-0.5">Campaña: {settings.campaign_name}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* MENÚ DE PESTAÑAS INTERNAS */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('canje')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'canje' 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Plus className="w-4 h-4" /> Canje Rápido (Caja)
          </button>
          
          <button
            onClick={() => setActiveTab('billeteras')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'billeteras' 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Wallet className="w-4 h-4" /> Billetera Embajadores ({wallets.length})
          </button>

          <button
            onClick={() => setActiveTab('historial')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'historial' 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Clock className="w-4 h-4" /> Historial ({referrals.length})
          </button>

          <button
            onClick={() => setActiveTab('configuracion')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'configuracion' 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Settings className="w-4 h-4" /> Configurar Campaña
          </button>
        </div>

        <button
          onClick={loadAllData}
          title="Recargar datos"
          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-gray-50 rounded-xl transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
        </button>
      </div>

      {/* CONTENIDO 1: CANJE RÁPIDO EN CAJA */}
      {activeTab === 'canje' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-[4px_4px_10px_#b8b9be,-4px_-4px_10px_#ffffff] border border-gray-100 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Gift className="w-6 h-6 text-blue-600" /> Canje Rápido de Bono de Referido
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Aplica el descuento inmediato en caja y acredita el saldo a favor al embajador.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 text-blue-700 font-bold text-xs">
              <span>Bono actual de campaña:</span>
              <span className="text-sm font-extrabold text-blue-900">${settings.referrer_reward.toLocaleString('es-CO')} COP</span>
            </div>
          </div>

          {canjeSuccessMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm font-bold animate-fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{canjeSuccessMsg}</span>
            </div>
          )}

          <form onSubmit={handleCanjeSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Sección Embajador */}
              <div className="p-5 bg-amber-50/50 rounded-2xl border border-amber-200/60 space-y-4">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                  <Wallet className="w-4 h-4 text-amber-600" />
                  <span>1. Paciente que Invita (Embajador)</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Cédula del Embajador *</label>
                  <input
                    type="text"
                    value={referrerDoc}
                    onChange={(e) => setReferrerDoc(e.target.value)}
                    placeholder="Ej. 11223344"
                    className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nombre Completo (Opcional)</label>
                  <input
                    type="text"
                    value={referrerName}
                    onChange={(e) => setReferrerName(e.target.value)}
                    placeholder="Ej. Carlos Rodriguez"
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div className="p-3 bg-white rounded-xl border border-amber-100 flex items-center justify-between text-xs text-amber-900">
                  <span>Recompensa a acreditar:</span>
                  <span className="font-extrabold text-sm text-amber-700">+${settings.referrer_reward.toLocaleString('es-CO')} COP</span>
                </div>
              </div>

              {/* Sección Nuevo Paciente */}
              <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-200/60 space-y-4">
                <div className="flex items-center gap-2 text-blue-800 font-bold text-sm">
                  <UserPlus className="w-4 h-4 text-blue-600" />
                  <span>2. Nuevo Paciente (Primera Visita)</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Cédula del Nuevo Paciente *</label>
                  <input
                    type="text"
                    value={referredDoc}
                    onChange={(e) => setReferredDoc(e.target.value)}
                    placeholder="Ej. 99887766"
                    className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nombre Completo (Opcional)</label>
                  <input
                    type="text"
                    value={referredName}
                    onChange={(e) => setReferredName(e.target.value)}
                    placeholder="Ej. Maria Lopez"
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Tratamiento o Servicio (Opcional)</label>
                  <input
                    type="text"
                    value={treatmentName}
                    onChange={(e) => setTreatmentName(e.target.value)}
                    placeholder="Ej. Consulta Médica Integral / Sueroterapia"
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="p-3 bg-white rounded-xl border border-blue-100 flex items-center justify-between text-xs text-blue-900">
                  <span>Descuento aplicado en caja:</span>
                  <span className="font-extrabold text-sm text-emerald-600">-${settings.referred_discount.toLocaleString('es-CO')} COP</span>
                </div>
              </div>

            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-blue-300 hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isSaving ? 'Registrando y Aplicando...' : `Validar y Aplicar Descuento de $${settings.referred_discount.toLocaleString('es-CO')}`}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CONTENIDO 2: BILLETERA DE EMBAJADORES */}
      {activeTab === 'billeteras' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-[4px_4px_10px_#b8b9be,-4px_-4px_10px_#ffffff] border border-gray-100 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Wallet className="w-6 h-6 text-amber-600" /> Billetera de Embajadores (Saldo a Favor)
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Monedero digital de pacientes que han invitado amigos. Pueden redimir su saldo en consultas o tratamientos.
              </p>
            </div>

            <div className="w-full sm:w-72">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por cédula o nombre..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gray-100">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="text-xs uppercase bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3.5">Embajador</th>
                  <th className="px-5 py-3.5">Cédula</th>
                  <th className="px-5 py-3.5 text-center">Referidos Asistidos</th>
                  <th className="px-5 py-3.5 text-right">Total Ganado</th>
                  <th className="px-5 py-3.5 text-right">Total Redimido</th>
                  <th className="px-5 py-3.5 text-right">Saldo Disponible</th>
                  <th className="px-5 py-3.5 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs sm:text-sm">
                {filteredWallets.map((wallet) => (
                  <tr key={wallet.doc_id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-4 font-bold text-gray-800">{wallet.full_name}</td>
                    <td className="px-5 py-4 font-mono text-gray-500">{wallet.doc_id}</td>
                    <td className="px-5 py-4 text-center">
                      <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-xs">
                        {wallet.referrals_count || 0} amigos
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-medium text-gray-700">
                      ${wallet.total_earned.toLocaleString('es-CO')}
                    </td>
                    <td className="px-5 py-4 text-right text-gray-400">
                      ${wallet.total_redeemed.toLocaleString('es-CO')}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="font-black text-amber-700 font-outfit text-base">
                        ${wallet.balance.toLocaleString('es-CO')}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button
                        onClick={() => {
                          setSelectedWallet(wallet);
                          setRedeemAmount(wallet.balance > 0 ? wallet.balance : 0);
                        }}
                        disabled={wallet.balance <= 0}
                        className="px-3.5 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold text-xs rounded-xl disabled:opacity-30 disabled:pointer-events-none transition-all shadow-xs"
                      >
                        Redimir Saldo
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredWallets.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-gray-400 italic">
                      No hay embajadores registrados con saldo actualmente.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTENIDO 3: HISTORIAL DE REFERIDOS */}
      {activeTab === 'historial' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-[4px_4px_10px_#b8b9be,-4px_-4px_10px_#ffffff] border border-gray-100 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Clock className="w-6 h-6 text-blue-600" /> Bitácora de Referidos Canjeados
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Registro histórico de todas las invitaciones canjeadas y sus beneficios otorgados.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gray-100">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="text-xs uppercase bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3.5">Fecha</th>
                  <th className="px-5 py-3.5">Embajador (Invitó)</th>
                  <th className="px-5 py-3.5">Nuevo Paciente</th>
                  <th className="px-5 py-3.5">Servicio</th>
                  <th className="px-5 py-3.5 text-right">Descuento Paciente</th>
                  <th className="px-5 py-3.5 text-right">Bono Embajador</th>
                  <th className="px-5 py-3.5 text-center">Estado</th>
                  <th className="px-5 py-3.5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs sm:text-sm">
                {referrals.map((ref) => (
                  <tr key={ref.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-4 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(ref.created_at).toLocaleDateString('es-CO')}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-gray-800">{ref.referrer_name || ref.referrer_doc}</p>
                      <p className="text-[11px] text-gray-400 font-mono">CC: {ref.referrer_doc}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-gray-800">{ref.referred_name || ref.referred_doc}</p>
                      <p className="text-[11px] text-gray-400 font-mono">CC: {ref.referred_doc}</p>
                    </td>
                    <td className="px-5 py-4 text-xs font-medium text-gray-600">
                      {ref.treatment_name || '-'}
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-emerald-600">
                      -${ref.discount_amount.toLocaleString('es-CO')}
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-amber-600">
                      +${ref.reward_amount.toLocaleString('es-CO')}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Asistió
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleDeleteReferral(ref.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {referrals.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-gray-400 italic">
                      Aún no hay registros de referidos canjeados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTENIDO 4: CONFIGURACIÓN DE CAMPAÑA (GERENCIA) */}
      {activeTab === 'configuracion' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-[4px_4px_10px_#b8b9be,-4px_-4px_10px_#ffffff] border border-gray-100 space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Settings className="w-6 h-6 text-purple-600" /> Configuración de Campaña Cuantitativa
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Modifica los valores del bono según la temporada (ej. Día de la Madre, Navidad) sin necesidad de tocar código.
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-6 max-w-2xl">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Nombre de la Campaña Vigente
              </label>
              <input
                type="text"
                value={settings.campaign_name}
                onChange={(e) => setSettings({ ...settings, campaign_name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm font-semibold focus:ring-2 focus:ring-purple-500 outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Bono para el Nuevo Paciente ($ COP)
                </label>
                <input
                  type="number"
                  step="1000"
                  min="0"
                  value={settings.referred_discount}
                  onChange={(e) => setSettings({ ...settings, referred_discount: Number(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold text-blue-600 focus:ring-2 focus:ring-purple-500 outline-none"
                  required
                />
                <p className="text-[11px] text-gray-400 mt-1">Descuento aplicado en su 1ra factura.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Recompensa al Embajador ($ COP)
                </label>
                <input
                  type="number"
                  step="1000"
                  min="0"
                  value={settings.referrer_reward}
                  onChange={(e) => setSettings({ ...settings, referrer_reward: Number(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold text-amber-600 focus:ring-2 focus:ring-purple-500 outline-none"
                  required
                />
                <p className="text-[11px] text-gray-400 mt-1">Saldo acreditado en su billetera digital.</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Ticket Mínimo de Factura para Aplicar ($ COP)
              </label>
              <input
                type="number"
                step="5000"
                min="0"
                value={settings.min_invoice_amount}
                onChange={(e) => setSettings({ ...settings, min_invoice_amount: Number(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm font-semibold focus:ring-2 focus:ring-purple-500 outline-none"
                required
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Protege el margen: no se aplica bono si el tratamiento cuesta menos de este valor.
              </p>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-200">
              <input
                type="checkbox"
                id="is_active_chk"
                checked={settings.is_active}
                onChange={(e) => setSettings({ ...settings, is_active: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="is_active_chk" className="text-xs font-bold text-gray-700 cursor-pointer select-none">
                Campaña Activa en la Clínica (Permite canjear bonos en recepción)
              </label>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="px-8 py-3.5 bg-purple-600 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all disabled:opacity-50"
            >
              {isSaving ? 'Guardando Cambios...' : 'Guardar Nueva Configuración'}
            </button>
          </form>
        </div>
      )}

      {/* MODAL PARA REDIMIR SALDO DE BILLETERA */}
      {selectedWallet && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-gray-100 space-y-5 animate-scale-up">
            <div>
              <h3 className="text-lg font-bold text-gray-800">Redimir Saldo de Billetera</h3>
              <p className="text-xs text-gray-500 mt-1">
                Descuenta saldo disponible del embajador para abonar a una consulta o factura.
              </p>
            </div>

            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs space-y-1">
              <p className="font-bold text-amber-900">{selectedWallet.full_name}</p>
              <p className="text-amber-700">Cédula: {selectedWallet.doc_id}</p>
              <p className="text-sm font-black text-amber-800 pt-1">
                Saldo Disponible: ${selectedWallet.balance.toLocaleString('es-CO')} COP
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Monto a Redimir ($ COP)</label>
              <input
                type="number"
                step="1000"
                min="1000"
                max={selectedWallet.balance}
                value={redeemAmount}
                onChange={(e) => setRedeemAmount(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 font-bold text-base text-gray-800 focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedWallet(null)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRedeemWallet}
                disabled={isRedeeming || redeemAmount <= 0}
                className="flex-1 py-3 rounded-xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 shadow-md shadow-amber-200 disabled:opacity-50"
              >
                {isRedeeming ? 'Procesando...' : 'Confirmar Redención'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
