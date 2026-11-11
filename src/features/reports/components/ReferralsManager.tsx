'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/shared/lib/supabase/client';
import {
  processReportePacientes,
  ProcessPacientesResult,
  fetchAllPatientsDirectory,
  deleteAllReferralsData,
} from '@/features/data-parser/reportes';
import {
  Users,
  Gift,
  Wallet,
  Settings,
  Search,
  CheckCircle2,
  Clock,
  Trash2,
  UserPlus,
  RefreshCw,
  UploadCloud,
  Check,
  Share2,
  Sparkles,
  Eye,
  X,
  Award,
  AlertTriangle,
  Calendar,
  ShieldCheck,
  Receipt,
  Lock,
  UserCheck,
  Minus,
  Plus,
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
  redeemed_at?: string | null;
  redeemed_by?: string | null;
  referrer_reward_status?: 'pending' | 'available' | 'redeemed';
  referrer_reward_redeemed_at?: string | null;
  referrer_reward_redeemed_by?: string | null;
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
};

type CampaignSettings = {
  id: number;
  campaign_name: string;
  referrer_reward: number;
  referred_discount: number;
  min_invoice_amount: number;
  is_active: boolean;
};

type PatientDirectoryItem = {
  doc_id: string;
  first_name?: string;
  last_name?: string;
  full_name: string;
  phone?: string;
  email?: string;
  referral_code: string | null;
  referred_by_code?: string | null;
  referred_by_doc?: string | null;
  how_found?: string | null;
  created_at?: string;
};

type ReferralRedemption = {
  id: string;
  patient_doc: string;
  patient_name: string;
  redemption_type: 'first_visit_discount' | 'ambassador_reward';
  bonuses_count: number;
  unit_value: number;
  total_amount: number;
  related_referral_ids?: string[];
  cashier_username: string;
  notes?: string;
  created_at: string;
};

type CashierUser = {
  username: string;
  password: string;
  display_name: string;
  is_active: boolean;
  created_at?: string;
};

type AmbassadorSummary = {
  doc_id: string;
  full_name: string;
  phone?: string;
  referral_code: string;
  totalInscritos: number;
  totalPendientes: number;
  totalAsistieron: number;
  bonosDisponiblesCount: number;
  bonosRedimidosCount: number;
  totalEarned: number;
  totalRedeemed: number;
  balance: number;
  referredList: Referral[];
};

interface ReferralsManagerProps {
  userRole?: 'admin' | 'cashier';
  currentUsername?: string;
}

export function ReferralsManager({
  userRole = 'admin',
  currentUsername = 'holistica',
}: ReferralsManagerProps) {
  const [activeTab, setActiveTab] = useState<
    'caja' | 'redimidos' | 'embajadores' | 'movimiento' | 'configuracion'
  >('caja');

  // Datos principales del módulo independiente de Referidos
  const [settings, setSettings] = useState<CampaignSettings>({
    id: 1,
    campaign_name: 'Campaña General Holística',
    referrer_reward: 15000,
    referred_discount: 15000,
    min_invoice_amount: 50000,
    is_active: true,
  });
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [wallets, setWallets] = useState<AmbassadorWallet[]>([]);
  const [patients, setPatients] = useState<PatientDirectoryItem[]>([]);
  const [redemptions, setRedemptions] = useState<ReferralRedemption[]>([]);
  const [cashiers, setCashiers] = useState<CashierUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Carga de Excel de Base de Datos de Referidos (Solo Admin)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<ProcessPacientesResult | null>(null);
  const [syncBannerMsg, setSyncBannerMsg] = useState<string>('');

  // Modal para Borrar Todos los Registros de Referidos (Solo Admin)
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // ============================================================================
  // ESTADOS PESTAÑA 1: CAJA - BUSCAR POR CÉDULA Y REDIMIR BONOS
  // ============================================================================
  const [cajaSearchCedula, setCajaSearchCedula] = useState('');
  const [activeCajaCedula, setActiveCajaCedula] = useState('');
  const [firstVisitNote, setFirstVisitNote] = useState('');
  const [isRedeemingFirstVisit, setIsRedeemingFirstVisit] = useState(false);

  const [bonusesToRedeemCount, setBonusesToRedeemCount] = useState<number>(1);
  const [ambassadorRedeemNote, setAmbassadorRedeemNote] = useState('');
  const [isRedeemingAmbassadorBonuses, setIsRedeemingAmbassadorBonuses] = useState(false);
  const [cajaSuccessMessage, setCajaSuccessMessage] = useState('');

  // ============================================================================
  // ESTADOS PESTAÑA 2: HISTORIAL DE BONOS REDIMIDOS (POR DÍA)
  // ============================================================================
  const [redemptionDateFilter, setRedemptionDateFilter] = useState<string>('');
  const [redemptionTypeFilter, setRedemptionTypeFilter] = useState<
    'all' | 'first_visit_discount' | 'ambassador_reward'
  >('all');
  const [redemptionSearch, setRedemptionSearch] = useState('');

  // ============================================================================
  // ESTADOS PESTAÑA 3 Y 4: EMBAJADORES Y MOVIMIENTO DE REFERIDOS
  // ============================================================================
  const [ambassadorSearch, setAmbassadorSearch] = useState('');
  const [ambassadorFilter, setAmbassadorFilter] = useState<
    'all' | 'with_referrals' | 'with_balance'
  >('all');
  const [selectedAmbassadorDetail, setSelectedAmbassadorDetail] =
    useState<AmbassadorSummary | null>(null);

  const [referralSearch, setReferralSearch] = useState('');
  const [referralStatusFilter, setReferralStatusFilter] = useState<
    'all' | 'pending' | 'completed'
  >('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // ============================================================================
  // ESTADOS PESTAÑA 5: GESTIÓN DE USUARIOS DE CAJA (SOLO ADMIN)
  // ============================================================================
  const [newCashierUsername, setNewCashierUsername] = useState('');
  const [newCashierPassword, setNewCashierPassword] = useState('');
  const [newCashierDisplayName, setNewCashierDisplayName] = useState('');
  const [isSavingCashier, setIsSavingCashier] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const cleanDoc = (raw: string) =>
    raw.trim().replace(/\s+/g, '').replace(/[.,\-]/g, '').toUpperCase();

  // Normaliza el estado del bono del embajador para registros anteriores y nuevos
  const getEffectiveReferrerRewardStatus = (
    r: Referral
  ): 'pending' | 'available' | 'redeemed' => {
    if (r.status !== 'completed') return 'pending';
    if (r.referrer_reward_status === 'redeemed') return 'redeemed';
    return 'available';
  };

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

      const cleanNameStr = (val?: string | null) =>
        (val || '').replace(/\bnull\b/gi, '').replace(/\s+/g, ' ').trim();

      // 2. Cargar pacientes subidos en el Excel de Referidos
      const allPatients = await fetchAllPatientsDirectory();
      setPatients(
        allPatients.map((p: any) => ({
          ...p,
          full_name: cleanNameStr(p.full_name),
        }))
      );

      // 3. Cargar Referidos inscritos en la web
      const { data: refData } = await supabase
        .from('referrals')
        .select('*')
        .order('created_at', { ascending: false });

      const safeRefs: Referral[] = (refData || []).map((r) => ({
        ...r,
        referrer_name: r.referrer_name ? cleanNameStr(r.referrer_name) : r.referrer_name,
        referred_name: r.referred_name ? cleanNameStr(r.referred_name) : r.referred_name,
        reward_amount: Number(r.reward_amount) || 15000,
        discount_amount: Number(r.discount_amount) || 15000,
      }));
      setReferrals(safeRefs);

      // 4. Cargar Billeteras
      const { data: walletData } = await supabase
        .from('ambassador_wallets')
        .select('*')
        .order('balance', { ascending: false });

      const safeWallets: AmbassadorWallet[] = (walletData || []).map((w) => ({
        ...w,
        full_name: cleanNameStr(w.full_name),
        total_earned: Number(w.total_earned) || 0,
        total_redeemed: Number(w.total_redeemed) || 0,
        balance: Number(w.balance) || 0,
      }));
      setWallets(safeWallets);

      // 5. Cargar Historial de Bonos Redimidos en Caja
      const { data: redemptionsData } = await supabase
        .from('referral_redemptions')
        .select('*')
        .order('created_at', { ascending: false });

      const safeRedemptions: ReferralRedemption[] = (redemptionsData || []).map((item) => ({
        ...item,
        patient_name: cleanNameStr(item.patient_name),
        bonuses_count: Number(item.bonuses_count) || 1,
        unit_value: Number(item.unit_value) || 15000,
        total_amount: Number(item.total_amount) || 15000,
      }));
      setRedemptions(safeRedemptions);

      // 6. Cargar Usuarios de Caja (si es admin)
      const { data: cashiersData } = await supabase
        .from('referral_cashiers')
        .select('*')
        .order('created_at', { ascending: true });

      if (cashiersData) {
        setCashiers(cashiersData);
      }
    } catch (err) {
      console.error('Error cargando datos de referidos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Subir archivo Excel reporte_datos_pacientes.xlsx (Solo Admin)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadResult(null);
      setSyncBannerMsg('');
      const result = await processReportePacientes(file);
      setUploadResult(result);
      await loadAllData();
    } catch (err: any) {
      alert('Error al procesar archivo de pacientes: ' + err.message);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Borrar TODOS los registros del módulo de Referidos (Solo Admin - Pruebas)
  const handleConfirmDeleteAllReferrals = async () => {
    setIsDeletingAll(true);
    try {
      await deleteAllReferralsData();
      setShowDeleteAllModal(false);
      setUploadResult(null);
      setActiveCajaCedula('');
      setCajaSearchCedula('');
      setSyncBannerMsg(
        '¡Todos los registros del módulo de Referidos y de Bonos Redimidos han sido borrados exitosamente!'
      );
      await loadAllData();
      setTimeout(() => setSyncBannerMsg(''), 6000);
    } catch (err: any) {
      alert('Error al borrar los registros de referidos: ' + err.message);
    } finally {
      setIsDeletingAll(false);
    }
  };

  // ============================================================================
  // ACCIÓN DE CAJA 1: CANJEAR BONO DE 1RA ASISTENCIA (PACIENTE REFERIDO)
  // ÚNICA FORMA EN QUE SE HACE EFECTIVO EL BONO DE BIENVENIDA Y SE ASIGNA
  // LA BONIFICACIÓN A LA PERSONA QUE LO REFIRIÓ
  // ============================================================================
  const handleRedeemFirstVisitBonus = async (ref: Referral) => {
    if (ref.status === 'completed') return;
    setIsRedeemingFirstVisit(true);
    setCajaSuccessMessage('');
    const supabase = createClient();

    try {
      const nowISO = new Date().toISOString();
      const cleanReferrerDoc = cleanDoc(ref.referrer_doc);
      const cleanReferredDoc = cleanDoc(ref.referred_doc);
      const reward = Number(ref.reward_amount) || settings.referrer_reward;
      const discount = Number(ref.discount_amount) || settings.referred_discount;
      const treatmentDesc =
        firstVisitNote.trim() || 'Redimido en Caja en su 1ra Asistencia';

      const referrerPat = patients.find((p) => p.doc_id === cleanReferrerDoc);
      const referrerNameFinal =
        ref.referrer_name || referrerPat?.full_name || `Embajador ${cleanReferrerDoc}`;
      const referredNameFinal = ref.referred_name || `Paciente ${cleanReferredDoc}`;

      // 1. Marcar el bono de 1ra asistencia como completado y habilitar ('available') el bono para quien lo refirió
      const { error: refErr } = await supabase
        .from('referrals')
        .update({
          status: 'completed',
          redeemed_at: nowISO,
          redeemed_by: currentUsername,
          referrer_reward_status: 'available',
          referrer_name: referrerNameFinal,
          referred_name: referredNameFinal,
          reward_amount: reward,
          discount_amount: discount,
          treatment_name: treatmentDesc,
          notes: ref.notes
            ? `${ref.notes} | Canjeado 1ra Asistencia en Caja (${currentUsername}): ${treatmentDesc}`
            : `Canjeado 1ra Asistencia en Caja (${currentUsername}): ${treatmentDesc}`,
        })
        .eq('id', ref.id);

      if (refErr) throw refErr;

      // 2. Registrar al paciente referido en patients_directory SIN alterar el código con el que se inscribió en la web
      const existingReferredInDir = patients.find((p) => p.doc_id === cleanReferredDoc);
      if (!existingReferredInDir) {
        const nameParts = referredNameFinal.trim().split(/\s+/);
        const firstName = nameParts.slice(0, Math.ceil(nameParts.length / 2)).join(' ');
        const lastName = nameParts.slice(Math.ceil(nameParts.length / 2)).join(' ');

        await supabase.from('patients_directory').upsert(
          [
            {
              doc_id: cleanReferredDoc,
              first_name: firstName,
              last_name: lastName,
              full_name: referredNameFinal,
              referral_code: null,
              referred_by_doc: cleanReferrerDoc,
              referred_by_code: referrerPat?.referral_code || null,
              how_found: `REFERIDO EN WEB POR ${referrerNameFinal}`,
              updated_at: nowISO,
            },
          ],
          { onConflict: 'doc_id' }
        );
      }

      // 3. Asignar la bonificación a la billetera de la persona que lo refirió
      const { data: walletData } = await supabase
        .from('ambassador_wallets')
        .select('*')
        .eq('doc_id', cleanReferrerDoc)
        .maybeSingle();

      const prevEarned = Number(walletData?.total_earned) || 0;
      const prevRedeemed = Number(walletData?.total_redeemed) || 0;
      const prevBalance = Number(walletData?.balance) || 0;

      const { error: walletErr } = await supabase.from('ambassador_wallets').upsert(
        [
          {
            doc_id: cleanReferrerDoc,
            full_name: referrerNameFinal,
            phone: referrerPat?.phone || walletData?.phone || null,
            total_earned: prevEarned + reward,
            total_redeemed: prevRedeemed,
            balance: prevBalance + reward,
            updated_at: nowISO,
          },
        ],
        { onConflict: 'doc_id' }
      );

      if (walletErr) throw walletErr;

      // 4. Guardar en el historial de bonos redimidos (referral_redemptions) con fecha y usuario de caja
      const { error: redemptionLogErr } = await supabase
        .from('referral_redemptions')
        .insert([
          {
            patient_doc: cleanReferredDoc,
            patient_name: referredNameFinal,
            redemption_type: 'first_visit_discount',
            bonuses_count: 1,
            unit_value: discount,
            total_amount: discount,
            related_referral_ids: [ref.id],
            cashier_username: currentUsername,
            notes: `Bono 1ra Asistencia (${treatmentDesc}). Bonificación de +$${reward.toLocaleString('es-CO')} asignada al referente ${referrerNameFinal} (CC ${cleanReferrerDoc}).`,
            created_at: nowISO,
          },
        ]);

      if (redemptionLogErr) throw redemptionLogErr;

      setFirstVisitNote('');
      setCajaSuccessMessage(
        `¡Bono de 1ra Asistencia por $${discount.toLocaleString('es-CO')} COP redimido con éxito para ${referredNameFinal}! Simultáneamente se asignó 1 bono de +$${reward.toLocaleString('es-CO')} COP a su referente ${referrerNameFinal}.`
      );
      await loadAllData();
    } catch (err: any) {
      alert('Error al canjear bono de primera asistencia: ' + err.message);
    } finally {
      setIsRedeemingFirstVisit(false);
    }
  };

  // ============================================================================
  // ACCIÓN DE CAJA 2: REDIMIR N BONOS ACUMULADOS DE UN EMBAJADOR
  // LA CAJERA DECIDE CUÁNTOS BONOS VA A REDIMIR HOY Y VE SU VALOR TOTAL
  // ============================================================================
  const handleRedeemAmbassadorBonuses = async (
    ambassadorDoc: string,
    ambassadorName: string,
    availableRefs: Referral[]
  ) => {
    if (availableRefs.length === 0) return;
    const count = Math.min(Math.max(1, bonusesToRedeemCount), availableRefs.length);
    const refsToRedeem = availableRefs.slice(0, count);
    const totalValue = refsToRedeem.reduce(
      (sum, r) => sum + (Number(r.reward_amount) || settings.referrer_reward),
      0
    );
    const unitValue =
      count > 0 ? Math.round(totalValue / count) : settings.referrer_reward;

    setIsRedeemingAmbassadorBonuses(true);
    setCajaSuccessMessage('');
    const supabase = createClient();

    try {
      const nowISO = new Date().toISOString();
      const idsToRedeem = refsToRedeem.map((r) => r.id);
      const referredNames = refsToRedeem
        .map((r) => r.referred_name || `CC ${r.referred_doc}`)
        .join(', ');

      // 1. Marcar exactamente esos N bonos como 'redeemed'
      const { error: updRefErr } = await supabase
        .from('referrals')
        .update({
          referrer_reward_status: 'redeemed',
          referrer_reward_redeemed_at: nowISO,
          referrer_reward_redeemed_by: currentUsername,
        })
        .in('id', idsToRedeem);

      if (updRefErr) throw updRefErr;

      // 2. Actualizar la billetera del embajador
      const allCompletedForAmbassador = referrals.filter(
        (r) => r.referrer_doc === ambassadorDoc && r.status === 'completed'
      );
      const totalEarned = allCompletedForAmbassador.reduce(
        (sum, r) => sum + (Number(r.reward_amount) || settings.referrer_reward),
        0
      );
      const remainingAvailableAfter = availableRefs.slice(count);
      const newBalance = remainingAvailableAfter.reduce(
        (sum, r) => sum + (Number(r.reward_amount) || settings.referrer_reward),
        0
      );
      const newTotalRedeemed = Math.max(0, totalEarned - newBalance);

      const patInfo = patients.find((p) => p.doc_id === ambassadorDoc);

      const { error: walletErr } = await supabase.from('ambassador_wallets').upsert(
        [
          {
            doc_id: ambassadorDoc,
            full_name: ambassadorName,
            phone: patInfo?.phone || null,
            total_earned: totalEarned,
            total_redeemed: newTotalRedeemed,
            balance: newBalance,
            updated_at: nowISO,
          },
        ],
        { onConflict: 'doc_id' }
      );

      if (walletErr) throw walletErr;

      // 3. Registrar la redención en referral_redemptions con fecha, cantidad de bonos, valor total y usuario de caja
      const noteText = ambassadorRedeemNote.trim()
        ? `${ambassadorRedeemNote.trim()} | Bonos originados por: ${referredNames}`
        : `Redención de ${count} bono(s) en Caja. Originados por referir a: ${referredNames}`;

      const { error: redErr } = await supabase.from('referral_redemptions').insert([
        {
          patient_doc: ambassadorDoc,
          patient_name: ambassadorName,
          redemption_type: 'ambassador_reward',
          bonuses_count: count,
          unit_value: unitValue,
          total_amount: totalValue,
          related_referral_ids: idsToRedeem,
          cashier_username: currentUsername,
          notes: noteText,
          created_at: nowISO,
        },
      ]);

      if (redErr) throw redErr;

      setBonusesToRedeemCount(1);
      setAmbassadorRedeemNote('');
      setCajaSuccessMessage(
        `¡Canje exitoso en Caja! Se redimieron ${count} bono(s) por un Valor Total de $${totalValue.toLocaleString('es-CO')} COP para el paciente ${ambassadorName}.`
      );
      await loadAllData();
    } catch (err: any) {
      alert('Error al redimir bonos del embajador: ' + err.message);
    } finally {
      setIsRedeemingAmbassadorBonuses(false);
    }
  };

  // Guardar Configuración de Campaña (Solo Admin)
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== 'admin') return;
    setIsSaving(true);
    const supabase = createClient();

    try {
      const { error } = await supabase.from('referral_settings').upsert([
        {
          id: 1,
          campaign_name: settings.campaign_name,
          referrer_reward: Number(settings.referrer_reward),
          referred_discount: Number(settings.referred_discount),
          min_invoice_amount: Number(settings.min_invoice_amount),
          is_active: settings.is_active,
          updated_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;
      alert('¡Configuración de campaña actualizada exitosamente!');
    } catch (err: any) {
      alert('Error al guardar configuración: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Crear o Actualizar Usuario de Caja (Solo Admin)
  const handleCreateCashier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== 'admin') return;
    const cleanU = newCashierUsername.trim().toLowerCase();
    const cleanP = newCashierPassword.trim();
    const cleanD =
      newCashierDisplayName.trim() || `Caja (${cleanU.toUpperCase()})`;

    if (cleanU.length < 3 || cleanP.length < 4) {
      alert(
        'Ingresa un usuario de al menos 3 caracteres y una contraseña de al menos 4 caracteres.'
      );
      return;
    }

    setIsSavingCashier(true);
    const supabase = createClient();
    try {
      const { error } = await supabase.from('referral_cashiers').upsert(
        [
          {
            username: cleanU,
            password: cleanP,
            display_name: cleanD,
            is_active: true,
          },
        ],
        { onConflict: 'username' }
      );
      if (error) throw error;
      setNewCashierUsername('');
      setNewCashierPassword('');
      setNewCashierDisplayName('');
      await loadAllData();
    } catch (err: any) {
      alert('Error guardando usuario de caja: ' + err.message);
    } finally {
      setIsSavingCashier(false);
    }
  };

  const handleDeleteCashier = async (usernameToDelete: string) => {
    if (userRole !== 'admin') return;
    if (usernameToDelete === 'caja1') {
      alert('El usuario principal de pruebas "caja1" no debe eliminarse.');
      return;
    }
    if (!confirm(`¿Eliminar el usuario de caja "${usernameToDelete}"?`)) return;

    const supabase = createClient();
    try {
      await supabase
        .from('referral_cashiers')
        .delete()
        .eq('username', usernameToDelete);
      await loadAllData();
    } catch (err: any) {
      alert('Error eliminando usuario: ' + err.message);
    }
  };

  // Eliminar un registro de referido individual (Solo Admin)
  const handleDeleteReferral = async (ref: Referral) => {
    if (userRole !== 'admin') return;
    if (
      !confirm(
        `¿Eliminar el registro del referido ${ref.referred_name || ref.referred_doc}?`
      )
    )
      return;
    const supabase = createClient();

    try {
      const { error } = await supabase.from('referrals').delete().eq('id', ref.id);
      if (error) throw error;
      await loadAllData();
    } catch (err: any) {
      alert('Error al eliminar registro: ' + err.message);
    }
  };

  // Copiar invitación de WhatsApp
  const copyInvitationText = (code: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const link = `${origin}/pacientes?code=${code}`;
    const text = `¡Hola! Te comparto mi código de referido *${code}* para que te registres en ${link} y recibas *$${settings.referred_discount.toLocaleString('es-CO')} COP de saldo a favor* en tu primer tratamiento en Holística Unidad Médica Integral.`;
    navigator.clipboard.writeText(text);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 3000);
  };

  // ============================================================================
  // CÁLCULO CONSOLIDADO DE EMBAJADORES Y BONOS
  // ============================================================================
  const patientsMap = new Map<string, PatientDirectoryItem>();
  patients.forEach((p) => patientsMap.set(p.doc_id, p));

  const walletsMap = new Map<string, AmbassadorWallet>();
  wallets.forEach((w) => walletsMap.set(w.doc_id, w));

  const ambassadorDocsSet = new Set<string>();
  patients.forEach((p) => {
    if (p.referral_code) ambassadorDocsSet.add(p.doc_id);
  });
  referrals.forEach((r) => ambassadorDocsSet.add(r.referrer_doc));
  wallets.forEach((w) => ambassadorDocsSet.add(w.doc_id));

  const ambassadorsList: AmbassadorSummary[] = Array.from(ambassadorDocsSet).map(
    (docId) => {
      const pat = patientsMap.get(docId);
      const wal = walletsMap.get(docId);
      const myRefs = referrals.filter((r) => r.referrer_doc === docId);
      const pendingRefs = myRefs.filter((r) => r.status === 'pending');
      const completedRefs = myRefs.filter((r) => r.status === 'completed');

      const availableBonusRefs = completedRefs.filter(
        (r) => getEffectiveReferrerRewardStatus(r) === 'available'
      );
      const redeemedBonusRefs = completedRefs.filter(
        (r) => getEffectiveReferrerRewardStatus(r) === 'redeemed'
      );

      const totalEarned = completedRefs.reduce((sum, r) => sum + r.reward_amount, 0);
      const balance = availableBonusRefs.reduce((sum, r) => sum + r.reward_amount, 0);
      const totalRedeemed = redeemedBonusRefs.reduce(
        (sum, r) => sum + r.reward_amount,
        0
      );

      return {
        doc_id: docId,
        full_name:
          pat?.full_name ||
          wal?.full_name ||
          myRefs[0]?.referrer_name ||
          `Paciente ${docId}`,
        phone: pat?.phone || wal?.phone,
        referral_code: pat?.referral_code || `CC-${docId.slice(-4)}`,
        totalInscritos: myRefs.length,
        totalPendientes: pendingRefs.length,
        totalAsistieron: completedRefs.length,
        bonosDisponiblesCount: availableBonusRefs.length,
        bonosRedimidosCount: redeemedBonusRefs.length,
        totalEarned,
        totalRedeemed,
        balance,
        referredList: myRefs,
      };
    }
  );

  ambassadorsList.sort((a, b) => {
    if (b.bonosDisponiblesCount !== a.bonosDisponiblesCount)
      return b.bonosDisponiblesCount - a.bonosDisponiblesCount;
    if (b.totalInscritos !== a.totalInscritos)
      return b.totalInscritos - a.totalInscritos;
    return b.balance - a.balance;
  });

  // Totales de Métricas Exclusivas de Referidos
  const totalCodigosCreados = ambassadorsList.length;
  const totalReferidosInscritos = referrals.length;
  const totalReferidosPendientes = referrals.filter(
    (r) => r.status === 'pending'
  ).length;
  const totalReferidosAsistieron = referrals.filter(
    (r) => r.status === 'completed'
  ).length;
  const totalBonosDisponiblesEmbajadores = ambassadorsList.reduce(
    (sum, a) => sum + a.bonosDisponiblesCount,
    0
  );
  const totalSaldoDisponibleBilleteras = ambassadorsList.reduce(
    (sum, a) => sum + a.balance,
    0
  );
  const totalBonosRedimidosCount = redemptions.reduce(
    (sum, r) => sum + r.bonuses_count,
    0
  );
  const totalValorRedimidoHistorico = redemptions.reduce(
    (sum, r) => sum + r.total_amount,
    0
  );

  // ============================================================================
  // DATOS DEL PACIENTE BUSCADO EN CAJA POR NÚMERO DE CÉDULA
  // ============================================================================
  const normalizedCajaDoc = cleanDoc(activeCajaCedula);
  const cajaPatientDir = normalizedCajaDoc
    ? patientsMap.get(normalizedCajaDoc)
    : undefined;
  const cajaFirstVisitReferral = normalizedCajaDoc
    ? referrals.find((r) => cleanDoc(r.referred_doc) === normalizedCajaDoc)
    : undefined;
  const cajaAmbassadorRefs = normalizedCajaDoc
    ? referrals.filter((r) => cleanDoc(r.referrer_doc) === normalizedCajaDoc)
    : [];
  const cajaAvailableRewardRefs = cajaAmbassadorRefs.filter(
    (r) => getEffectiveReferrerRewardStatus(r) === 'available'
  );
  const cajaRedeemedRewardRefs = cajaAmbassadorRefs.filter(
    (r) => getEffectiveReferrerRewardStatus(r) === 'redeemed'
  );
  const cajaPendingAttendanceRefs = cajaAmbassadorRefs.filter(
    (r) => r.status === 'pending'
  );
  const cajaPatientRedemptionsHistory = normalizedCajaDoc
    ? redemptions.filter((red) => cleanDoc(red.patient_doc) === normalizedCajaDoc)
    : [];

  const cajaPatientDisplayName =
    cajaPatientDir?.full_name ||
    cajaFirstVisitReferral?.referred_name ||
    cajaAmbassadorRefs[0]?.referrer_name ||
    (normalizedCajaDoc ? `Paciente CC ${normalizedCajaDoc}` : '');

  const safeBonusesToRedeem = Math.min(
    Math.max(1, bonusesToRedeemCount),
    Math.max(1, cajaAvailableRewardRefs.length)
  );
  const selectedRefsPreview = cajaAvailableRewardRefs.slice(0, safeBonusesToRedeem);
  const totalValueToRedeemNow = selectedRefsPreview.reduce(
    (sum, r) => sum + (Number(r.reward_amount) || settings.referrer_reward),
    0
  );

  const handleSearchInCaja = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = cleanDoc(cajaSearchCedula);
    setActiveCajaCedula(cleaned);
    setBonusesToRedeemCount(1);
    setCajaSuccessMessage('');
  };

  const selectPatientForCaja = (docId: string) => {
    const cleaned = cleanDoc(docId);
    setCajaSearchCedula(cleaned);
    setActiveCajaCedula(cleaned);
    setBonusesToRedeemCount(1);
    setCajaSuccessMessage('');
    setActiveTab('caja');
  };

  // ============================================================================
  // FILTRADO PESTAÑA 2: HISTORIAL DE BONOS REDIMIDOS POR DÍA
  // ============================================================================
  const filteredRedemptions = redemptions.filter((item) => {
    if (
      redemptionTypeFilter !== 'all' &&
      item.redemption_type !== redemptionTypeFilter
    ) {
      return false;
    }

    if (redemptionDateFilter) {
      const itemLocalDate = new Date(item.created_at).toLocaleDateString('en-CA'); // YYYY-MM-DD
      if (itemLocalDate !== redemptionDateFilter) {
        return false;
      }
    }

    const q = redemptionSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      item.patient_doc.toLowerCase().includes(q) ||
      item.patient_name.toLowerCase().includes(q) ||
      (item.cashier_username && item.cashier_username.toLowerCase().includes(q)) ||
      (item.notes && item.notes.toLowerCase().includes(q))
    );
  });

  const filteredRedemptionsBonusesCount = filteredRedemptions.reduce(
    (sum, r) => sum + r.bonuses_count,
    0
  );
  const filteredRedemptionsTotalAmount = filteredRedemptions.reduce(
    (sum, r) => sum + r.total_amount,
    0
  );

  // Filtrado Pestaña 3: Embajadores
  const filteredAmbassadors = ambassadorsList.filter((a) => {
    const matchesSearch =
      a.doc_id.includes(ambassadorSearch.trim()) ||
      a.full_name.toLowerCase().includes(ambassadorSearch.toLowerCase()) ||
      a.referral_code.toLowerCase().includes(ambassadorSearch.toLowerCase());

    if (!matchesSearch) return false;
    if (ambassadorFilter === 'with_referrals') return a.totalInscritos > 0;
    if (ambassadorFilter === 'with_balance') return a.bonosDisponiblesCount > 0;
    return true;
  });

  // Filtrado Pestaña 4: Movimiento de Referidos
  const filteredReferrals = referrals.filter((r) => {
    const q = referralSearch.toLowerCase().trim();
    const matchesSearch =
      !q ||
      r.referred_doc.toLowerCase().includes(q) ||
      (r.referred_name && r.referred_name.toLowerCase().includes(q)) ||
      r.referrer_doc.toLowerCase().includes(q) ||
      (r.referrer_name && r.referrer_name.toLowerCase().includes(q));

    if (!matchesSearch) return false;
    if (referralStatusFilter === 'pending') return r.status === 'pending';
    if (referralStatusFilter === 'completed') return r.status === 'completed';
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in text-gray-800">
      {/* INPUT FILE OCULTO (SOLO ADMIN) */}
      {userRole === 'admin' && (
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".xlsx, .xls"
          className="hidden"
        />
      )}

      {/* BANNER SUPERIOR (SOLO ADMIN) */}
      {userRole === 'admin' && (
        <div className="bg-gradient-to-r from-blue-950 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-cyan-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sistema Independiente de Referidos & Canje en Caja</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold font-outfit">
              Gestión de Códigos, Recepción en Caja y Recompensas Redimidas
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Sube el archivo Excel{' '}
              <code className="bg-white/10 px-2 py-0.5 rounded text-cyan-300 font-mono">
                reporte_datos_pacientes.xlsx
              </code>{' '}
              para habilitar a los pacientes antiguos a crear su código en la página web.{' '}
              <strong>
                Los bonos solo se hacen efectivos cuando son canjeados en Caja por número de Cédula.
              </strong>
            </p>
          </div>

          <div className="z-10 flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setShowDeleteAllModal(true)}
              disabled={isDeletingAll || isLoading}
              title="Borrar todos los registros de esta sección de Referidos para realizar pruebas desde cero"
              className="px-4 py-3.5 rounded-2xl bg-red-500/20 hover:bg-red-500/35 border border-red-400/40 text-red-200 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-red-300" />
              <span>Borrar Todo (Pruebas)</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-6 py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-extrabold text-sm shadow-lg shadow-cyan-500/25 hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
            >
              {isUploading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <UploadCloud className="w-5 h-5" />
              )}
              <span>
                {isUploading ? 'Procesando Excel...' : 'Subir Excel de Pacientes'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* NOTIFICACIÓN DE SINCRONIZACIÓN O LIMPIEZA */}
      {syncBannerMsg && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between gap-3 text-blue-900 text-xs sm:text-sm font-bold animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
            <span>{syncBannerMsg}</span>
          </div>
          <button
            onClick={() => setSyncBannerMsg('')}
            className="text-blue-700 hover:text-blue-950"
          >
            ✕
          </button>
        </div>
      )}

      {/* REPORTE DE RESULTADOS DE LA ÚLTIMA CARGA DE EXCEL */}
      {uploadResult && (
        <div className="p-6 bg-emerald-50/90 border border-emerald-200 rounded-3xl shadow-sm space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-bold shadow">
                ✓
              </div>
              <div>
                <h3 className="font-extrabold text-emerald-950 text-base">
                  ¡Base de Datos de Referidos Actualizada!
                </h3>
                <p className="text-xs text-emerald-700">
                  Se habilitaron <strong>{uploadResult.totalProcessed}</strong>{' '}
                  pacientes en el directorio para que puedan generar su código en el Portal Pacientes.
                </p>
              </div>
            </div>
            <button
              onClick={() => setUploadResult(null)}
              className="text-xs font-bold text-emerald-700 hover:underline"
            >
              Cerrar aviso
            </button>
          </div>
        </div>
      )}

      {/* TARJETAS DE MÉTRICAS DEL SISTEMA DE REFERIDOS Y BONOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-[#e6e7ee] rounded-3xl p-5 shadow-[6px_6px_12px_#b8b9be,-6px_-6px_12px_#ffffff] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              INSCRITOS CON CÓDIGO EN WEB
            </p>
            <p className="text-3xl font-black text-gray-800 mt-1">
              {totalReferidosInscritos.toLocaleString('es-CO')}
            </p>
            <p className="text-xs text-amber-600 font-semibold mt-1">
              {totalReferidosPendientes} pendientes de 1ra cita en Caja
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white shadow-[3px_3px_6px_#b8b9be,-3px_-3px_6px_#ffffff] flex items-center justify-center text-indigo-600">
            <UserPlus className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#e6e7ee] rounded-3xl p-5 shadow-[6px_6px_12px_#b8b9be,-6px_-6px_12px_#ffffff] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              1RA ASISTENCIA CANJEADA
            </p>
            <p className="text-3xl font-black text-emerald-600 mt-1">
              {totalReferidosAsistieron.toLocaleString('es-CO')}
            </p>
            <p className="text-xs text-emerald-700 font-semibold mt-1">
              De {totalCodigosCreados} embajadores con código
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white shadow-[3px_3px_6px_#b8b9be,-3px_-3px_6px_#ffffff] flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#e6e7ee] rounded-3xl p-5 shadow-[6px_6px_12px_#b8b9be,-6px_-6px_12px_#ffffff] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              BONOS DISPONIBLES POR REDIMIR
            </p>
            <p className="text-3xl font-black text-amber-600 mt-1">
              {totalBonosDisponiblesEmbajadores}{' '}
              <span className="text-base font-bold">bonos</span>
            </p>
            <p className="text-xs text-amber-700 font-semibold mt-1">
              Valor: ${totalSaldoDisponibleBilleteras.toLocaleString('es-CO')} COP
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white shadow-[3px_3px_6px_#b8b9be,-3px_-3px_6px_#ffffff] flex items-center justify-center text-amber-600">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#e6e7ee] rounded-3xl p-5 shadow-[6px_6px_12px_#b8b9be,-6px_-6px_12px_#ffffff] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              TOTAL BONOS REDIMIDOS EN CAJA
            </p>
            <p className="text-3xl font-black text-purple-600 mt-1">
              {totalBonosRedimidosCount}{' '}
              <span className="text-base font-bold">bonos</span>
            </p>
            <p className="text-xs text-purple-700 font-semibold mt-1">
              Redimido: ${totalValorRedimidoHistorico.toLocaleString('es-CO')} COP
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white shadow-[3px_3px_6px_#b8b9be,-3px_-3px_6px_#ffffff] flex items-center justify-center text-purple-600">
            <Receipt className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* BARRA DE PESTAÑAS */}
      <div className="flex flex-wrap items-center gap-2 bg-[#e6e7ee] p-2 rounded-2xl shadow-[inset_3px_3px_6px_#b8b9be,inset_-3px_-3px_6px_#ffffff]">
        {[
          {
            id: 'caja',
            label: 'Canje en Caja (Buscar por Cédula)',
            icon: Search,
          },
          {
            id: 'redimidos',
            label: `Bonos Redimidos por Día (${redemptions.length})`,
            icon: Calendar,
          },
          {
            id: 'embajadores',
            label: `Códigos & Embajadores (${totalCodigosCreados})`,
            icon: Award,
          },
          {
            id: 'movimiento',
            label: `Movimiento de Referidos (${totalReferidosInscritos})`,
            icon: Users,
          },
          ...(userRole === 'admin'
            ? [
                {
                  id: 'configuracion',
                  label: 'Configurar Campaña & Usuarios Caja',
                  icon: Settings,
                },
              ]
            : []),
        ].map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                active
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          );
        })}

        <button
          onClick={loadAllData}
          disabled={isLoading}
          title="Actualizar y refrescar todos los datos"
          className="ml-auto flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 font-extrabold text-xs sm:text-sm shadow-sm active:scale-95 transition-all cursor-pointer disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 text-blue-600 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Actualizando...' : 'Actualizar Datos'}</span>
        </button>
      </div>

      {/* ========================================================================
          PESTAÑA 1: CANJE EN CAJA (BUSCAR PACIENTE POR NÚMERO DE CÉDULA)
          ======================================================================== */}
      {activeTab === 'caja' && (
        <div className="space-y-6">
          {/* BUSCADOR PRINCIPAL POR NÚMERO DE CÉDULA EN CAJA */}
          <div className="bg-[#e6e7ee] rounded-3xl p-6 sm:p-8 shadow-[6px_6px_14px_#b8b9be,-6px_-6px_14px_#ffffff] space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-300/70 pb-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-[11px] font-extrabold uppercase tracking-wider mb-2">
                  <UserCheck className="w-3.5 h-3.5" /> Atención en Recepción / Caja
                </span>
                <h3 className="text-xl font-extrabold text-gray-800">
                  Buscar Paciente por Número de Cédula
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Ingresa el número de cédula del paciente para comprobar qué bonos tiene disponibles, decidir cuántos bonos va a redimir hoy y calcular su Valor Total.
                </p>
              </div>
              <div className="bg-white/80 rounded-2xl px-4 py-3 border border-gray-200 text-xs text-gray-600 flex items-center gap-2.5 shrink-0">
                <Lock className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  Código de referido bloqueado: <strong>Solo inscripción web</strong>
                </span>
              </div>
            </div>

            <form
              onSubmit={handleSearchInCaja}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
            >
              <div className="relative flex-1">
                <Search className="w-5 h-5 text-blue-600 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={cajaSearchCedula}
                  onChange={(e) => setCajaSearchCedula(e.target.value)}
                  placeholder="Ingresa el Número de Cédula del paciente (Ej. 31973555)..."
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border-2 border-blue-200 focus:border-blue-600 text-base font-mono font-bold text-gray-800 shadow-inner outline-none transition-all"
                />
              </div>
              <button
                type="submit"
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white font-extrabold text-sm shadow-lg cursor-pointer transition-all shrink-0"
              >
                Comprobar Bonos por Cédula
              </button>
              {activeCajaCedula && (
                <button
                  type="button"
                  onClick={() => {
                    setCajaSearchCedula('');
                    setActiveCajaCedula('');
                    setCajaSuccessMessage('');
                  }}
                  className="px-4 py-4 rounded-2xl bg-white text-gray-600 hover:text-gray-900 font-bold text-xs border border-gray-200 cursor-pointer"
                >
                  Limpiar
                </button>
              )}
            </form>

            {/* MENSAJE DE ÉXITO AL REDIMIR EN CAJA */}
            {cajaSuccessMessage && (
              <div className="p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-950 flex items-start justify-between gap-3 animate-fade-in">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold text-sm">
                      ¡Operación de Canje Registrada Exitosamente en Caja!
                    </p>
                    <p className="text-xs text-emerald-800 mt-1">
                      {cajaSuccessMessage}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setCajaSuccessMessage('')}
                  className="text-emerald-700 font-bold text-xs"
                >
                  ✕
                </button>
              </div>
            )}

            {/* RESULTADO DE LA BÚSQUEDA POR CÉDULA */}
            {normalizedCajaDoc && (
              <div className="w-full space-y-4 pt-1 animate-fade-in">
                {/* ENCABEZADO DE FICHA DEL PACIENTE */}
                <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-black text-base shadow shrink-0">
                      {(cajaPatientDisplayName || 'P')[0]}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-black text-gray-900">
                          {cajaPatientDisplayName}
                        </h4>
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono text-xs font-extrabold">
                          CC: {normalizedCajaDoc}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-gray-500">
                        {cajaPatientDir?.referral_code ? (
                          <span className="inline-flex items-center gap-1 font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                            <Lock className="w-3 h-3" /> Código web:{' '}
                            <strong className="font-mono">
                              {cajaPatientDir.referral_code}
                            </strong>
                          </span>
                        ) : (
                          <span>Sin código propio creado</span>
                        )}
                        {cajaFirstVisitReferral && (
                          <span className="inline-flex items-center gap-1 font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                            <Lock className="w-3 h-3" /> Referido por:{' '}
                            <strong>
                              {cajaFirstVisitReferral.referrer_name ||
                                `CC ${cajaFirstVisitReferral.referrer_doc}`}
                            </strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-center shrink-0 self-start sm:self-auto">
                    <span className="text-[10px] font-bold uppercase text-amber-700 block leading-tight">
                      Bonos Disponibles Hoy
                    </span>
                    <span className="text-lg font-black text-amber-600">
                      {(cajaFirstVisitReferral?.status === 'pending' ? 1 : 0) +
                        cajaAvailableRewardRefs.length}{' '}
                      bono(s)
                    </span>
                  </div>
                </div>

                {/* ==============================================================
                    SECCIÓN A Y B COMPACTAS (ALINEADAS ARRIBA SIN ESPACIO VACÍO)
                    ============================================================== */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                  {/* SECCIÓN A: 1. BONO POR PRIMERA ASISTENCIA */}
                  <div
                    className={`bg-white rounded-2xl p-4 border-2 border-indigo-100 shadow-xs space-y-3 ${
                      !cajaFirstVisitReferral && cajaAvailableRewardRefs.length > 0
                        ? 'lg:col-span-5'
                        : 'lg:col-span-6'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-extrabold uppercase">
                        <Gift className="w-3.5 h-3.5" /> 1. Bono 1ra Asistencia (Referido)
                      </span>
                    </div>

                    {!cajaFirstVisitReferral ? (
                      <div className="p-3.5 rounded-xl bg-gray-50 border border-dashed border-gray-200 text-center space-y-0.5">
                        <p className="text-xs font-bold text-gray-600">
                          Sin bono de primera asistencia como referido
                        </p>
                        <p className="text-[11px] text-gray-400">
                          No registra código de invitación en la web.
                        </p>
                      </div>
                    ) : cajaFirstVisitReferral.status === 'pending' ? (
                      <div className="space-y-2.5">
                        <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white flex items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-indigo-100 block">
                              Bono Bienvenida Disponible (1 Bono)
                            </span>
                            <span className="text-2xl font-black">
                              ${cajaFirstVisitReferral.discount_amount.toLocaleString('es-CO')} COP
                            </span>
                            <span className="text-[11px] text-indigo-100 block">
                              Referido por:{' '}
                              <strong>
                                {cajaFirstVisitReferral.referrer_name ||
                                  `CC ${cajaFirstVisitReferral.referrer_doc}`}
                              </strong>
                            </span>
                          </div>
                          <div className="bg-white/20 px-2.5 py-1 rounded-lg text-[11px] font-extrabold shrink-0">
                            Disponible
                          </div>
                        </div>

                        <p className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-snug">
                          Al canjear en Caja, se aplica el descuento de{' '}
                          <strong>
                            ${cajaFirstVisitReferral.discount_amount.toLocaleString('es-CO')}
                          </strong>{' '}
                          y se asigna el bono de{' '}
                          <strong>
                            +${cajaFirstVisitReferral.reward_amount.toLocaleString('es-CO')}
                          </strong>{' '}
                          a <strong>{cajaFirstVisitReferral.referrer_name}</strong>.
                        </p>

                        <input
                          type="text"
                          value={firstVisitNote}
                          onChange={(e) => setFirstVisitNote(e.target.value)}
                          placeholder="Tratamiento / Nota de Caja (Opcional)..."
                          className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-800 focus:bg-white focus:border-indigo-500 outline-none"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            handleRedeemFirstVisitBonus(cajaFirstVisitReferral)
                          }
                          disabled={isRedeemingFirstVisit}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 text-white font-extrabold text-xs shadow cursor-pointer transition-all disabled:opacity-50"
                        >
                          {isRedeemingFirstVisit
                            ? 'Procesando Canje...'
                            : `Canjear Bono 1ra Asistencia ($${cajaFirstVisitReferral.discount_amount.toLocaleString('es-CO')})`}
                        </button>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Bono 1ra Asistencia Redimido
                          </span>
                          <span className="font-black text-emerald-700 text-sm">
                            ${cajaFirstVisitReferral.discount_amount.toLocaleString('es-CO')} COP
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-700">
                          Referido por: <strong>{cajaFirstVisitReferral.referrer_name}</strong> ·{' '}
                          {cajaFirstVisitReferral.redeemed_at
                            ? new Date(cajaFirstVisitReferral.redeemed_at).toLocaleDateString('es-CO')
                            : new Date(cajaFirstVisitReferral.created_at).toLocaleDateString('es-CO')}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* SECCIÓN B: 2. BONOS POR REFERIR PACIENTES (EMBAJADOR) */}
                  <div
                    className={`bg-white rounded-2xl p-4 border-2 border-amber-200 shadow-xs space-y-3 ${
                      !cajaFirstVisitReferral && cajaAvailableRewardRefs.length > 0
                        ? 'lg:col-span-7'
                        : 'lg:col-span-6'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-[11px] font-extrabold uppercase">
                        <Award className="w-3.5 h-3.5" /> 2. Bonos por Referir (Embajador)
                      </span>
                      <span className="text-[11px] font-bold text-gray-500">
                        Inscritos: {cajaAmbassadorRefs.length}
                      </span>
                    </div>

                    {/* RESUMEN COMPACTO DE BONOS DEL EMBAJADOR */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="py-2 px-2 rounded-xl bg-amber-50 border border-amber-200">
                        <span className="text-lg font-black text-amber-600 block leading-none">
                          {cajaAvailableRewardRefs.length}
                        </span>
                        <span className="text-[10px] font-extrabold text-amber-800">
                          Disponibles
                        </span>
                      </div>
                      <div className="py-2 px-2 rounded-xl bg-purple-50 border border-purple-200">
                        <span className="text-lg font-black text-purple-600 block leading-none">
                          {cajaRedeemedRewardRefs.length}
                        </span>
                        <span className="text-[10px] font-extrabold text-purple-800">
                          Ya Redimidos
                        </span>
                      </div>
                      <div className="py-2 px-2 rounded-xl bg-gray-50 border border-gray-200">
                        <span className="text-lg font-black text-gray-600 block leading-none">
                          {cajaPendingAttendanceRefs.length}
                        </span>
                        <span className="text-[10px] font-extrabold text-gray-500">
                          Pendientes
                        </span>
                      </div>
                    </div>

                    {cajaAvailableRewardRefs.length === 0 ? (
                      <div className="p-3.5 rounded-xl bg-gray-50 border border-dashed border-gray-200 text-center space-y-0.5">
                        <p className="text-xs font-bold text-gray-600">
                          Sin bonos de embajador disponibles hoy
                        </p>
                        <p className="text-[11px] text-gray-400">
                          {cajaPendingAttendanceRefs.length > 0
                            ? `Tiene ${cajaPendingAttendanceRefs.length} inscrito(s) pendientes de canjear su 1ra cita.`
                            : 'Se activan cuando un referido suyo canjee su 1ra cita en Caja.'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {/* SELECTOR COMPACTO DE CANTIDAD Y VALOR TOTAL */}
                        <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white space-y-2.5 shadow-xs">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <span className="text-[10px] uppercase font-extrabold text-amber-100 block">
                                ¿Cuántos bonos desea redimir hoy?
                              </span>
                              <span className="text-[11px] text-amber-50">
                                Disponibles: <strong>{cajaAvailableRewardRefs.length}</strong> ($
                                {settings.referrer_reward.toLocaleString('es-CO')} c/u)
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 bg-white/15 p-1 rounded-xl border border-white/25 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  setBonusesToRedeemCount((prev) =>
                                    Math.max(1, prev - 1)
                                  )
                                }
                                className="w-7 h-7 rounded-lg bg-white text-orange-700 font-black flex items-center justify-center hover:bg-amber-50 cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="px-2.5 font-mono text-lg font-black">
                                {safeBonusesToRedeem}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setBonusesToRedeemCount((prev) =>
                                    Math.min(
                                      cajaAvailableRewardRefs.length,
                                      prev + 1
                                    )
                                  )
                                }
                                className="w-7 h-7 rounded-lg bg-white text-orange-700 font-black flex items-center justify-center hover:bg-amber-50 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {cajaAvailableRewardRefs.length > 1 && (
                            <div className="flex flex-wrap items-center gap-1">
                              {Array.from(
                                { length: cajaAvailableRewardRefs.length },
                                (_, idx) => idx + 1
                              ).map((num) => (
                                <button
                                  key={num}
                                  type="button"
                                  onClick={() => setBonusesToRedeemCount(num)}
                                  className={`px-2.5 py-0.5 rounded-md text-[11px] font-extrabold transition-all cursor-pointer ${
                                    safeBonusesToRedeem === num
                                      ? 'bg-white text-orange-700 shadow-xs'
                                      : 'bg-white/20 text-white hover:bg-white/30'
                                  }`}
                                >
                                  {num === cajaAvailableRewardRefs.length
                                    ? `Todos (${num})`
                                    : `${num} Bono${num > 1 ? 's' : ''}`}
                                </button>
                              ))}
                            </div>
                          )}

                          <div className="pt-2 border-t border-white/25 flex items-center justify-between">
                            <div>
                              <span className="text-[11px] font-bold text-amber-100 block">
                                VALOR TOTAL A REDIMIR ({safeBonusesToRedeem}):
                              </span>
                              <span className="text-[10px] text-amber-100">
                                Quedan {cajaAvailableRewardRefs.length - safeBonusesToRedeem} disponible(s)
                              </span>
                            </div>
                            <span className="text-2xl font-black tracking-tight">
                              ${totalValueToRedeemNow.toLocaleString('es-CO')} COP
                            </span>
                          </div>
                        </div>

                        {/* DETALLE COMPACTO DE BONOS SELECCIONADOS */}
                        <div className="px-3 py-2 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-1">
                          <p className="text-[10px] font-extrabold uppercase text-amber-800">
                            Bonos seleccionados hoy:
                          </p>
                          <ul className="text-[11px] text-gray-700 space-y-0.5">
                            {selectedRefsPreview.map((r, i) => (
                              <li
                                key={r.id}
                                className="flex items-center justify-between"
                              >
                                <span className="truncate pr-2">
                                  #{i + 1}: Por <strong>{r.referred_name}</strong> (CC {r.referred_doc})
                                </span>
                                <span className="font-mono font-bold text-emerald-700 shrink-0">
                                  +${r.reward_amount.toLocaleString('es-CO')}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <input
                          type="text"
                          value={ambassadorRedeemNote}
                          onChange={(e) => setAmbassadorRedeemNote(e.target.value)}
                          placeholder="Tratamiento / Nota de Caja (Opcional)..."
                          className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-800 focus:bg-white focus:border-amber-500 outline-none"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            handleRedeemAmbassadorBonuses(
                              normalizedCajaDoc,
                              cajaPatientDisplayName,
                              cajaAvailableRewardRefs
                            )
                          }
                          disabled={isRedeemingAmbassadorBonuses}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-95 text-white font-extrabold text-xs shadow cursor-pointer transition-all disabled:opacity-50"
                        >
                          {isRedeemingAmbassadorBonuses
                            ? 'Registrando Redención...'
                            : `Confirmar y Redimir ${safeBonusesToRedeem} Bono(s) por $${totalValueToRedeemNow.toLocaleString('es-CO')} COP`}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* HISTORIAL DE REDENCIONES DE ESTE PACIENTE */}
                {cajaPatientRedemptionsHistory.length > 0 && (
                  <div className="bg-white rounded-3xl p-5 border border-gray-200 space-y-3">
                    <h5 className="text-sm font-extrabold text-gray-800 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-purple-600" />
                      <span>
                        Bonos Redimidos Anteriormente por este Paciente ({cajaPatientRedemptionsHistory.length})
                      </span>
                    </h5>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-gray-600">
                        <thead className="bg-gray-50 text-[11px] uppercase font-bold text-gray-500">
                          <tr>
                            <th className="px-3 py-2.5">Fecha y Hora</th>
                            <th className="px-3 py-2.5">Tipo de Bono</th>
                            <th className="px-3 py-2.5 text-center">Cant. Bonos</th>
                            <th className="px-3 py-2.5 text-right">Valor Total</th>
                            <th className="px-3 py-2.5">Caja / Usuario</th>
                            <th className="px-3 py-2.5">Detalle</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {cajaPatientRedemptionsHistory.map((h) => (
                            <tr key={h.id}>
                              <td className="px-3 py-2.5 font-mono">
                                {new Date(h.created_at).toLocaleString('es-CO')}
                              </td>
                              <td className="px-3 py-2.5 font-bold">
                                {h.redemption_type === 'first_visit_discount'
                                  ? 'Bono 1ra Asistencia (Referido)'
                                  : 'Bonos por Referir (Embajador)'}
                              </td>
                              <td className="px-3 py-2.5 text-center font-black text-purple-700">
                                {h.bonuses_count}
                              </td>
                              <td className="px-3 py-2.5 text-right font-black text-emerald-700">
                                ${h.total_amount.toLocaleString('es-CO')} COP
                              </td>
                              <td className="px-3 py-2.5 font-mono text-blue-700 font-bold">
                                {h.cashier_username}
                              </td>
                              <td className="px-3 py-2.5 text-gray-500">
                                {h.notes}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* LISTA RÁPIDA DE PACIENTES CON BONOS ACTIVOS LISTOS PARA REDIMIR EN CAJA */}
          <div className="bg-[#e6e7ee] rounded-3xl p-6 shadow-[6px_6px_14px_#b8b9be,-6px_-6px_14px_#ffffff] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-base font-extrabold text-gray-800 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>
                    Acceso Rápido: Pacientes con Bonos Pendientes o Disponibles en Caja
                  </span>
                </h4>
                <p className="text-xs text-gray-500">
                  Haz clic en <strong>&quot;Cargar en Caja&quot;</strong> sobre cualquier paciente para ver sus bonos y redimirlos.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl bg-white border border-gray-200 shadow-xs">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-gray-50 text-gray-500 uppercase font-extrabold border-b border-gray-200 text-[11px]">
                  <tr>
                    <th className="px-4 py-3.5">Paciente</th>
                    <th className="px-4 py-3.5">Número de Cédula</th>
                    <th className="px-4 py-3.5 text-center">Bono 1ra Asistencia</th>
                    <th className="px-4 py-3.5 text-center">
                      Bonos Embajador Disponibles
                    </th>
                    <th className="px-4 py-3.5 text-right">Valor Disponible</th>
                    <th className="px-4 py-3.5 text-right">Acción en Caja</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(() => {
                    // Unir cédulas que tienen bono 1ra vez pendiente o bonos de embajador disponibles
                    const readyDocs = new Set<string>();
                    referrals.forEach((r) => {
                      if (r.status === 'pending') readyDocs.add(cleanDoc(r.referred_doc));
                      if (getEffectiveReferrerRewardStatus(r) === 'available') {
                        readyDocs.add(cleanDoc(r.referrer_doc));
                      }
                    });

                    const rows = Array.from(readyDocs).map((docId) => {
                      const pat = patientsMap.get(docId);
                      const firstVisit = referrals.find(
                        (r) =>
                          cleanDoc(r.referred_doc) === docId &&
                          r.status === 'pending'
                      );
                      const availAmbassador = referrals.filter(
                        (r) =>
                          cleanDoc(r.referrer_doc) === docId &&
                          getEffectiveReferrerRewardStatus(r) === 'available'
                      );
                      const name =
                        pat?.full_name ||
                        firstVisit?.referred_name ||
                        availAmbassador[0]?.referrer_name ||
                        `Paciente ${docId}`;
                      const totalAvailableVal =
                        (firstVisit ? firstVisit.discount_amount : 0) +
                        availAmbassador.reduce((s, r) => s + r.reward_amount, 0);

                      return {
                        docId,
                        name,
                        hasFirstVisit: !!firstVisit,
                        firstVisitAmount: firstVisit?.discount_amount || 0,
                        ambassadorBonusesCount: availAmbassador.length,
                        totalAvailableVal,
                      };
                    });

                    if (rows.length === 0) {
                      return (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-6 py-8 text-center text-gray-400 italic"
                          >
                            Actualmente no hay pacientes con bonos pendientes por redimir en Caja.
                          </td>
                        </tr>
                      );
                    }

                    return rows.map((row) => (
                      <tr
                        key={row.docId}
                        className="hover:bg-blue-50/40 transition-colors"
                      >
                        <td className="px-4 py-3.5 font-extrabold text-gray-800">
                          {row.name}
                        </td>
                        <td className="px-4 py-3.5 font-mono font-bold text-gray-700">
                          {row.docId}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {row.hasFirstVisit ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-extrabold">
                              1 Bono (${row.firstVisitAmount.toLocaleString('es-CO')})
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {row.ambassadorBonusesCount > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-extrabold">
                              {row.ambassadorBonusesCount} Bono(s)
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right font-black text-emerald-700 text-sm">
                          ${row.totalAvailableVal.toLocaleString('es-CO')} COP
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => selectPatientForCaja(row.docId)}
                            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-xs cursor-pointer transition-all"
                          >
                            Cargar en Caja
                          </button>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================
          PESTAÑA 2: HISTORIAL DE RECOMPENSAS Y BONOS REDIMIDOS (POR DÍA)
          ======================================================================== */}
      {activeTab === 'redimidos' && (
        <div className="bg-[#e6e7ee] rounded-3xl p-6 shadow-[6px_6px_14px_#b8b9be,-6px_-6px_14px_#ffffff] space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-extrabold text-gray-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                <span>
                  Registro de Recompensas y Bonos Redimidos por Día ({filteredRedemptions.length})
                </span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Consulta exactamente qué día se hicieron las redenciones, qué bonos fueron redimidos, cuántos bonos, su valor total y qué usuario de caja los registró.
              </p>
            </div>

            {/* FILTROS DE FECHA, TIPO Y BÚSQUEDA */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 bg-white px-3 py-2 rounded-xl shadow-inner border border-gray-200">
                <Calendar className="w-4 h-4 text-purple-600" />
                <input
                  type="date"
                  value={redemptionDateFilter}
                  onChange={(e) => setRedemptionDateFilter(e.target.value)}
                  className="text-xs font-bold text-gray-700 outline-none bg-transparent"
                />
                {redemptionDateFilter && (
                  <button
                    type="button"
                    onClick={() => setRedemptionDateFilter('')}
                    className="text-xs text-red-500 font-bold ml-1 cursor-pointer"
                    title="Ver todas las fechas"
                  >
                    ✕
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() =>
                  setRedemptionDateFilter(
                    new Date().toLocaleDateString('en-CA')
                  )
                }
                className="px-3 py-2 rounded-xl bg-white text-purple-700 hover:bg-purple-50 border border-purple-200 text-xs font-extrabold cursor-pointer"
              >
                Ver Hoy
              </button>

              <select
                value={redemptionTypeFilter}
                onChange={(e) => setRedemptionTypeFilter(e.target.value as any)}
                className="px-3 py-2.5 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-700 outline-none"
              >
                <option value="all">Todos los Tipos de Bono</option>
                <option value="first_visit_discount">
                  Bono 1ra Asistencia (Referido)
                </option>
                <option value="ambassador_reward">
                  Bonos Acumulados (Embajador)
                </option>
              </select>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={redemptionSearch}
                  onChange={(e) => setRedemptionSearch(e.target.value)}
                  placeholder="Buscar cédula, paciente o caja..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white text-xs text-gray-700 shadow-inner outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* RESUMEN DEL DÍA / FILTRO SELECCIONADO */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-gray-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase text-gray-400 block">
                  {redemptionDateFilter
                    ? `Canjes del Día (${redemptionDateFilter})`
                    : 'Total Operaciones de Canje'}
                </span>
                <span className="text-2xl font-black text-gray-800">
                  {filteredRedemptions.length}
                </span>
              </div>
              <Receipt className="w-6 h-6 text-blue-500" />
            </div>

            <div className="bg-white rounded-2xl p-4 border border-gray-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase text-gray-400 block">
                  Cantidad de Bonos Redimidos
                </span>
                <span className="text-2xl font-black text-purple-600">
                  {filteredRedemptionsBonusesCount} bono(s)
                </span>
              </div>
              <Gift className="w-6 h-6 text-purple-500" />
            </div>

            <div className="bg-white rounded-2xl p-4 border border-gray-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase text-gray-400 block">
                  Valor Total Redimido
                </span>
                <span className="text-2xl font-black text-emerald-600">
                  ${filteredRedemptionsTotalAmount.toLocaleString('es-CO')} COP
                </span>
              </div>
              <Wallet className="w-6 h-6 text-emerald-500" />
            </div>
          </div>

          {/* TABLA DE BONOS REDIMIDOS */}
          <div className="overflow-x-auto rounded-2xl bg-white shadow-inner border border-gray-200">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50 text-gray-500 uppercase font-extrabold border-b border-gray-200 text-[11px]">
                <tr>
                  <th className="px-4 py-3.5">Día y Hora del Canje</th>
                  <th className="px-4 py-3.5">Paciente que Redimió</th>
                  <th className="px-4 py-3.5">Qué Bono Fue Redimido</th>
                  <th className="px-4 py-3.5 text-center">Cant. Bonos</th>
                  <th className="px-4 py-3.5 text-right">Valor Total</th>
                  <th className="px-4 py-3.5 text-center">Usuario Caja</th>
                  <th className="px-4 py-3.5">Detalle / Observaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRedemptions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-10 text-center text-gray-400 italic"
                    >
                      No se encontraron registros de bonos redimidos para los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredRedemptions.map((red) => (
                    <tr
                      key={red.id}
                      className="hover:bg-purple-50/30 transition-colors"
                    >
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <p className="font-extrabold text-gray-800">
                          {new Date(red.created_at).toLocaleDateString('es-CO', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                        <p className="text-[11px] font-mono text-gray-400">
                          {new Date(red.created_at).toLocaleTimeString('es-CO', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-gray-800">
                          {red.patient_name}
                        </p>
                        <p className="text-[11px] font-mono text-gray-500">
                          CC: {red.patient_doc}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        {red.redemption_type === 'first_visit_discount' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-extrabold">
                            <Gift className="w-3.5 h-3.5" /> Bono 1ra Asistencia (Referido)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-extrabold">
                            <Award className="w-3.5 h-3.5" /> Recompensa por Referir (Embajador)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="px-3 py-1 rounded-lg bg-purple-50 text-purple-700 font-black text-sm">
                          {red.bonuses_count}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-black text-emerald-700 text-sm whitespace-nowrap">
                        ${red.total_amount.toLocaleString('es-CO')} COP
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono font-bold text-xs">
                          {red.cashier_username || 'caja1'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 max-w-md">
                        {red.notes || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================
          PESTAÑA 3: CÓDIGOS CREADOS & EMBAJADORES
          ======================================================================== */}
      {activeTab === 'embajadores' && (
        <div className="bg-[#e6e7ee] rounded-3xl p-6 shadow-[6px_6px_14px_#b8b9be,-6px_-6px_14px_#ffffff] space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-extrabold text-gray-800 flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-600" />
                <span>
                  Códigos de Referido Creados & Seguimiento de Embajadores (
                  {filteredAmbassadors.length})
                </span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Pacientes que han creado su código en la página web, cuántos referidos se han inscrito, cuántos ya asistieron y cuántos bonos tienen disponibles.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'all', label: 'Todos los Códigos' },
                { id: 'with_referrals', label: 'Con Referidos Inscritos' },
                { id: 'with_balance', label: 'Con Bonos Disponibles' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setAmbassadorFilter(f.id as any)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    ambassadorFilter === f.id
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={ambassadorSearch}
                  onChange={(e) => setAmbassadorSearch(e.target.value)}
                  placeholder="Buscar embajador, cédula o código..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white text-xs text-gray-700 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl bg-white shadow-inner border border-gray-200">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50 text-gray-500 uppercase font-extrabold border-b border-gray-200 text-[11px]">
                <tr>
                  <th className="px-4 py-3.5">Paciente Embajador</th>
                  <th className="px-4 py-3.5">Cédula</th>
                  <th className="px-4 py-3.5">Código Web (Inmutable)</th>
                  <th className="px-4 py-3.5 text-center">Inscritos</th>
                  <th className="px-4 py-3.5 text-center">Sí Asistieron</th>
                  <th className="px-4 py-3.5 text-center">Bonos Disponibles</th>
                  <th className="px-4 py-3.5 text-right">Saldo Disponible</th>
                  <th className="px-4 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAmbassadors.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-10 text-center text-gray-400 italic"
                    >
                      Aún no hay códigos de referido creados que coincidan con el filtro.
                    </td>
                  </tr>
                ) : (
                  filteredAmbassadors.map((amb) => (
                    <tr
                      key={amb.doc_id}
                      className="hover:bg-blue-50/40 transition-colors"
                    >
                      <td className="px-4 py-3.5 font-bold text-gray-800">
                        {amb.full_name}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-gray-600">
                        {amb.doc_id}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-mono font-extrabold text-xs border border-blue-200">
                          <Lock className="w-3 h-3" /> {amb.referral_code}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="font-extrabold text-sm text-gray-800">
                          {amb.totalInscritos}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-extrabold">
                          {amb.totalAsistieron}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full font-extrabold ${
                            amb.bonosDisponiblesCount > 0
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {amb.bonosDisponiblesCount} bono(s)
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-black text-sm text-amber-600">
                        ${amb.balance.toLocaleString('es-CO')} COP
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedAmbassadorDetail(amb)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver Referidos</span>
                          </button>

                          {amb.bonosDisponiblesCount > 0 && (
                            <button
                              onClick={() => selectPatientForCaja(amb.doc_id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
                            >
                              <Wallet className="w-3.5 h-3.5" />
                              <span>Redimir en Caja</span>
                            </button>
                          )}

                          <button
                            onClick={() =>
                              copyInvitationText(amb.referral_code)
                            }
                            title="Copiar enlace de invitación"
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition-colors cursor-pointer"
                          >
                            {copiedCode === amb.referral_code ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Share2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================
          PESTAÑA 4: MOVIMIENTO DE REFERIDOS (INSCRITOS EN WEB VS ASISTIERON)
          ======================================================================== */}
      {activeTab === 'movimiento' && (
        <div className="bg-[#e6e7ee] rounded-3xl p-6 shadow-[6px_6px_14px_#b8b9be,-6px_-6px_14px_#ffffff] space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-extrabold text-gray-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <span>
                  Movimiento General de Referidos ({filteredReferrals.length})
                </span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Todos los pacientes que se han inscrito con código desde la página web, su estado de 1ra asistencia y el estado del bono del referente.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'all', label: `Todos (${referrals.length})` },
                {
                  id: 'pending',
                  label: `Pendientes 1ra Cita (${totalReferidosPendientes})`,
                },
                {
                  id: 'completed',
                  label: `Sí Asistieron (${totalReferidosAsistieron})`,
                },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setReferralStatusFilter(st.id as any)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    referralStatusFilter === st.id
                      ? 'bg-indigo-600 text-white shadow'
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {st.label}
                </button>
              ))}

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={referralSearch}
                  onChange={(e) => setReferralSearch(e.target.value)}
                  placeholder="Buscar referido o embajador..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white text-xs text-gray-700 shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl bg-white shadow-inner border border-gray-200">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50 text-gray-500 uppercase font-extrabold border-b border-gray-200 text-[11px]">
                <tr>
                  <th className="px-4 py-3.5">Fecha Inscripción Web</th>
                  <th className="px-4 py-3.5">Quién Refirió (Embajador)</th>
                  <th className="px-4 py-3.5">Paciente Referido (Invitado)</th>
                  <th className="px-4 py-3.5 text-center">
                    Estado Bono 1ra Asistencia
                  </th>
                  <th className="px-4 py-3.5 text-center">
                    Estado Bono del Embajador
                  </th>
                  <th className="px-4 py-3.5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredReferrals.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-10 text-center text-gray-400 italic"
                    >
                      No hay registros de referidos para mostrar.
                    </td>
                  </tr>
                ) : (
                  filteredReferrals.map((r) => {
                    const referrerPat = patientsMap.get(r.referrer_doc);
                    const effRewardStatus = getEffectiveReferrerRewardStatus(r);
                    return (
                      <tr
                        key={r.id}
                        className="hover:bg-gray-50/80 transition-colors"
                      >
                        <td className="px-4 py-3.5 text-gray-500 whitespace-nowrap">
                          {new Date(r.created_at).toLocaleDateString('es-CO')}
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-gray-800">
                            {r.referrer_name ||
                              referrerPat?.full_name ||
                              `CC ${r.referrer_doc}`}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] font-mono text-gray-400">
                              CC: {r.referrer_doc}
                            </span>
                            {referrerPat?.referral_code && (
                              <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-mono text-[10px] font-bold">
                                Cód: {referrerPat.referral_code}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-blue-700">
                            {r.referred_name || `CC ${r.referred_doc}`}
                          </p>
                          <p className="text-[11px] font-mono text-gray-400">
                            CC: {r.referred_doc}
                          </p>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {r.status === 'completed' ? (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold text-[11px]">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Canjeado en Caja
                              </span>
                              {r.redeemed_at && (
                                <span className="block text-[10px] text-gray-400 mt-0.5">
                                  {new Date(r.redeemed_at).toLocaleDateString(
                                    'es-CO'
                                  )}{' '}
                                  ({r.redeemed_by || 'caja'})
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-extrabold text-[11px]">
                              <Clock className="w-3.5 h-3.5" /> Pendiente 1ra Cita ($
                              {r.discount_amount.toLocaleString('es-CO')})
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {effRewardStatus === 'redeemed' ? (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-extrabold text-[11px]">
                                <Check className="w-3.5 h-3.5" /> Bono Ya Redimido
                              </span>
                              {r.referrer_reward_redeemed_at && (
                                <span className="block text-[10px] text-gray-400 mt-0.5">
                                  {new Date(
                                    r.referrer_reward_redeemed_at
                                  ).toLocaleDateString('es-CO')}
                                </span>
                              )}
                            </div>
                          ) : effRewardStatus === 'available' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold text-[11px]">
                              Disponible (+$
                              {r.reward_amount.toLocaleString('es-CO')})
                            </span>
                          ) : (
                            <span className="text-[11px] text-gray-400 font-semibold">
                              Se activa al canjear 1ra cita
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="inline-flex items-center gap-2">
                            {r.status === 'pending' && (
                              <button
                                onClick={() =>
                                  selectPatientForCaja(r.referred_doc)
                                }
                                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[11px] shadow-xs transition-all cursor-pointer"
                              >
                                Atender en Caja
                              </button>
                            )}
                            {userRole === 'admin' && (
                              <button
                                onClick={() => handleDeleteReferral(r)}
                                title="Eliminar registro (Solo Admin)"
                                className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================
          PESTAÑA 5: CONFIGURACIÓN DE CAMPAÑA Y USUARIOS DE CAJA (SOLO ADMIN)
          ======================================================================== */}
      {activeTab === 'configuracion' && userRole === 'admin' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* BLOQUE 1: PARÁMETROS DE RECOMPENSAS */}
          <div className="bg-[#e6e7ee] rounded-3xl p-6 sm:p-8 shadow-[6px_6px_14px_#b8b9be,-6px_-6px_14px_#ffffff]">
            <h3 className="text-xl font-extrabold text-gray-800 mb-2 flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              <span>Configuración de Valores de Bonos</span>
            </h3>
            <p className="text-xs text-gray-500 mb-6">
              Define el valor de cada bono para quien refiere y el saldo a favor de primera asistencia.
            </p>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">
                  Nombre de la Campaña Activa
                </label>
                <input
                  type="text"
                  value={settings.campaign_name}
                  onChange={(e) =>
                    setSettings({ ...settings, campaign_name: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl bg-white text-sm text-gray-800 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">
                    Valor Bono para Quien Refiere (COP)
                  </label>
                  <input
                    type="number"
                    value={settings.referrer_reward}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        referrer_reward: Number(e.target.value),
                      })
                    }
                    className="w-full px-4 py-3 rounded-xl bg-white text-sm font-bold text-emerald-700 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">
                    Valor Bono 1ra Asistencia Referido (COP)
                  </label>
                  <input
                    type="number"
                    value={settings.referred_discount}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        referred_discount: Number(e.target.value),
                      })
                    }
                    className="w-full px-4 py-3 rounded-xl bg-white text-sm font-bold text-blue-700 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold text-sm shadow-lg hover:opacity-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? 'Guardando...' : 'Guardar Valores de Bonos'}
              </button>
            </form>
          </div>

          {/* BLOQUE 2: GESTIÓN DE USUARIOS DE CAJA (RECEPCIÓN) */}
          <div className="bg-[#e6e7ee] rounded-3xl p-6 sm:p-8 shadow-[6px_6px_14px_#b8b9be,-6px_-6px_14px_#ffffff] space-y-5">
            <div>
              <h3 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-600" />
                <span>Usuarios de Caja (Acceso Exclusivo a Referidos)</span>
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Estos usuarios ingresan por la pestaña <strong>Acceso Administrativo</strong>, solo ven el módulo de Referidos y no pueden modificar códigos asignados en la web.
              </p>
            </div>

            <form
              onSubmit={handleCreateCashier}
              className="bg-white p-4 rounded-2xl border border-gray-200 space-y-3"
            >
              <p className="text-xs font-extrabold text-gray-700 uppercase">
                Crear o Actualizar Cajera / Usuario de Recepción
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  value={newCashierUsername}
                  onChange={(e) => setNewCashierUsername(e.target.value)}
                  placeholder="Usuario (ej. caja2)"
                  className="px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-mono font-bold text-gray-800 outline-none"
                  required
                />
                <input
                  type="text"
                  value={newCashierPassword}
                  onChange={(e) => setNewCashierPassword(e.target.value)}
                  placeholder="Contraseña (ej. caja123)"
                  className="px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-mono text-gray-800 outline-none"
                  required
                />
                <input
                  type="text"
                  value={newCashierDisplayName}
                  onChange={(e) => setNewCashierDisplayName(e.target.value)}
                  placeholder="Nombre (ej. Caja 2 Recepción)"
                  className="px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-800 outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={isSavingCashier}
                className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs cursor-pointer transition-all"
              >
                {isSavingCashier
                  ? 'Guardando usuario...'
                  : 'Guardar Usuario de Caja'}
              </button>
            </form>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <table className="w-full text-left text-xs text-gray-600">
                <thead className="bg-gray-50 text-[11px] uppercase font-extrabold text-gray-500 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3">Usuario</th>
                    <th className="px-4 py-3">Contraseña</th>
                    <th className="px-4 py-3">Nombre en Caja</th>
                    <th className="px-4 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cashiers.map((c) => (
                    <tr key={c.username}>
                      <td className="px-4 py-3 font-mono font-extrabold text-blue-700">
                        {c.username}
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-700">
                        {c.password}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-800">
                        {c.display_name}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {c.username !== 'caja1' ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteCashier(c.username)}
                            className="text-red-500 hover:text-red-700 font-bold text-xs cursor-pointer"
                          >
                            Eliminar
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            Activo (Pruebas)
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================
          MODAL: VER DETALLE DE PERSONAS REFERIDAS POR UN EMBAJADOR
          ======================================================================== */}
      {selectedAmbassadorDetail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600">
                  Detalle de Embajador · Código {selectedAmbassadorDetail.referral_code}
                </span>
                <h3 className="text-xl font-extrabold text-gray-900 mt-0.5">
                  {selectedAmbassadorDetail.full_name}
                </h3>
                <p className="text-xs text-gray-500 font-mono">
                  Cédula: {selectedAmbassadorDetail.doc_id}
                </p>
              </div>
              <button
                onClick={() => setSelectedAmbassadorDetail(null)}
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200">
                <span className="text-2xl font-black text-gray-800 block">
                  {selectedAmbassadorDetail.totalInscritos}
                </span>
                <span className="text-[11px] font-bold text-gray-500">
                  Inscritos con su código
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                <span className="text-2xl font-black text-emerald-600 block">
                  {selectedAmbassadorDetail.totalAsistieron}
                </span>
                <span className="text-[11px] font-bold text-emerald-700">
                  Sí Asistieron
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
                <span className="text-xl font-black text-amber-600 block">
                  {selectedAmbassadorDetail.bonosDisponiblesCount} bono(s)
                </span>
                <span className="text-[11px] font-bold text-amber-700">
                  Disponibles (${selectedAmbassadorDetail.balance.toLocaleString('es-CO')})
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-extrabold uppercase text-gray-500">
                Listado de Personas que ha Referido ({selectedAmbassadorDetail.referredList.length})
              </h4>

              {selectedAmbassadorDetail.referredList.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-6 text-center bg-gray-50 rounded-2xl">
                  Este paciente ya creó su código, pero aún nadie se ha inscrito con él.
                </p>
              ) : (
                <div className="border border-gray-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs text-gray-600">
                    <thead className="bg-gray-50 text-[11px] uppercase font-bold text-gray-500 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3">Persona Referida</th>
                        <th className="px-4 py-3">Fecha</th>
                        <th className="px-4 py-3 text-center">Asistencia 1ra Vez</th>
                        <th className="px-4 py-3 text-right">Estado Bono</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedAmbassadorDetail.referredList.map((item) => {
                        const st = getEffectiveReferrerRewardStatus(item);
                        return (
                          <tr key={item.id}>
                            <td className="px-4 py-3">
                              <p className="font-bold text-gray-800">
                                {item.referred_name || `CC ${item.referred_doc}`}
                              </p>
                              <p className="text-[11px] font-mono text-gray-400">
                                CC: {item.referred_doc}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-gray-500">
                              {new Date(item.created_at).toLocaleDateString('es-CO')}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {item.status === 'completed' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold">
                                  <CheckCircle2 className="w-3 h-3" /> Sí Asistió
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold">
                                  <Clock className="w-3 h-3" /> Pendiente
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-bold">
                              {st === 'redeemed' ? (
                                <span className="text-purple-600">Redimido</span>
                              ) : st === 'available' ? (
                                <span className="text-emerald-600">
                                  Disponible (+${item.reward_amount.toLocaleString('es-CO')})
                                </span>
                              ) : (
                                <span className="text-gray-400">Pendiente</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              {selectedAmbassadorDetail.bonosDisponiblesCount > 0 && (
                <button
                  onClick={() => {
                    const doc = selectedAmbassadorDetail.doc_id;
                    setSelectedAmbassadorDetail(null);
                    selectPatientForCaja(doc);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs cursor-pointer"
                >
                  Ir a Caja para Redimir Bonos
                </button>
              )}
              <button
                onClick={() => setSelectedAmbassadorDetail(null)}
                className="px-5 py-2.5 rounded-xl bg-gray-800 text-white font-bold text-xs cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================
          MODAL: BORRAR TODOS LOS REGISTROS DE REFERIDOS (SOLO ADMIN - PRUEBAS)
          ======================================================================== */}
      {showDeleteAllModal && userRole === 'admin' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5 border-2 border-red-100">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-red-600">
                    Opción de Limpieza para Pruebas
                  </span>
                  <h3 className="text-lg font-extrabold text-gray-900">
                    ¿Borrar todos los registros de Referidos?
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setShowDeleteAllModal(false)}
                disabled={isDeletingAll}
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-900 space-y-2 leading-relaxed">
              <p className="font-bold">
                Esta acción reiniciará por completo el módulo independiente de Referidos:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-red-800">
                <li>
                  Se borrarán los pacientes subidos en el Excel de Referidos (
                  <code>patients_directory</code>).
                </li>
                <li>
                  Se borrarán todos los códigos creados y los referidos inscritos (
                  <code>referrals</code>).
                </li>
                <li>
                  Se reiniciarán en cero las billeteras (
                  <code>ambassador_wallets</code>) y el historial de bonos redimidos en Caja (
                  <code>referral_redemptions</code>).
                </li>
              </ul>
              <p className="text-[11px] text-red-700 pt-1">
                * El resto de la aplicación (Facturación, Rentabilidad, Dashboard, etc.) NO se verá afectado.
              </p>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowDeleteAllModal(false)}
                disabled={isDeletingAll}
                className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDeleteAllReferrals}
                disabled={isDeletingAll}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shadow-lg cursor-pointer disabled:opacity-50"
              >
                {isDeletingAll ? 'Borrando todo...' : 'Sí, Borrar Todo (Pruebas)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
