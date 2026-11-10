'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/shared/lib/supabase/client';
import {
  processReportePacientes,
  ProcessPacientesResult,
  fetchAllPatientsDirectory,
  syncPendingReferralsWithDatabase,
  buildUniqueReferralCode,
} from '@/features/data-parser/reportes';
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
  TrendingUp,
  UserPlus,
  RefreshCw,
  UploadCloud,
  Check,
  Share2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Eye,
  X,
  Database,
  Award,
  ArrowRight,
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

type AmbassadorSummary = {
  doc_id: string;
  full_name: string;
  phone?: string;
  referral_code: string;
  totalInscritos: number;
  totalPendientes: number;
  totalAsistieron: number;
  totalEarned: number;
  totalRedeemed: number;
  balance: number;
  referredList: Referral[];
};

export function ReferralsManager() {
  const [activeTab, setActiveTab] = useState<
    'embajadores' | 'movimiento' | 'directorio' | 'canje' | 'configuracion'
  >('embajadores');

  // Datos principales
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Carga de Excel de Pacientes
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<ProcessPacientesResult | null>(null);
  const [syncBannerMsg, setSyncBannerMsg] = useState<string>('');

  // Búsqueda y filtros en Pestaña 1 (Códigos Creados & Embajadores)
  const [ambassadorSearch, setAmbassadorSearch] = useState('');
  const [ambassadorFilter, setAmbassadorFilter] = useState<'all' | 'with_referrals' | 'with_balance'>('all');
  const [selectedAmbassadorDetail, setSelectedAmbassadorDetail] = useState<AmbassadorSummary | null>(null);

  // Búsqueda y filtros en Pestaña 2 (Movimiento de Referidos)
  const [referralSearch, setReferralSearch] = useState('');
  const [referralStatusFilter, setReferralStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // Búsqueda y Paginación en Pestaña 3 (Base de Datos Maestra de Pacientes)
  const [patientSearch, setPatientSearch] = useState('');
  const [directoryFilter, setDirectoryFilter] = useState<'all' | 'with_code' | 'without_code'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Formulario Pestaña 4 (Registrar Referido / Canje en Caja)
  const [referrerDoc, setReferrerDoc] = useState('');
  const [referrerName, setReferrerName] = useState('');
  const [referredDoc, setReferredDoc] = useState('');
  const [referredName, setReferredName] = useState('');
  const [treatmentName, setTreatmentName] = useState('');
  const [canjeMode, setCanjeMode] = useState<'completed' | 'pending'>('completed');
  const [canjeSuccessMsg, setCanjeSuccessMsg] = useState('');

  // Copiado a portapapeles
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Modal para Confirmar Asistencia y Aplicar Descuento a un Referido Pendiente
  const [confirmingReferral, setConfirmingReferral] = useState<Referral | null>(null);
  const [confirmTreatmentInput, setConfirmTreatmentInput] = useState('');
  const [isConfirmingAttendance, setIsConfirmingAttendance] = useState(false);

  // Modal de Redención de Saldo de Embajador
  const [selectedWalletToRedeem, setSelectedWalletToRedeem] = useState<AmbassadorSummary | null>(null);
  const [redeemAmount, setRedeemAmount] = useState<number>(0);
  const [redeemTreatmentNote, setRedeemTreatmentNote] = useState('');
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

      // 2. Cruzar automáticamente referidos pendientes que ya estén en la BD de pacientes
      await syncPendingReferralsWithDatabase();

      // 3. Cargar TODOS los pacientes de la Base de Datos Maestra (sin truncar en 1000)
      const allPatients = await fetchAllPatientsDirectory();
      setPatients(allPatients);

      // 4. Cargar Referidos (tanto 'pending' como 'completed')
      const { data: refData } = await supabase
        .from('referrals')
        .select('*')
        .order('created_at', { ascending: false });

      const safeRefs: Referral[] = (refData || []).map((r) => ({
        ...r,
        reward_amount: Number(r.reward_amount) || 15000,
        discount_amount: Number(r.discount_amount) || 15000,
      }));
      setReferrals(safeRefs);

      // 5. Cargar Billeteras
      const { data: walletData } = await supabase
        .from('ambassador_wallets')
        .select('*')
        .order('balance', { ascending: false });

      const safeWallets: AmbassadorWallet[] = (walletData || []).map((w) => ({
        ...w,
        total_earned: Number(w.total_earned) || 0,
        total_redeemed: Number(w.total_redeemed) || 0,
        balance: Number(w.balance) || 0,
      }));
      setWallets(safeWallets);
    } catch (err) {
      console.error('Error cargando datos de referidos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Subir archivo Excel reporte_datos_pacientes.xlsx
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

  // Botón manual para cruzar Referidos Pendientes contra la Base de Datos de Pacientes
  const handleManualSyncWithDB = async () => {
    setIsSyncing(true);
    setSyncBannerMsg('');
    try {
      const detected = await syncPendingReferralsWithDatabase();
      await loadAllData();
      if (detected.length > 0) {
        setSyncBannerMsg(
          `¡Se detectaron ${detected.length} paciente(s) referido(s) que ya figuran en la Base de Datos y se acreditaron las bonificaciones a sus embajadores!`
        );
      } else {
        setSyncBannerMsg(
          'Sincronización completada: Todos los referidos que ya están en la base de datos de pacientes se encuentran al día.'
        );
      }
      setTimeout(() => setSyncBannerMsg(''), 7000);
    } catch (err: any) {
      alert('Error al sincronizar con la base de datos: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Crear código de referido para un paciente desde el Panel Admin
  const handleCreateCodeForPatient = async (patient: PatientDirectoryItem) => {
    const supabase = createClient();
    try {
      const existingCodesSet = new Set<string>();
      patients.forEach((p) => {
        if (p.referral_code) existingCodesSet.add(p.referral_code.toUpperCase());
      });

      const newCode = buildUniqueReferralCode(patient.full_name, patient.doc_id, existingCodesSet);

      const { error } = await supabase
        .from('patients_directory')
        .update({
          referral_code: newCode,
          updated_at: new Date().toISOString(),
        })
        .eq('doc_id', patient.doc_id);

      if (error) throw error;

      await loadAllData();
    } catch (err: any) {
      alert('Error al crear código: ' + err.message);
    }
  };

  /**
   * Confirmar que un paciente referido (que estaba 'pending') ASISTIÓ por primera vez a realizarse
   * su tratamiento:
   * 1. Se le aplica el descuento de primera vez.
   * 2. Se asegura que quede registrado en la Base de Datos de Pacientes (patients_directory).
   * 3. Se cambia el estado del referido a 'completed'.
   * 4. Se le asigna automáticamente la bonificación correspondiente a la persona que lo refirió (ambassador_wallets).
   */
  const handleConfirmReferralAttendance = async () => {
    if (!confirmingReferral) return;
    setIsConfirmingAttendance(true);
    const supabase = createClient();

    try {
      const ref = confirmingReferral;
      const cleanReferrerDoc = String(ref.referrer_doc).trim();
      const cleanReferredDoc = String(ref.referred_doc).trim();
      const reward = Number(ref.reward_amount) || settings.referrer_reward;
      const discount = Number(ref.discount_amount) || settings.referred_discount;
      const treatmentDesc = confirmTreatmentInput.trim() || '1er Tratamiento Realizado (Descuento Aplicado)';

      const referrerPat = patients.find((p) => p.doc_id === cleanReferrerDoc);
      const referrerNameFinal = ref.referrer_name || referrerPat?.full_name || `Embajador ${cleanReferrerDoc}`;
      const referredNameFinal = ref.referred_name || `Paciente ${cleanReferredDoc}`;

      // 1. Actualizar el referido a 'completed'
      const { error: refErr } = await supabase
        .from('referrals')
        .update({
          status: 'completed',
          referrer_name: referrerNameFinal,
          referred_name: referredNameFinal,
          reward_amount: reward,
          discount_amount: discount,
          treatment_name: treatmentDesc,
          notes: ref.notes
            ? `${ref.notes} | Asistió y redimió descuento en: ${treatmentDesc}`
            : `Asistió y redimió descuento en: ${treatmentDesc}`,
        })
        .eq('id', ref.id);

      if (refErr) throw refErr;

      // 2. Asegurar que el paciente referido ya quede en patients_directory (Base de Datos de Pacientes)
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
              how_found: `REFERIDO POR ${referrerNameFinal} (${referrerPat?.referral_code || cleanReferrerDoc})`,
              updated_at: new Date().toISOString(),
            },
          ],
          { onConflict: 'doc_id' }
        );
      } else {
        await supabase
          .from('patients_directory')
          .update({
            referred_by_doc: cleanReferrerDoc,
            referred_by_code: referrerPat?.referral_code || null,
            updated_at: new Date().toISOString(),
          })
          .eq('doc_id', cleanReferredDoc);
      }

      // 3. Acreditar la bonificación en la billetera del Embajador que lo refirió
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
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: 'doc_id' }
      );

      if (walletErr) throw walletErr;

      setConfirmingReferral(null);
      setConfirmTreatmentInput('');
      await loadAllData();
    } catch (err: any) {
      alert('Error al confirmar asistencia y acreditar bono: ' + err.message);
    } finally {
      setIsConfirmingAttendance(false);
    }
  };

  // Registrar un Referido o Canje Manual desde Caja
  const handleCanjeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawRefInput = referrerDoc.trim();
    const cleanReferredDoc = referredDoc.trim().replace(/[.,\-\s]/g, '');

    if (!rawRefInput || !cleanReferredDoc) {
      alert('Por favor ingresa la cédula o código del embajador y la cédula del paciente referido.');
      return;
    }

    // Buscar si ingresó el código o la cédula del embajador
    const matchedReferrer = patients.find(
      (p) =>
        p.doc_id === rawRefInput ||
        (p.referral_code && p.referral_code.toUpperCase() === rawRefInput.toUpperCase())
    );

    const finalReferrerDoc = matchedReferrer ? matchedReferrer.doc_id : rawRefInput;
    const finalReferrerName =
      referrerName.trim() || matchedReferrer?.full_name || `Embajador ${finalReferrerDoc}`;

    if (finalReferrerDoc === cleanReferredDoc) {
      alert('La cédula del embajador y la del paciente referido no pueden ser la misma.');
      return;
    }

    setIsSaving(true);
    const supabase = createClient();

    try {
      const reward = settings.referrer_reward;
      const discount = settings.referred_discount;
      const finalReferredName = referredName.trim().toUpperCase() || `PACIENTE ${cleanReferredDoc}`;

      // 1. Insertar el registro de referido
      const { error: refError } = await supabase.from('referrals').insert([
        {
          referrer_doc: finalReferrerDoc,
          referrer_name: finalReferrerName,
          referred_doc: cleanReferredDoc,
          referred_name: finalReferredName,
          reward_amount: reward,
          discount_amount: discount,
          treatment_name:
            canjeMode === 'completed'
              ? treatmentName.trim() || 'Tratamiento Inicial en Clínica'
              : 'Pendiente 1er Tratamiento',
          status: canjeMode,
          notes:
            canjeMode === 'completed'
              ? 'Registrado y descontado en Caja'
              : 'Inscrito con saldo a favor pendiente de 1er tratamiento',
        },
      ]);

      if (refError) throw refError;

      // 2. Si ya asistió ('completed'), agregar a patients_directory y acreditar recompensa al embajador
      if (canjeMode === 'completed') {
        const existingInDir = patients.find((p) => p.doc_id === cleanReferredDoc);
        if (!existingInDir) {
          await supabase.from('patients_directory').upsert(
            [
              {
                doc_id: cleanReferredDoc,
                full_name: finalReferredName,
                referral_code: null,
                referred_by_doc: finalReferrerDoc,
                referred_by_code: matchedReferrer?.referral_code || null,
                how_found: `REFERIDO POR ${finalReferrerName}`,
                updated_at: new Date().toISOString(),
              },
            ],
            { onConflict: 'doc_id' }
          );
        }

        const existingWallet = wallets.find((w) => w.doc_id === finalReferrerDoc);
        const newBalance = (existingWallet?.balance || 0) + reward;
        const newTotalEarned = (existingWallet?.total_earned || 0) + reward;

        const { error: walletError } = await supabase.from('ambassador_wallets').upsert(
          [
            {
              doc_id: finalReferrerDoc,
              full_name: finalReferrerName,
              total_earned: newTotalEarned,
              total_redeemed: existingWallet?.total_redeemed || 0,
              balance: newBalance,
              updated_at: new Date().toISOString(),
            },
          ],
          { onConflict: 'doc_id' }
        );

        if (walletError) throw walletError;

        setCanjeSuccessMsg(
          `¡Descuento de $${discount.toLocaleString('es-CO')} aplicado al paciente referido y bonificación de +$${reward.toLocaleString('es-CO')} acreditada a ${finalReferrerName}!`
        );
      } else {
        setCanjeSuccessMsg(
          `¡Paciente referido inscrito con éxito! Tiene un saldo a favor de $${discount.toLocaleString('es-CO')} para cuando asista a su primer tratamiento.`
        );
      }

      setReferrerDoc('');
      setReferrerName('');
      setReferredDoc('');
      setReferredName('');
      setTreatmentName('');
      setTimeout(() => setCanjeSuccessMsg(''), 6000);

      await loadAllData();
    } catch (err: any) {
      alert('Error al registrar referido: ' + (err.message || err));
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

  // Redimir Saldo de la Billetera de un Embajador cuando se realiza un tratamiento
  const handleRedeemWallet = async () => {
    if (!selectedWalletToRedeem || redeemAmount <= 0) return;
    if (redeemAmount > selectedWalletToRedeem.balance) {
      alert('El monto a redimir no puede superar el saldo disponible del paciente.');
      return;
    }

    setIsRedeeming(true);
    const supabase = createClient();

    try {
      const updatedRedeemed = selectedWalletToRedeem.totalRedeemed + redeemAmount;
      const updatedBalance = selectedWalletToRedeem.balance - redeemAmount;

      const { error } = await supabase.from('ambassador_wallets').upsert(
        [
          {
            doc_id: selectedWalletToRedeem.doc_id,
            full_name: selectedWalletToRedeem.full_name,
            phone: selectedWalletToRedeem.phone || null,
            total_earned: selectedWalletToRedeem.totalEarned,
            total_redeemed: updatedRedeemed,
            balance: updatedBalance,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: 'doc_id' }
      );

      if (error) throw error;

      setSelectedWalletToRedeem(null);
      setRedeemAmount(0);
      setRedeemTreatmentNote('');
      await loadAllData();
    } catch (err: any) {
      alert('Error al redimir saldo: ' + err.message);
    } finally {
      setIsRedeeming(false);
    }
  };

  // Eliminar un registro de referido
  const handleDeleteReferral = async (ref: Referral) => {
    if (!confirm(`¿Eliminar el registro del referido ${ref.referred_name || ref.referred_doc}?`)) return;
    const supabase = createClient();

    try {
      const { error } = await supabase.from('referrals').delete().eq('id', ref.id);
      if (error) throw error;

      // Si estaba 'completed', ajustar también la billetera del embajador
      if (ref.status === 'completed') {
        const existingWallet = wallets.find((w) => w.doc_id === ref.referrer_doc);
        if (existingWallet) {
          const newEarned = Math.max(0, existingWallet.total_earned - ref.reward_amount);
          const newBalance = Math.max(0, newEarned - existingWallet.total_redeemed);
          await supabase
            .from('ambassador_wallets')
            .update({
              total_earned: newEarned,
              balance: newBalance,
              updated_at: new Date().toISOString(),
            })
            .eq('doc_id', ref.referrer_doc);
        }
      }

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
  // CÁLCULO CONSOLIDADO DE EMBAJADORES (QUIÉNES TIENEN CÓDIGO Y ESTÁN REFIRIENDO)
  // ============================================================================
  const patientsMap = new Map<string, PatientDirectoryItem>();
  patients.forEach((p) => patientsMap.set(p.doc_id, p));

  const walletsMap = new Map<string, AmbassadorWallet>();
  wallets.forEach((w) => walletsMap.set(w.doc_id, w));

  // Unir pacientes que crearon código en el portal + cualquier persona que tenga referidos o billetera
  const ambassadorDocsSet = new Set<string>();
  patients.forEach((p) => {
    if (p.referral_code) ambassadorDocsSet.add(p.doc_id);
  });
  referrals.forEach((r) => ambassadorDocsSet.add(r.referrer_doc));
  wallets.forEach((w) => ambassadorDocsSet.add(w.doc_id));

  const ambassadorsList: AmbassadorSummary[] = Array.from(ambassadorDocsSet).map((docId) => {
    const pat = patientsMap.get(docId);
    const wal = walletsMap.get(docId);
    const myRefs = referrals.filter((r) => r.referrer_doc === docId);
    const pendingRefs = myRefs.filter((r) => r.status === 'pending');
    const completedRefs = myRefs.filter((r) => r.status === 'completed');

    const calculatedEarned = completedRefs.reduce((sum, r) => sum + r.reward_amount, 0);
    const totalRedeemed = wal ? wal.total_redeemed : 0;
    const totalEarned = wal ? Math.max(wal.total_earned, calculatedEarned) : calculatedEarned;
    const balance = Math.max(totalEarned - totalRedeemed, 0);

    return {
      doc_id: docId,
      full_name: pat?.full_name || wal?.full_name || myRefs[0]?.referrer_name || `Paciente ${docId}`,
      phone: pat?.phone || wal?.phone,
      referral_code: pat?.referral_code || `CC-${docId.slice(-4)}`,
      totalInscritos: myRefs.length,
      totalPendientes: pendingRefs.length,
      totalAsistieron: completedRefs.length,
      totalEarned,
      totalRedeemed,
      balance,
      referredList: myRefs,
    };
  });

  // Ordenar: primero los que tienen más referidos inscritos, luego por saldo
  ambassadorsList.sort((a, b) => {
    if (b.totalInscritos !== a.totalInscritos) return b.totalInscritos - a.totalInscritos;
    return b.balance - a.balance;
  });

  // Totales de Métricas Globales
  const totalPacientesEnBD = patients.length;
  const totalCodigosCreados = ambassadorsList.length;
  const totalReferidosInscritos = referrals.length;
  const totalReferidosPendientes = referrals.filter((r) => r.status === 'pending').length;
  const totalReferidosAsistieron = referrals.filter((r) => r.status === 'completed').length;
  const totalSaldoDisponibleBilleteras = ambassadorsList.reduce((sum, a) => sum + a.balance, 0);
  const totalRedimidoHistorico = ambassadorsList.reduce((sum, a) => sum + a.totalRedeemed, 0);

  // Filtrado Pestaña 1: Embajadores
  const filteredAmbassadors = ambassadorsList.filter((a) => {
    const matchesSearch =
      a.doc_id.includes(ambassadorSearch.trim()) ||
      a.full_name.toLowerCase().includes(ambassadorSearch.toLowerCase()) ||
      a.referral_code.toLowerCase().includes(ambassadorSearch.toLowerCase());

    if (!matchesSearch) return false;
    if (ambassadorFilter === 'with_referrals') return a.totalInscritos > 0;
    if (ambassadorFilter === 'with_balance') return a.balance > 0;
    return true;
  });

  // Filtrado Pestaña 2: Movimiento de Referidos
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

  // Filtrado Pestaña 3: Directorio Maestro de Pacientes
  const filteredPatients = patients.filter((p) => {
    const q = patientSearch.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.doc_id.toLowerCase().includes(q) ||
      p.full_name.toLowerCase().includes(q) ||
      (p.referral_code && p.referral_code.toLowerCase().includes(q)) ||
      (p.phone && p.phone.includes(q));

    if (!matchesSearch) return false;
    if (directoryFilter === 'with_code') return Boolean(p.referral_code);
    if (directoryFilter === 'without_code') return !p.referral_code;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / itemsPerPage));
  const paginatedPatients = filteredPatients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6 animate-fade-in text-gray-800">
      {/* INPUT FILE OCULTO */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".xlsx, .xls"
        className="hidden"
      />

      {/* BANNER SUPERIOR: SUBIDA DE BASE DE DATOS MAESTRA DE PACIENTES (IMAGEN 4) */}
      <div className="bg-gradient-to-r from-blue-950 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-cyan-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Base de Datos Maestra de Pacientes</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold font-outfit">
            Flujo de Pacientes & Generación de Códigos
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
            Sube el archivo Excel{' '}
            <code className="bg-white/10 px-2 py-0.5 rounded text-cyan-300 font-mono">
              reporte_datos_pacientes.xlsx
            </code>
            . Los pacientes que estén en esta base de datos podrán ingresar al{' '}
            <strong>Portal Pacientes</strong> con su nombre y cédula para crear su código de referido. Cuando un referido inscrito aparezca en esta base de datos, se acreditará automáticamente la bonificación a quien lo refirió.
          </p>
        </div>

        <div className="z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <button
            onClick={handleManualSyncWithDB}
            disabled={isSyncing || isLoading}
            title="Cruza los referidos inscritos contra la base de datos de pacientes para acreditar bonos automáticamente"
            className="px-4 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-cyan-300' : ''}`} />
            <span>{isSyncing ? 'Verificando BD...' : 'Cruzar Referidos con BD'}</span>
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
            <span>{isUploading ? 'Procesando Pacientes...' : 'Subir Excel de Pacientes'}</span>
          </button>
        </div>
      </div>

      {/* NOTIFICACIÓN DE SINCRONIZACIÓN MANUAL */}
      {syncBannerMsg && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between gap-3 text-blue-900 text-xs sm:text-sm font-bold animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
            <span>{syncBannerMsg}</span>
          </div>
          <button onClick={() => setSyncBannerMsg('')} className="text-blue-700 hover:text-blue-950">
            ✕
          </button>
        </div>
      )}

      {/* REPORTE DE RESULTADOS DE LA ÚLTIMA CARGA DE EXCEL */}
      {uploadResult && (
        <div className="p-6 bg-emerald-50/90 border border-emerald-200 rounded-3xl shadow-sm space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-emerald-950 text-base font-outfit">
                  ¡Base de Datos de Pacientes Actualizada con Éxito!
                </h3>
                <p className="text-xs text-emerald-700">
                  Los pacientes ya pueden validar su cédula en el Portal Pacientes y crear su código.
                </p>
              </div>
            </div>
            <button
              onClick={() => setUploadResult(null)}
              className="text-emerald-700 hover:text-emerald-900 font-bold text-xs cursor-pointer"
            >
              Cerrar ✕
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-white p-3.5 rounded-2xl border border-emerald-100">
              <span className="text-[11px] text-gray-500 block">Total en Excel</span>
              <span className="text-lg font-black text-gray-800">
                {uploadResult.totalProcessed.toLocaleString('es-CO')}
              </span>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-emerald-100">
              <span className="text-[11px] text-emerald-600 font-bold block">Nuevos Pacientes en BD</span>
              <span className="text-lg font-black text-emerald-600">
                +{uploadResult.newPatientsCount.toLocaleString('es-CO')}
              </span>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-emerald-100">
              <span className="text-[11px] text-gray-500 block">Existentes Sincronizados</span>
              <span className="text-lg font-black text-blue-600">
                {uploadResult.existingUpdatedCount.toLocaleString('es-CO')}
              </span>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-emerald-100">
              <span className="text-[11px] text-amber-600 font-bold block">
                Referidos Confirmados en BD
              </span>
              <span className="text-lg font-black text-amber-600">
                +{uploadResult.referralsDetected.length}
              </span>
            </div>
          </div>

          {uploadResult.referralsDetected.length > 0 && (
            <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1">
              <p className="font-bold">
                🎉 Pacientes referidos encontrados en la Base de Datos (Bonificación asignada automáticamente):
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                {uploadResult.referralsDetected.map((ref, idx) => (
                  <li key={idx}>
                    <strong>{ref.patient_name}</strong> (CC: {ref.patient_doc}) ya figura en la BD — Se acreditó{' '}
                    <strong>
                      +${(ref.reward_amount || settings.referrer_reward).toLocaleString('es-CO')} COP
                    </strong>{' '}
                    a quien lo refirió: <strong>{ref.referrer_name || ref.referrer_doc}</strong>.
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* TARJETAS DE MÉTRICAS GLOBALES DEL SISTEMA DE REFERIDOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Códigos Creados */}
        <div className="bg-white p-5 rounded-3xl shadow-[4px_4px_10px_#b8b9be,-4px_-4px_10px_#ffffff] border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Códigos Creados
            </p>
            <p className="text-2xl font-black text-blue-600 mt-1">
              {totalCodigosCreados.toLocaleString('es-CO')}
            </p>
            <p className="text-[11px] text-gray-500 font-semibold mt-0.5">
              De {totalPacientesEnBD.toLocaleString('es-CO')} en BD
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
        </div>

        {/* 2. Referidos Inscritos */}
        <div className="bg-white p-5 rounded-3xl shadow-[4px_4px_10px_#b8b9be,-4px_-4px_10px_#ffffff] border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Referidos Inscritos
            </p>
            <p className="text-2xl font-black text-indigo-600 mt-1">{totalReferidosInscritos}</p>
            <p className="text-[11px] text-amber-600 font-bold mt-0.5">
              {totalReferidosPendientes} pendientes de 1ra cita
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <UserPlus className="w-5 h-5" />
          </div>
        </div>

        {/* 3. Sí Asistieron */}
        <div className="bg-white p-5 rounded-3xl shadow-[4px_4px_10px_#b8b9be,-4px_-4px_10px_#ffffff] border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Sí Asistieron (1ra Vez)
            </p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{totalReferidosAsistieron}</p>
            <p className="text-[11px] text-emerald-600 font-bold mt-0.5">
              En BD y con descuento
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* 4. Saldo en Billeteras (Recompensas) */}
        <div className="bg-white p-5 rounded-3xl shadow-[4px_4px_10px_#b8b9be,-4px_-4px_10px_#ffffff] border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Saldo Embajadores
            </p>
            <p className="text-2xl font-black text-amber-600 mt-1">
              ${totalSaldoDisponibleBilleteras.toLocaleString('es-CO')}
            </p>
            <p className="text-[11px] text-gray-500 font-semibold mt-0.5">
              Redimido: ${totalRedimidoHistorico.toLocaleString('es-CO')}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        {/* 5. Bono Vigente */}
        <div className="bg-white p-5 rounded-3xl shadow-[4px_4px_10px_#b8b9be,-4px_-4px_10px_#ffffff] border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Bono Vigente
            </p>
            <p className="text-2xl font-black text-purple-600 mt-1">
              ${settings.referrer_reward.toLocaleString('es-CO')}
            </p>
            <p className="text-[11px] text-purple-600 font-bold mt-0.5 truncate max-w-[140px]">
              1ra Cita: -${settings.referred_discount.toLocaleString('es-CO')}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* MENÚ DE PESTAÑAS INTERNAS */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveTab('embajadores')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'embajadores'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Códigos Inscritos & Recompensas ({totalCodigosCreados})</span>
          </button>

          <button
            onClick={() => setActiveTab('movimiento')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'movimiento'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Movimiento de Referidos ({totalReferidosInscritos})</span>
            {totalReferidosPendientes > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950">
                {totalReferidosPendientes} pend.
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('directorio')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'directorio'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>BD Pacientes Excel ({totalPacientesEnBD.toLocaleString('es-CO')})</span>
          </button>

          <button
            onClick={() => setActiveTab('canje')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'canje'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Registrar en Caja</span>
          </button>

          <button
            onClick={() => setActiveTab('configuracion')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'configuracion'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Configurar Campaña</span>
          </button>
        </div>

        <button
          onClick={loadAllData}
          title="Recargar datos"
          className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
        </button>
      </div>

      {/* ======================================================================
          PESTAÑA 1: CÓDIGOS INSCRITOS, QUIÉNES REFIEREN Y GESTIÓN DE RECOMPENSAS
          ====================================================================== */}
      {activeTab === 'embajadores' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-[4px_4px_10px_#b8b9be,-4px_-4px_10px_#ffffff] border border-gray-100 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Award className="w-6 h-6 text-blue-600" />
                <span>Pacientes con Código de Referido, Movimiento y Recompensas</span>
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Control de los pacientes que se han inscrito y creado su código: a cuántas personas han referido, cuántos de ellos sí asistieron y el saldo de sus recompensas.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setAmbassadorFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    ambassadorFilter === 'all' ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-500'
                  }`}
                >
                  Todos ({ambassadorsList.length})
                </button>
                <button
                  onClick={() => setAmbassadorFilter('with_referrals')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    ambassadorFilter === 'with_referrals'
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-gray-500'
                  }`}
                >
                  Con Referidos ({ambassadorsList.filter((a) => a.totalInscritos > 0).length})
                </button>
                <button
                  onClick={() => setAmbassadorFilter('with_balance')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    ambassadorFilter === 'with_balance'
                      ? 'bg-white text-amber-700 shadow-xs'
                      : 'text-gray-500'
                  }`}
                >
                  Con Saldo ({ambassadorsList.filter((a) => a.balance > 0).length})
                </button>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, cédula o código..."
                  value={ambassadorSearch}
                  onChange={(e) => setAmbassadorSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {copiedCode && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-emerald-800 text-xs font-bold animate-fade-in">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>
                ¡Mensaje e invitación del código <strong>{copiedCode}</strong> copiado al portapapeles!
              </span>
            </div>
          )}

          <div className="overflow-x-auto rounded-2xl border border-gray-100">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="text-[11px] uppercase bg-gray-50 text-gray-500 font-extrabold border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3.5">Paciente que Refiere (Embajador)</th>
                  <th className="px-4 py-3.5 text-center">Código Creado</th>
                  <th className="px-4 py-3.5 text-center">Referidos Inscritos</th>
                  <th className="px-4 py-3.5 text-center">Pendientes</th>
                  <th className="px-4 py-3.5 text-center">Sí Asistieron</th>
                  <th className="px-4 py-3.5 text-right">Total Ganado</th>
                  <th className="px-4 py-3.5 text-right">Redimido</th>
                  <th className="px-4 py-3.5 text-right">Saldo Disponible</th>
                  <th className="px-4 py-3.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs sm:text-sm">
                {filteredAmbassadors.map((amb) => (
                  <tr key={amb.doc_id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-4 py-4">
                      <p className="font-bold text-gray-800">{amb.full_name}</p>
                      <p className="text-[11px] text-gray-400 font-mono">
                        CC: {amb.doc_id} {amb.phone ? `· Tel: ${amb.phone}` : ''}
                      </p>
                    </td>

                    <td className="px-4 py-4 text-center">
                      <span className="px-3 py-1.5 bg-blue-50 text-blue-700 font-mono font-black text-xs rounded-xl border border-blue-100 tracking-wider">
                        {amb.referral_code}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-center">
                      <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-extrabold text-xs">
                        {amb.totalInscritos} inscritos
                      </span>
                    </td>

                    <td className="px-4 py-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full font-bold text-xs ${
                          amb.totalPendientes > 0
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-gray-50 text-gray-400'
                        }`}
                      >
                        {amb.totalPendientes}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full font-extrabold text-xs ${
                          amb.totalAsistieron > 0
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-gray-50 text-gray-400'
                        }`}
                      >
                        {amb.totalAsistieron} asistieron
                      </span>
                    </td>

                    <td className="px-4 py-4 text-right font-semibold text-gray-700">
                      ${amb.totalEarned.toLocaleString('es-CO')}
                    </td>

                    <td className="px-4 py-4 text-right text-gray-400">
                      ${amb.totalRedeemed.toLocaleString('es-CO')}
                    </td>

                    <td className="px-4 py-4 text-right">
                      <span
                        className={`font-black text-base ${
                          amb.balance > 0 ? 'text-amber-600' : 'text-gray-400'
                        }`}
                      >
                        ${amb.balance.toLocaleString('es-CO')}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedAmbassadorDetail(amb)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                          title="Ver personas que se han inscrito con el código de este paciente"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver ({amb.totalInscritos})</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedWalletToRedeem(amb);
                            setRedeemAmount(amb.balance > 0 ? amb.balance : 0);
                          }}
                          disabled={amb.balance <= 0}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                          title="Redimir saldo en un tratamiento"
                        >
                          Redimir
                        </button>

                        <button
                          onClick={() => copyInvitationText(amb.referral_code)}
                          className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer"
                          title="Copiar invitación para WhatsApp"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredAmbassadors.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center text-gray-400">
                      <div className="max-w-md mx-auto space-y-2">
                        <Award className="w-8 h-8 text-gray-300 mx-auto" />
                        <p className="font-bold text-gray-600 text-sm">
                          Aún no hay pacientes que hayan creado su código de referido
                        </p>
                        <p className="text-xs text-gray-400">
                          Cuando un paciente de la base de datos ingrese al{' '}
                          <strong>Portal Pacientes</strong> con su nombre y cédula y cree su código (o cuando lo actives en la pestaña BD Pacientes), aparecerá aquí con todo su movimiento.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================================
          PESTAÑA 2: MOVIMIENTO DE REFERIDOS (INSCRITOS VS ASISTIDOS)
          ====================================================================== */}
      {activeTab === 'movimiento' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-[4px_4px_10px_#b8b9be,-4px_-4px_10px_#ffffff] border border-gray-100 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Users className="w-6 h-6 text-indigo-600" />
                <span>Movimiento de Personas Referidas (Inscritos & Asistencias)</span>
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Visualiza quiénes se han registrado con un código de referido, quiénes tienen saldo a favor pendiente de su 1er tratamiento y quiénes ya asistieron.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setReferralStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    referralStatusFilter === 'all'
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-gray-500'
                  }`}
                >
                  Todos ({referrals.length})
                </button>
                <button
                  onClick={() => setReferralStatusFilter('pending')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    referralStatusFilter === 'pending'
                      ? 'bg-white text-amber-700 shadow-xs'
                      : 'text-gray-500'
                  }`}
                >
                  Pendientes 1ra Cita ({totalReferidosPendientes})
                </button>
                <button
                  onClick={() => setReferralStatusFilter('completed')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    referralStatusFilter === 'completed'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-gray-500'
                  }`}
                >
                  Sí Asistieron ({totalReferidosAsistieron})
                </button>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar referido o embajador..."
                  value={referralSearch}
                  onChange={(e) => setReferralSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gray-100">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="text-[11px] uppercase bg-gray-50 text-gray-500 font-extrabold border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3.5">Fecha</th>
                  <th className="px-4 py-3.5">Persona Referida (Nuevo Paciente)</th>
                  <th className="px-4 py-3.5">Referido Por (Embajador)</th>
                  <th className="px-4 py-3.5 text-right">Saldo/Descuento 1ra Vez</th>
                  <th className="px-4 py-3.5 text-right">Bono Embajador</th>
                  <th className="px-4 py-3.5 text-center">Estado</th>
                  <th className="px-4 py-3.5 text-center">Acción en Clínica</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs sm:text-sm">
                {filteredReferrals.map((ref) => {
                  const isReferredInDB = patientsMap.has(ref.referred_doc);
                  const referrerPat = patientsMap.get(ref.referrer_doc);

                  return (
                    <tr key={ref.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-4 text-xs text-gray-400 whitespace-nowrap">
                        {new Date(ref.created_at).toLocaleDateString('es-CO')}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="font-bold text-gray-800">
                            {ref.referred_name || `Paciente ${ref.referred_doc}`}
                          </p>
                          {isReferredInDB && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                              En BD Clínica
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 font-mono">CC: {ref.referred_doc}</p>
                        {ref.notes && (
                          <p className="text-[10px] text-gray-400 truncate max-w-[230px] mt-0.5">
                            {ref.notes}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-bold text-gray-800">
                          {ref.referrer_name || referrerPat?.full_name || ref.referrer_doc}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] text-gray-400 font-mono">
                            CC: {ref.referrer_doc}
                          </span>
                          {referrerPat?.referral_code && (
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono font-bold text-[10px]">
                              {referrerPat.referral_code}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-right">
                        <span className="font-extrabold text-indigo-600">
                          -${ref.discount_amount.toLocaleString('es-CO')}
                        </span>
                        <span className="block text-[10px] text-gray-400">
                          {ref.status === 'completed' ? 'Descontado en 1ra cita' : 'Saldo a favor activo'}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-right">
                        <span
                          className={`font-extrabold ${
                            ref.status === 'completed' ? 'text-emerald-600' : 'text-amber-600'
                          }`}
                        >
                          +${ref.reward_amount.toLocaleString('es-CO')}
                        </span>
                        <span className="block text-[10px] text-gray-400">
                          {ref.status === 'completed' ? 'Acreditado al embajador' : 'Al asistir a 1ra cita'}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-center">
                        {ref.status === 'completed' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-extrabold border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Sí Asistió
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-extrabold border border-amber-200">
                            <Clock className="w-3.5 h-3.5" /> Inscrito (Pendiente)
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {ref.status === 'pending' && (
                            <button
                              onClick={() => {
                                setConfirmingReferral(ref);
                                setConfirmTreatmentInput('');
                              }}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                              title="Marcar que el paciente asistió a su 1er tratamiento, aplicar su descuento y abonar la recompensa al embajador"
                            >
                              Confirmar Asistencia / Descuento
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteReferral(ref)}
                            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar registro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredReferrals.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-gray-400 italic">
                      No hay registros de referidos para este filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================================
          PESTAÑA 3: BASE DE DATOS MAESTRA DE PACIENTES SUBIDA EN EXCEL
          ====================================================================== */}
      {activeTab === 'directorio' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-[4px_4px_10px_#b8b9be,-4px_-4px_10px_#ffffff] border border-gray-100 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Database className="w-6 h-6 text-blue-600" />
                <span>Base de Datos Maestra de Pacientes ({totalPacientesEnBD.toLocaleString('es-CO')})</span>
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Pacientes cargados desde el archivo Excel de la clínica. Solo quienes coincidan con esta base de datos pueden crear su código de referido en el Portal Pacientes.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => {
                    setDirectoryFilter('all');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    directoryFilter === 'all' ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-500'
                  }`}
                >
                  Todos ({patients.length.toLocaleString('es-CO')})
                </button>
                <button
                  onClick={() => {
                    setDirectoryFilter('with_code');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    directoryFilter === 'with_code'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-gray-500'
                  }`}
                >
                  Con Código ({patients.filter((p) => Boolean(p.referral_code)).length})
                </button>
                <button
                  onClick={() => {
                    setDirectoryFilter('without_code');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    directoryFilter === 'without_code'
                      ? 'bg-white text-gray-700 shadow-xs'
                      : 'text-gray-500'
                  }`}
                >
                  Sin Código ({patients.filter((p) => !p.referral_code).length.toLocaleString('es-CO')})
                </button>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, cédula o código..."
                  value={patientSearch}
                  onChange={(e) => {
                    setPatientSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gray-100">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="text-xs uppercase bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3.5">Paciente en BD</th>
                  <th className="px-5 py-3.5">Documento (Cédula)</th>
                  <th className="px-5 py-3.5">Contacto</th>
                  <th className="px-5 py-3.5 text-center">Estado Código de Referido</th>
                  <th className="px-5 py-3.5 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs sm:text-sm">
                {paginatedPatients.map((p) => (
                  <tr key={p.doc_id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-gray-800">{p.full_name}</p>
                      {p.referred_by_doc && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md font-semibold mt-0.5">
                          🎁 Vino referido por CC: {p.referred_by_doc}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-gray-600">{p.doc_id}</td>
                    <td className="px-5 py-3.5 text-xs text-gray-500">
                      <p>{p.phone || '-'}</p>
                      <p className="text-gray-400 truncate max-w-[160px]">{p.email || ''}</p>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {p.referral_code ? (
                        <span className="px-3 py-1.5 bg-blue-50 text-blue-700 font-mono font-black text-xs rounded-xl border border-blue-100 tracking-wider">
                          {p.referral_code}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">
                          No ha creado código en portal
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {p.referral_code ? (
                        <button
                          onClick={() => copyInvitationText(p.referral_code!)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs transition-colors cursor-pointer"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Copiar WhatsApp</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleCreateCodeForPatient(p)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Activar Código</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}

                {filteredPatients.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-gray-400 italic">
                      No se encontraron pacientes en la base de datos para tu búsqueda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <span className="text-xs text-gray-400">
                Mostrando {(currentPage - 1) * itemsPerPage + 1} a{' '}
                {Math.min(currentPage * itemsPerPage, filteredPatients.length)} de{' '}
                {filteredPatients.length.toLocaleString('es-CO')} pacientes
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-xl border border-gray-200 text-gray-500 disabled:opacity-30 hover:bg-gray-50 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="px-4 py-1.5 text-xs font-bold text-gray-700">
                  Página {currentPage} de {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-xl border border-gray-200 text-gray-500 disabled:opacity-30 hover:bg-gray-50 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================================
          PESTAÑA 4: REGISTRAR REFERIDO O APLICAR CANJE EN CAJA
          ====================================================================== */}
      {activeTab === 'canje' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-[4px_4px_10px_#b8b9be,-4px_-4px_10px_#ffffff] border border-gray-100 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Gift className="w-6 h-6 text-blue-600" /> Registro / Canje Manual en Recepción
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Registra un paciente referido o aplica directamente su descuento de 1er tratamiento en caja.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 text-blue-700 font-bold text-xs">
              <span>Bono vigente:</span>
              <span className="text-sm font-extrabold text-blue-900">
                ${settings.referrer_reward.toLocaleString('es-CO')} COP
              </span>
            </div>
          </div>

          {canjeSuccessMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm font-bold animate-fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{canjeSuccessMsg}</span>
            </div>
          )}

          <form onSubmit={handleCanjeSubmit} className="space-y-6">
            {/* Selector de modo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 p-2 rounded-2xl border border-gray-200">
              <button
                type="button"
                onClick={() => setCanjeMode('completed')}
                className={`p-3 rounded-xl text-xs sm:text-sm font-bold text-left transition-all cursor-pointer ${
                  canjeMode === 'completed'
                    ? 'bg-white text-emerald-700 shadow-sm border border-emerald-200'
                    : 'text-gray-500'
                }`}
              >
                <span className="block font-extrabold">
                  1. Ya asistió hoy a su 1er tratamiento (Aplicar descuento ahora)
                </span>
                <span className="text-[11px] font-normal opacity-80">
                  Aplica el descuento al nuevo paciente y acredita el bono a la billetera del embajador.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCanjeMode('pending')}
                className={`p-3 rounded-xl text-xs sm:text-sm font-bold text-left transition-all cursor-pointer ${
                  canjeMode === 'pending'
                    ? 'bg-white text-amber-700 shadow-sm border border-amber-200'
                    : 'text-gray-500'
                }`}
              >
                <span className="block font-extrabold">
                  2. Solo dejar inscrito con saldo a favor (Pendiente de asistir)
                </span>
                <span className="text-[11px] font-normal opacity-80">
                  El referido verá su saldo a favor y el bono se acreditará cuando asista a la clínica.
                </span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sección Embajador */}
              <div className="p-5 bg-amber-50/50 rounded-2xl border border-amber-200/60 space-y-4">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                  <Wallet className="w-4 h-4 text-amber-600" />
                  <span>1. Paciente que Refiere (Embajador en BD)</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Cédula o Código del Embajador *
                  </label>
                  <input
                    type="text"
                    value={referrerDoc}
                    onChange={(e) => {
                      const val = e.target.value;
                      setReferrerDoc(val);
                      const matched = patients.find(
                        (p) =>
                          p.doc_id === val.trim() ||
                          (p.referral_code &&
                            p.referral_code.toUpperCase() === val.trim().toUpperCase())
                      );
                      if (matched) {
                        setReferrerName(matched.full_name);
                      }
                    }}
                    placeholder="Ej. 31973555 o LUZ3555"
                    className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    value={referrerName}
                    onChange={(e) => setReferrerName(e.target.value)}
                    placeholder="Se autocompleta si está en la BD"
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div className="p-3 bg-white rounded-xl border border-amber-100 flex items-center justify-between text-xs text-amber-900">
                  <span>Bonificación para quien refiere:</span>
                  <span className="font-extrabold text-sm text-amber-700">
                    +${settings.referrer_reward.toLocaleString('es-CO')} COP
                  </span>
                </div>
              </div>

              {/* Sección Nuevo Paciente */}
              <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-200/60 space-y-4">
                <div className="flex items-center gap-2 text-blue-800 font-bold text-sm">
                  <UserPlus className="w-4 h-4 text-blue-600" />
                  <span>2. Persona Referida (Nuevo Paciente)</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Cédula del Paciente Referido *
                  </label>
                  <input
                    type="text"
                    value={referredDoc}
                    onChange={(e) => {
                      const val = e.target.value;
                      setReferredDoc(val);
                      const matched = patients.find((p) => p.doc_id === val.trim());
                      if (matched) {
                        setReferredName(matched.full_name);
                      }
                    }}
                    placeholder="Ej. 99887766"
                    className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    value={referredName}
                    onChange={(e) => setReferredName(e.target.value)}
                    placeholder="Ej. María López"
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>

                {canjeMode === 'completed' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Tratamiento Realizado
                    </label>
                    <input
                      type="text"
                      value={treatmentName}
                      onChange={(e) => setTreatmentName(e.target.value)}
                      placeholder="Ej. Consulta Médica Integral / Sueroterapia"
                      className="w-full px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                )}

                <div className="p-3 bg-white rounded-xl border border-blue-100 flex items-center justify-between text-xs text-blue-900">
                  <span>Saldo a favor / Descuento 1ra vez:</span>
                  <span className="font-extrabold text-sm text-emerald-600">
                    -${settings.referred_discount.toLocaleString('es-CO')} COP
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-blue-300 hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSaving
                  ? 'Guardando...'
                  : canjeMode === 'completed'
                  ? `Aplicar Descuento de $${settings.referred_discount.toLocaleString('es-CO')} y Bonificar al Embajador`
                  : 'Inscribir Referido con Saldo a Favor'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================================
          PESTAÑA 5: CONFIGURACIÓN DE CAMPAÑA
          ====================================================================== */}
      {activeTab === 'configuracion' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-[4px_4px_10px_#b8b9be,-4px_-4px_10px_#ffffff] border border-gray-100 space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Settings className="w-6 h-6 text-purple-600" /> Configuración de Valores del Programa de Referidos
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Define el saldo a favor que recibe el paciente referido en su primer tratamiento y la recompensa que gana el paciente que lo refirió.
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
                  Saldo a Favor para el Referido ($ COP)
                </label>
                <input
                  type="number"
                  step="1000"
                  min="0"
                  value={settings.referred_discount}
                  onChange={(e) =>
                    setSettings({ ...settings, referred_discount: Number(e.target.value) })
                  }
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold text-blue-600 focus:ring-2 focus:ring-purple-500 outline-none"
                  required
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Descuento que se le aplica cuando asiste por primera vez a realizarse un tratamiento.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Bonificación al Paciente que Refiere ($ COP)
                </label>
                <input
                  type="number"
                  step="1000"
                  min="0"
                  value={settings.referrer_reward}
                  onChange={(e) =>
                    setSettings({ ...settings, referrer_reward: Number(e.target.value) })
                  }
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold text-amber-600 focus:ring-2 focus:ring-purple-500 outline-none"
                  required
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Saldo acreditado a quien refirió una vez el paciente referido asiste y está en la BD.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Ticket Mínimo de Tratamiento ($ COP)
              </label>
              <input
                type="number"
                step="5000"
                min="0"
                value={settings.min_invoice_amount}
                onChange={(e) =>
                  setSettings({ ...settings, min_invoice_amount: Number(e.target.value) })
                }
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm font-semibold focus:ring-2 focus:ring-purple-500 outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="px-8 py-3.5 bg-purple-600 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? 'Guardando Cambios...' : 'Guardar Configuración'}
            </button>
          </form>
        </div>
      )}

      {/* ======================================================================
          MODAL 1: VER DETALLE DE PERSONAS REFERIDAS POR UN EMBAJADOR
          ====================================================================== */}
      {selectedAmbassadorDetail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-gray-100 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-extrabold text-gray-900">
                    {selectedAmbassadorDetail.full_name}
                  </h3>
                  <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-mono font-black text-xs border border-blue-100">
                    {selectedAmbassadorDetail.referral_code}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 font-mono">
                  Cédula: {selectedAmbassadorDetail.doc_id}
                </p>
              </div>
              <button
                onClick={() => setSelectedAmbassadorDetail(null)}
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-center">
                <span className="text-xl font-black text-indigo-700 block">
                  {selectedAmbassadorDetail.totalInscritos}
                </span>
                <span className="text-[11px] font-bold text-indigo-600">Inscritos con su código</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100 text-center">
                <span className="text-xl font-black text-emerald-700 block">
                  {selectedAmbassadorDetail.totalAsistieron}
                </span>
                <span className="text-[11px] font-bold text-emerald-600">Sí Asistieron</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-100 text-center">
                <span className="text-xl font-black text-amber-700 block">
                  ${selectedAmbassadorDetail.balance.toLocaleString('es-CO')}
                </span>
                <span className="text-[11px] font-bold text-amber-700">Saldo Disponible</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
                Personas que se inscribieron con el código {selectedAmbassadorDetail.referral_code}
              </h4>

              {selectedAmbassadorDetail.referredList.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-6 text-center bg-gray-50 rounded-2xl">
                  Este paciente ya creó su código, pero aún ninguna persona se ha inscrito con él.
                </p>
              ) : (
                <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden">
                  {selectedAmbassadorDetail.referredList.map((ref) => (
                    <div
                      key={ref.id}
                      className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white hover:bg-gray-50"
                    >
                      <div>
                        <p className="text-xs sm:text-sm font-bold text-gray-800">
                          {ref.referred_name || `Paciente ${ref.referred_doc}`}
                        </p>
                        <p className="text-[11px] text-gray-400 font-mono">
                          CC: {ref.referred_doc} · Inscrito el{' '}
                          {new Date(ref.created_at).toLocaleDateString('es-CO')}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {ref.status === 'completed' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Sí Asistió (+$
                            {ref.reward_amount.toLocaleString('es-CO')})
                          </span>
                        ) : (
                          <>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
                              <Clock className="w-3.5 h-3.5" /> Pendiente de asistir
                            </span>
                            <button
                              onClick={() => {
                                setSelectedAmbassadorDetail(null);
                                setConfirmingReferral(ref);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 cursor-pointer"
                            >
                              Confirmar Asistencia
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================
          MODAL 2: CONFIRMAR PRIMERA ASISTENCIA DE UN REFERIDO PENDIENTE
          ====================================================================== */}
      {confirmingReferral && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-gray-100 space-y-5">
            <div>
              <h3 className="text-lg font-extrabold text-gray-900">
                Confirmar 1er Tratamiento y Aplicar Descuento
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Al confirmar que el paciente referido asistió a realizarse su tratamiento:
              </p>
            </div>

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs space-y-2 text-emerald-950">
              <div className="flex items-center justify-between">
                <span className="text-emerald-700">Paciente Referido:</span>
                <span className="font-extrabold">
                  {confirmingReferral.referred_name} (CC: {confirmingReferral.referred_doc})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-emerald-700">Descuento a aplicar hoy:</span>
                <span className="font-black text-sm text-emerald-700">
                  -${confirmingReferral.discount_amount.toLocaleString('es-CO')} COP
                </span>
              </div>
              <div className="border-t border-emerald-200/80 pt-2 flex items-center justify-between">
                <span className="text-emerald-700">Bonificación para quien refirió:</span>
                <span className="font-black text-sm text-amber-700">
                  +${confirmingReferral.reward_amount.toLocaleString('es-CO')} COP (
                  {confirmingReferral.referrer_name || confirmingReferral.referrer_doc})
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Tratamiento que se realiza (Opcional)
              </label>
              <input
                type="text"
                value={confirmTreatmentInput}
                onChange={(e) => setConfirmTreatmentInput(e.target.value)}
                placeholder="Ej. Consulta Médica Integral / Ozonoterapia"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmingReferral(null)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmReferralAttendance}
                disabled={isConfirmingAttendance}
                className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-extrabold text-xs hover:bg-emerald-700 shadow-md shadow-emerald-200 disabled:opacity-50 cursor-pointer"
              >
                {isConfirmingAttendance
                  ? 'Procesando...'
                  : 'Confirmar Asistencia y Bonificar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================
          MODAL 3: REDIMIR SALDO DE RECOMPENSAS DE UN EMBAJADOR
          ====================================================================== */}
      {selectedWalletToRedeem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-gray-100 space-y-5">
            <div>
              <h3 className="text-lg font-extrabold text-gray-800">
                Redimir Saldo de Recompensas
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Descuenta el saldo ganado por este embajador cuando se realice un tratamiento en la clínica.
              </p>
            </div>

            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs space-y-1">
              <p className="font-bold text-amber-950">{selectedWalletToRedeem.full_name}</p>
              <p className="text-amber-700 font-mono">
                Cédula: {selectedWalletToRedeem.doc_id} · Código:{' '}
                {selectedWalletToRedeem.referral_code}
              </p>
              <p className="text-xs text-amber-800">
                Personas referidas que asistieron: <strong>{selectedWalletToRedeem.totalAsistieron}</strong>
              </p>
              <p className="text-base font-black text-amber-900 pt-1">
                Saldo Disponible: ${selectedWalletToRedeem.balance.toLocaleString('es-CO')} COP
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Monto a Redimir en su Tratamiento ($ COP)
              </label>
              <input
                type="number"
                step="1000"
                min="1000"
                max={selectedWalletToRedeem.balance}
                value={redeemAmount}
                onChange={(e) => setRedeemAmount(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 font-bold text-base text-gray-800 focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Nota o Tratamiento (Opcional)
              </label>
              <input
                type="text"
                value={redeemTreatmentNote}
                onChange={(e) => setRedeemTreatmentNote(e.target.value)}
                placeholder="Ej. Abono a Sueroterapia"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-800 focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedWalletToRedeem(null)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRedeemWallet}
                disabled={isRedeeming || redeemAmount <= 0}
                className="flex-1 py-3 rounded-xl bg-amber-600 text-white font-extrabold text-xs hover:bg-amber-700 shadow-md shadow-amber-200 disabled:opacity-50 cursor-pointer"
              >
                {isRedeeming ? 'Redimiendo...' : 'Confirmar Redención de Saldo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
