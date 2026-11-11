'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/shared/lib/supabase/client';
import { buildUniqueReferralCode, fetchAllPatientsDirectory } from '@/features/data-parser/reportes';
import {
  User,
  Gift,
  Copy,
  Check,
  LogOut,
  Wallet,
  Users,
  CheckCircle2,
  Clock,
  Share2,
  Sparkles,
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  UserPlus,
  BadgeDollarSign,
} from 'lucide-react';
import Link from 'next/link';

type ReferredPersonItem = {
  id: string;
  referred_doc: string;
  referred_name: string;
  status: 'pending' | 'completed' | 'cancelled';
  referrer_reward_status?: 'pending' | 'available' | 'redeemed';
  reward_amount: number;
  discount_amount: number;
  treatment_name?: string;
  created_at: string;
};

type MyWelcomeReferral = {
  id: string;
  referrer_doc: string;
  referrer_name: string;
  discount_amount: number;
  status: 'pending' | 'completed' | 'cancelled';
  treatment_name?: string;
  notes?: string;
  created_at: string;
};

export default function PacientesPortal() {
  const [isMounted, setIsMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Modo de acceso inicial: 'create_or_login' (Soy paciente / Crear código / Ver mi cuenta) o 'register_referred' (Recibí un código)
  const [viewMode, setViewMode] = useState<'create_or_login' | 'register_referred'>('create_or_login');

  // Campos formulario
  const [fullNameInput, setFullNameInput] = useState('');
  const [cedulaInput, setCedulaInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [referrerCodeInput, setReferrerCodeInput] = useState('');
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado del paciente autenticado
  const [cedula, setCedula] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientCode, setPatientCode] = useState<string | null>(null);
  const [isInClinicDatabase, setIsInClinicDatabase] = useState(false);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);

  // Configuración de campaña vigente
  const [campaignReward, setCampaignReward] = useState(15000);
  const [campaignDiscount, setCampaignDiscount] = useState(15000);
  const [campaignName, setCampaignName] = useState('Campaña General Holística');

  // Billetera y referidos hechos por mí (Embajador)
  const [myReferrals, setMyReferrals] = useState<ReferredPersonItem[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletTotalEarned, setWalletTotalEarned] = useState(0);
  const [walletTotalRedeemed, setWalletTotalRedeemed] = useState(0);

  // Si yo me registré usando el código de otra persona
  const [myWelcomeBenefit, setMyWelcomeBenefit] = useState<MyWelcomeReferral | null>(null);

  // Copiado
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

  const cleanDocId = (raw: string) =>
    raw.trim().replace(/\s+/g, '').replace(/[.,\-]/g, '').toUpperCase();

  const cleanPersonName = (raw?: string | null) =>
    (raw || '').replace(/\bnull\b/gi, '').replace(/\s+/g, ' ').trim();

  useEffect(() => {
    setIsMounted(true);

    // Detectar si viene con ?code=XXXX en la URL
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const codeFromUrl = params.get('code');
      if (codeFromUrl) {
        setReferrerCodeInput(codeFromUrl.trim().toUpperCase());
        setViewMode('register_referred');
      }
    }

    const savedAuth = sessionStorage.getItem('paciente_auth');
    const savedCedula = sessionStorage.getItem('paciente_cedula');
    const savedName = sessionStorage.getItem('paciente_nombre');

    if (savedAuth === 'true' && savedCedula) {
      setIsAuthenticated(true);
      setCedula(savedCedula);
      const cleaned = cleanPersonName(savedName);
      if (cleaned) setPatientName(cleaned);
      loadPatientPortalData(savedCedula, cleaned);
    } else {
      loadCampaignSettingsOnly();
    }
  }, []);

  const loadCampaignSettingsOnly = async () => {
    try {
      const supabase = createClient();
      const { data: settingsData } = await supabase
        .from('referral_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (settingsData) {
        setCampaignReward(Number(settingsData.referrer_reward) || 15000);
        setCampaignDiscount(Number(settingsData.referred_discount) || 15000);
        setCampaignName(settingsData.campaign_name || 'Campaña General Holística');
      }
    } catch (err) {
      console.error('Error cargando configuración:', err);
    }
  };

  const loadPatientPortalData = async (userDoc: string, fallbackName: string = '') => {
    setIsLoadingDashboard(true);
    try {
      const supabase = createClient();

      // 1. Configuración de campaña
      const { data: settingsData } = await supabase
        .from('referral_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      const currentReward = Number(settingsData?.referrer_reward) || 15000;
      const currentDiscount = Number(settingsData?.referred_discount) || 15000;
      if (settingsData) {
        setCampaignReward(currentReward);
        setCampaignDiscount(currentDiscount);
        setCampaignName(settingsData.campaign_name || 'Campaña General Holística');
      }

      // 2. Verificar si el paciente está en la Base de Datos Maestra (patients_directory)
      const { data: dirPatient } = await supabase
        .from('patients_directory')
        .select('*')
        .eq('doc_id', userDoc)
        .maybeSingle();

      if (dirPatient) {
        setIsInClinicDatabase(true);
        const resolvedName = cleanPersonName(dirPatient.full_name) || cleanPersonName(fallbackName);
        setPatientName(resolvedName);
        sessionStorage.setItem('paciente_nombre', resolvedName);
        setPatientCode(dirPatient.referral_code || null);
      } else {
        setIsInClinicDatabase(false);
        setPatientCode(null);
      }

      // 3. Consultar si esta persona fue referida por alguien (beneficio de bienvenida)
      const { data: welcomeRef } = await supabase
        .from('referrals')
        .select('*')
        .eq('referred_doc', userDoc)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (welcomeRef) {
        setMyWelcomeBenefit({
          id: welcomeRef.id,
          referrer_doc: welcomeRef.referrer_doc,
          referrer_name: cleanPersonName(welcomeRef.referrer_name) || `Paciente ${welcomeRef.referrer_doc}`,
          discount_amount: Number(welcomeRef.discount_amount) || currentDiscount,
          status: welcomeRef.status,
          treatment_name: welcomeRef.treatment_name,
          notes: welcomeRef.notes,
          created_at: welcomeRef.created_at,
        });
        if (!dirPatient && welcomeRef.referred_name) {
          setPatientName(cleanPersonName(welcomeRef.referred_name));
        }
      } else {
        setMyWelcomeBenefit(null);
      }

      // 4. Consultar todas las personas que se han inscrito con mi código (donde yo soy referrer_doc)
      const { data: referredByMe } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_doc', userDoc)
        .order('created_at', { ascending: false });

      const mappedReferrals: ReferredPersonItem[] = (referredByMe || []).map((r) => ({
        id: r.id,
        referred_doc: r.referred_doc,
        referred_name: r.referred_name || `Paciente ${r.referred_doc}`,
        status: r.status,
        referrer_reward_status:
          r.status !== 'completed'
            ? 'pending'
            : r.referrer_reward_status === 'redeemed'
            ? 'redeemed'
            : 'available',
        reward_amount: Number(r.reward_amount) || currentReward,
        discount_amount: Number(r.discount_amount) || currentDiscount,
        treatment_name: r.treatment_name,
        created_at: r.created_at,
      }));
      setMyReferrals(mappedReferrals);

      // 5. Calcular mi saldo de embajador por los que sí han asistido y canjeado en Caja
      const completedReferrals = mappedReferrals.filter((r) => r.status === 'completed');
      const availableReferrals = completedReferrals.filter((r) => r.referrer_reward_status !== 'redeemed');
      const redeemedReferrals = completedReferrals.filter((r) => r.referrer_reward_status === 'redeemed');

      const calculatedEarned = completedReferrals.reduce((acc, r) => acc + r.reward_amount, 0);
      const calculatedAvailable = availableReferrals.reduce((acc, r) => acc + r.reward_amount, 0);
      const calculatedRedeemed = redeemedReferrals.reduce((acc, r) => acc + r.reward_amount, 0);

      setWalletTotalEarned(calculatedEarned);
      setWalletTotalRedeemed(calculatedRedeemed);
      setWalletBalance(calculatedAvailable);
    } catch (err) {
      console.error('Error cargando datos del portal:', err);
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  /**
   * OPCIÓN 1: Paciente ingresa su Nombre y Cédula para crear su código de referido
   * (validando que ya esté en la base de datos de pacientes subida en Excel)
   * o para consultar su estado y saldo actual.
   */
  const handleCreateCodeOrLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessNotice('');

    const cleanDoc = cleanDocId(cedulaInput);
    const cleanName = fullNameInput.trim().toUpperCase();

    if (cleanDoc.length < 4 || cleanName.length < 3) {
      setError('Por favor ingresa tu nombre completo y un número de cédula válido.');
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();

      // 1. Verificar si la cédula existe en la base de datos de pacientes de la clínica (patients_directory)
      const { data: existingPatient, error: patErr } = await supabase
        .from('patients_directory')
        .select('*')
        .eq('doc_id', cleanDoc)
        .maybeSingle();

      if (patErr) throw patErr;

      if (existingPatient) {
        // ¡El paciente SÍ está en la base de datos subida por la clínica!
        let finalCode = existingPatient.referral_code;

        if (!finalCode) {
          // Crear su código de referido único ahora mismo
          const allPatients = await fetchAllPatientsDirectory();
          const existingCodesSet = new Set<string>();
          allPatients.forEach((p) => {
            if (p.referral_code) existingCodesSet.add(String(p.referral_code).toUpperCase());
          });

          finalCode = buildUniqueReferralCode(existingPatient.full_name || cleanName, cleanDoc, existingCodesSet);

          const { error: updateErr } = await supabase
            .from('patients_directory')
            .update({
              referral_code: finalCode,
              updated_at: new Date().toISOString(),
            })
            .eq('doc_id', cleanDoc);

          if (updateErr) throw updateErr;

          // Asegurar registro en billetera de embajadores
          const { data: existingWallet } = await supabase
            .from('ambassador_wallets')
            .select('doc_id')
            .eq('doc_id', cleanDoc)
            .maybeSingle();

          if (!existingWallet) {
            await supabase.from('ambassador_wallets').insert([
              {
                doc_id: cleanDoc,
                full_name: existingPatient.full_name || cleanName,
                phone: existingPatient.phone || null,
                total_earned: 0,
                total_redeemed: 0,
                balance: 0,
              },
            ]);
          }

          setSuccessNotice(`¡Validación exitosa! Tu cédula coincide con nuestra base de datos de pacientes y hemos creado tu código: ${finalCode}`);
        }

        // Autenticar en el portal
        const resolvedPatientName = cleanPersonName(existingPatient.full_name) || cleanPersonName(cleanName);
        sessionStorage.setItem('paciente_auth', 'true');
        sessionStorage.setItem('paciente_cedula', cleanDoc);
        sessionStorage.setItem('paciente_nombre', resolvedPatientName);
        setCedula(cleanDoc);
        setPatientName(resolvedPatientName);
        setIsAuthenticated(true);
        await loadPatientPortalData(cleanDoc, resolvedPatientName);
        return;
      }

      // 2. Si NO está en patients_directory, revisar si es un paciente referido que ya se inscribió con un código
      const { data: referredRecord } = await supabase
        .from('referrals')
        .select('*')
        .eq('referred_doc', cleanDoc)
        .maybeSingle();

      if (referredRecord) {
        const resolvedRefName = cleanPersonName(referredRecord.referred_name) || cleanPersonName(cleanName);
        sessionStorage.setItem('paciente_auth', 'true');
        sessionStorage.setItem('paciente_cedula', cleanDoc);
        sessionStorage.setItem('paciente_nombre', resolvedRefName);
        setCedula(cleanDoc);
        setPatientName(resolvedRefName);
        setIsAuthenticated(true);
        await loadPatientPortalData(cleanDoc, resolvedRefName);
        return;
      }

      // 3. No está en la base de datos de pacientes ni inscrito con código de referido
      setError(
        'Tu número de cédula aún no se encuentra en la base de datos de pacientes de Holística. Para poder crear tu propio código de referido debes ser paciente registrado en nuestra base de datos. Si alguien te compartió un código de invitación, entra en la pestaña "Tengo un Código de Referido".'
      );
    } catch (err: any) {
      console.error('Error al validar paciente:', err);
      setError('Ocurrió un error al verificar tus datos. Por favor intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * OPCIÓN 2: Persona que recibe un código de referido entra y se registra con dicho código.
   * Visualiza que ya tiene un saldo a favor para redimir cuando asista por primera vez a realizarse un tratamiento.
   */
  const handleRegisterWithReferralCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessNotice('');

    const cleanDoc = cleanDocId(cedulaInput);
    const cleanName = fullNameInput.trim().toUpperCase();
    const cleanPhone = phoneInput.trim();
    const cleanCode = referrerCodeInput.trim().toUpperCase();

    if (cleanDoc.length < 4 || cleanName.length < 3) {
      setError('Por favor ingresa tu nombre completo y tu número de cédula.');
      return;
    }

    if (!cleanCode) {
      setError('Por favor ingresa el código de referido que te compartieron.');
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();

      // 1. Verificar que el código de referido exista y pertenezca a un paciente de la base de datos
      const { data: referrerPatient, error: refLookupErr } = await supabase
        .from('patients_directory')
        .select('doc_id, full_name, referral_code')
        .eq('referral_code', cleanCode)
        .maybeSingle();

      if (refLookupErr || !referrerPatient) {
        setError('El código de referido ingresado no existe o no es válido. Verifícalo con la persona que te invitó.');
        setIsSubmitting(false);
        return;
      }

      if (String(referrerPatient.doc_id).trim() === cleanDoc) {
        setError('No puedes registrarte utilizando tu propio código de referido.');
        setIsSubmitting(false);
        return;
      }

      // 2. Verificar si esta persona ya tenía un código propio creado como paciente antiguo
      const { data: alreadyPatient } = await supabase
        .from('patients_directory')
        .select('doc_id, full_name, referral_code')
        .eq('doc_id', cleanDoc)
        .maybeSingle();

      if (alreadyPatient && alreadyPatient.referral_code) {
        setError(
          'Tu cédula ya figura como paciente activo con código propio en nuestra base de datos. Ingresa por la pestaña "Crear mi Código / Mi Portal".'
        );
        setIsSubmitting(false);
        return;
      }

      // 3. Verificar si ya se había registrado previamente en referrals
      const { data: existingRef } = await supabase
        .from('referrals')
        .select('*')
        .eq('referred_doc', cleanDoc)
        .maybeSingle();

      if (!existingRef) {
        // Obtener valores actuales de la campaña
        const { data: settingsData } = await supabase
          .from('referral_settings')
          .select('referrer_reward, referred_discount')
          .eq('id', 1)
          .maybeSingle();

        const rewardAmount = Number(settingsData?.referrer_reward) || 15000;
        const discountAmount = Number(settingsData?.referred_discount) || 15000;

        const { error: insertRefErr } = await supabase.from('referrals').insert([
          {
            referrer_doc: referrerPatient.doc_id,
            referrer_name: referrerPatient.full_name,
            referred_doc: cleanDoc,
            referred_name: cleanName,
            reward_amount: rewardAmount,
            discount_amount: discountAmount,
            status: 'pending',
            treatment_name: 'Pendiente 1er Tratamiento',
            notes: `Inscrito en Portal con código ${cleanCode}${cleanPhone ? ` | Cel: ${cleanPhone}` : ''}`,
          },
        ]);

        if (insertRefErr) throw insertRefErr;
      }

      setSuccessNotice(
        `¡Te has registrado con el código ${cleanCode}! Ya tienes un saldo a favor de $${campaignDiscount.toLocaleString('es-CO')} COP para redimir en tu primer tratamiento.`
      );

      // Autenticar y mostrar su panel con su saldo a favor
      sessionStorage.setItem('paciente_auth', 'true');
      sessionStorage.setItem('paciente_cedula', cleanDoc);
      sessionStorage.setItem('paciente_nombre', cleanName);
      setCedula(cleanDoc);
      setPatientName(cleanName);
      setIsAuthenticated(true);
      await loadPatientPortalData(cleanDoc, cleanName);
    } catch (err: any) {
      console.error('Error registrando referido:', err);
      setError('Ocurrió un error al registrar tu código. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Generar código desde adentro del dashboard si el paciente está en la BD pero aún no tenía código
   */
  const handleGenerateMyCodeInside = async () => {
    if (!isInClinicDatabase || !cedula) return;
    setIsGeneratingCode(true);
    try {
      const supabase = createClient();
      const allPatients = await fetchAllPatientsDirectory();
      const existingCodesSet = new Set<string>();
      allPatients.forEach((p) => {
        if (p.referral_code) existingCodesSet.add(String(p.referral_code).toUpperCase());
      });

      const newCode = buildUniqueReferralCode(patientName || 'PACIENTE', cedula, existingCodesSet);

      const { error: updErr } = await supabase
        .from('patients_directory')
        .update({
          referral_code: newCode,
          updated_at: new Date().toISOString(),
        })
        .eq('doc_id', cedula);

      if (updErr) throw updErr;

      setPatientCode(newCode);
      setSuccessNotice(`¡Tu código de referido ${newCode} ha sido creado exitosamente!`);
    } catch (err) {
      console.error('Error creando código:', err);
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCedula('');
    setPatientName('');
    setPatientCode(null);
    setMyReferrals([]);
    setMyWelcomeBenefit(null);
    setSuccessNotice('');
    setError('');
    sessionStorage.removeItem('paciente_auth');
    sessionStorage.removeItem('paciente_cedula');
    sessionStorage.removeItem('paciente_nombre');
  };

  const copyCodeToClipboard = () => {
    if (!patientCode) return;
    navigator.clipboard.writeText(patientCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const getShareMessage = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const link = `${origin}/pacientes?code=${patientCode}`;
    return `¡Hola! Te comparto mi código de referido *${patientCode}* de *Holística Unidad de Medicina Integral*. Regístrate con mi código aquí ${link} y recibe un *saldo a favor de $${campaignDiscount.toLocaleString('es-CO')} COP* para redimir cuando asistas por primera vez a realizarte un tratamiento.`;
  };

  const copyInviteMessage = () => {
    if (!patientCode) return;
    navigator.clipboard.writeText(getShareMessage());
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 3000);
  };

  const shareViaWhatsApp = () => {
    if (!patientCode) return;
    const url = `https://wa.me/?text=${encodeURIComponent(getShareMessage())}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!isMounted) return null;

  // Contadores de mis referidos
  const totalInscritosPorMiCodigo = myReferrals.length;
  const referidosAsistieron = myReferrals.filter((r) => r.status === 'completed');
  const referidosPendientes = myReferrals.filter((r) => r.status === 'pending');

  // ============================================================================
  // VISTA 1: PANTALLA DE INGRESO / REGISTRO DE PACIENTES Y REFERIDOS
  // ============================================================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50/30 to-blue-50/40 flex flex-col justify-between p-3.5 sm:p-6">
        {/* Barra Superior */}
        <div className="max-w-5xl w-full mx-auto flex items-center justify-between py-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl bg-white border border-slate-200/80 text-slate-700 hover:text-cyan-700 hover:border-cyan-200 text-xs sm:text-sm font-bold shadow-xs transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a la Página Web</span>
          </Link>

          <img
            src="/images/logo.png"
            alt="Holística Unidad de Medicina Integral"
            className="h-9 sm:h-12 w-auto object-contain"
          />
        </div>

        {/* Contenedor Central */}
        <div className="max-w-xl w-full mx-auto my-4 sm:my-8 bg-white rounded-2xl sm:rounded-[2rem] shadow-xl shadow-slate-900/5 border border-slate-100 overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-[#0891b2] via-blue-700 to-indigo-800 p-5 sm:p-8 text-white text-center relative overflow-hidden">
            <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center mb-2.5 sm:mb-3 border border-white/25">
              <User className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight">Portal de Pacientes</h1>
            <p className="text-cyan-100 text-xs sm:text-sm mt-1.5 max-w-md mx-auto leading-relaxed">
              Crea tu código de referido si ya eres paciente de Holística, o regístrate con el código de un amigo para activar tu saldo a favor.
            </p>
          </div>

          <div className="p-4 sm:p-8 space-y-5 sm:space-y-6">
            {/* Selector de Pestañas */}
            <div className="grid grid-cols-2 bg-slate-100 p-1.5 rounded-2xl gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setViewMode('create_or_login');
                  setError('');
                }}
                className={`py-2.5 sm:py-3 px-2 sm:px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer ${
                  viewMode === 'create_or_login'
                    ? 'bg-white text-[#0891b2] shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span className="truncate">Soy Paciente</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setViewMode('register_referred');
                  setError('');
                }}
                className={`py-2.5 sm:py-3 px-2 sm:px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer ${
                  viewMode === 'register_referred'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Gift className="w-4 h-4 shrink-0" />
                <span className="truncate">Tengo Código</span>
              </button>
            </div>

            {viewMode === 'create_or_login' ? (
              <form onSubmit={handleCreateCodeOrLogin} className="space-y-4">
                <div className="p-3.5 sm:p-4 rounded-2xl bg-cyan-50/70 border border-cyan-200/70 text-xs text-cyan-950 space-y-1">
                  <p className="font-extrabold flex items-center gap-1.5 text-[#0891b2]">
                    <Sparkles className="w-4 h-4 shrink-0" />
                    ¿Cómo crear tu código para referir a alguien?
                  </p>
                  <p className="text-slate-600 leading-relaxed">
                    Ingresa tu <strong>Nombre y Número de Cédula</strong>. Si tu cédula coincide con nuestra base de datos de pacientes, podrás crear tu código de referido, compartirlo y consultar tu saldo a favor.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nombre y Apellidos *
                  </label>
                  <input
                    type="text"
                    value={fullNameInput}
                    onChange={(e) => setFullNameInput(e.target.value)}
                    placeholder="Ej. María Fernanda Gómez"
                    className="w-full px-4 py-3 sm:py-3.5 rounded-xl bg-slate-50 border border-slate-200 text-base sm:text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#0891b2] outline-none transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Número de Cédula / Documento *
                  </label>
                  <input
                    type="text"
                    value={cedulaInput}
                    onChange={(e) => setCedulaInput(e.target.value)}
                    placeholder="Ej. 31973555"
                    className="w-full px-4 py-3 sm:py-3.5 rounded-xl bg-slate-50 border border-slate-200 text-base sm:text-sm font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#0891b2] outline-none transition-all"
                    required
                  />
                </div>

                {error && (
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-[#0891b2] to-blue-600 hover:opacity-95 text-white font-extrabold text-sm shadow-lg shadow-cyan-500/20 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting
                    ? 'Verificando en Base de Datos...'
                    : 'Ingresar y Crear / Ver mi Código'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegisterWithReferralCode} className="space-y-4">
                <div className="p-3.5 sm:p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200/70 text-xs text-indigo-950 space-y-1">
                  <p className="font-extrabold flex items-center gap-1.5 text-indigo-700">
                    <Gift className="w-4 h-4 shrink-0" />
                    ¡Activa tu Saldo a Favor de ${campaignDiscount.toLocaleString('es-CO')} COP!
                  </p>
                  <p className="text-slate-600 leading-relaxed">
                    Si un paciente de Holística te compartió su código de referido, regístrate aquí. Visualizarás de inmediato tu <strong>saldo a favor de ${campaignDiscount.toLocaleString('es-CO')} COP</strong> para redimirlo cuando asistas por primera vez a realizarte un tratamiento.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Código de Referido que Recibiste *
                  </label>
                  <input
                    type="text"
                    value={referrerCodeInput}
                    onChange={(e) => setReferrerCodeInput(e.target.value.toUpperCase())}
                    placeholder="Ej. JUAN3518"
                    className="w-full px-4 py-3 sm:py-3.5 rounded-xl bg-indigo-50/60 border-2 border-indigo-300 text-base font-mono font-black text-indigo-900 tracking-wider focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all uppercase"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Tu Nombre Completo *
                    </label>
                    <input
                      type="text"
                      value={fullNameInput}
                      onChange={(e) => setFullNameInput(e.target.value)}
                      placeholder="Ej. Carlos Andrés Pérez"
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-base sm:text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Tu Número de Cédula *
                    </label>
                    <input
                      type="text"
                      value={cedulaInput}
                      onChange={(e) => setCedulaInput(e.target.value)}
                      placeholder="Ej. 1143889900"
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-base sm:text-sm font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Celular / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="Ej. 3001234567"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-base sm:text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>

                {error && (
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white font-extrabold text-sm shadow-lg shadow-indigo-500/25 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting
                    ? 'Activando tu Bono de Bienvenida...'
                    : `Activar mi Bono de Bienvenida de $${campaignDiscount.toLocaleString('es-CO')}`}
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 py-2">
          Holística Unidad de Medicina Integral · Sistema Oficial de Beneficios y Referidos
        </p>
      </div>
    );
  }

  // ============================================================================
  // VISTA 2: PANEL DEL PACIENTE (CÓDIGO, REFERIDOS INSCRITOS/ASISTIDOS Y SALDOS)
  // ============================================================================
  return (
    <div className="min-h-screen bg-[#f8fafc] px-3.5 py-4 sm:p-6 md:p-8 text-slate-800">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* BARRA SUPERIOR DE NAVEGACIÓN Y PERFIL */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-xs border border-slate-200/80">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#0891b2] to-blue-600 text-white flex items-center justify-center font-black text-base sm:text-lg shadow-sm shrink-0">
              {(cleanPersonName(patientName) || 'P')[0]}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h1 className="text-base sm:text-lg font-extrabold text-slate-900 truncate">
                  {cleanPersonName(patientName) || 'Paciente'}
                </h1>
                {isInClinicDatabase ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                    <CheckCircle2 className="w-3 h-3" /> Paciente en Base de Datos
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                    <Gift className="w-3 h-3" /> Invitado con Código
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">Documento CC: {cedula}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:flex items-center gap-1.5 sm:gap-2 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-100">
            <button
              onClick={() => loadPatientPortalData(cedula, patientName)}
              title="Actualizar información"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all active:scale-95 cursor-pointer text-center"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDashboard ? 'animate-spin text-blue-600' : ''}`} />
              <span>Actualizar</span>
            </button>

            <Link
              href="/"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all active:scale-95 text-center"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Inicio Web</span>
            </Link>

            <button
              onClick={handleLogout}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-all active:scale-95 cursor-pointer text-center"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Salir</span>
            </button>
          </div>
        </div>

        {/* NOTIFICACIÓN DE ÉXITO RECIENTE */}
        {successNotice && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-bold flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successNotice}</span>
            </div>
            <button onClick={() => setSuccessNotice('')} className="text-emerald-700 hover:text-emerald-950 text-xs cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {/* ====================================================================
            SECCIÓN A: SALDO A FAVOR DE BIENVENIDA (SI SE REGISTRÓ CON UN CÓDIGO)
            ==================================================================== */}
        {myWelcomeBenefit && myWelcomeBenefit.status !== 'completed' && (
          <div className="rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-white shadow-xl relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
              <div className="space-y-2 max-w-xl text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-[11px] sm:text-xs font-extrabold uppercase tracking-wider">
                  <Gift className="w-3.5 h-3.5" />
                  <span>Saldo a Favor por Código de Referido</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-extrabold leading-tight">
                  ¡Tienes un Saldo a Favor para tu Primera Cita Médica o Tratamiento!
                </h2>

                <p className="text-white/90 text-xs sm:text-sm leading-relaxed">
                  Te inscribiste invitado por{' '}
                  <strong>{cleanPersonName(myWelcomeBenefit.referrer_name)}</strong>. Este saldo a favor se te descontará automáticamente en recepción el día que asistas por primera vez a realizarte un tratamiento en Holística.
                </p>
              </div>

              <div className="bg-white/15 backdrop-blur-md border border-white/25 rounded-2xl p-4 sm:p-5 text-center shrink-0 w-full sm:w-auto min-w-[200px]">
                <span className="text-[11px] uppercase tracking-wider text-white/80 font-bold block">
                  Tu Saldo a Favor
                </span>
                <span className="text-3xl font-black block mt-1">
                  ${myWelcomeBenefit.discount_amount.toLocaleString('es-CO')}
                </span>
                <span className="mt-2 inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-amber-400 text-slate-950 w-full">
                  <Clock className="w-3.5 h-3.5" /> Disponible en tu 1ra Cita
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            SECCIÓN B: CÓDIGO DE REFERIDO Y BILLETERA DEL PACIENTE EMBAJADOR
            ==================================================================== */}
        {isInClinicDatabase ? (
          <>
            {/* TARJETA 1: MI CÓDIGO DE REFERIDO Y COMPARTIR */}
            <div className="bg-gradient-to-br from-[#0891b2] via-blue-700 to-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-white shadow-xl relative overflow-hidden">
              <div className="flex flex-col md:flex-row items-center justify-between gap-5 sm:gap-6 relative z-10">
                <div className="space-y-2 text-center md:text-left max-w-lg">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-cyan-200 text-[11px] sm:text-xs font-extrabold uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Programa de Embajadores Holística</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight">Tu Código de Referido</h2>
                  <p className="text-cyan-100 text-xs sm:text-sm leading-relaxed">
                    Comparte este código con familiares o amigos. Ellos recibirán{' '}
                    <strong>${campaignDiscount.toLocaleString('es-CO')} COP de saldo a favor</strong> en su primer tratamiento, y cuando asistan tú recibirás{' '}
                    <strong>+${campaignReward.toLocaleString('es-CO')} COP</strong> en tu billetera para cualquier tratamiento futuro.
                  </p>
                </div>

                {patientCode ? (
                  <div className="flex flex-col items-center gap-3 w-full md:w-auto shrink-0">
                    <div className="w-full sm:w-auto text-center bg-white/15 backdrop-blur-md border-2 border-white/30 px-6 sm:px-8 py-3 sm:py-4 rounded-2xl font-mono text-2xl sm:text-3xl font-black tracking-widest text-white shadow-inner">
                      {patientCode}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-md">
                      <button
                        onClick={copyCodeToClipboard}
                        className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white text-blue-800 hover:bg-cyan-50 font-extrabold text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer"
                      >
                        {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedCode ? '¡Código Copiado!' : 'Copiar Código'}</span>
                      </button>

                      <button
                        onClick={shareViaWhatsApp}
                        className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer"
                      >
                        <Share2 className="w-4 h-4" />
                        <span>Enviar por WhatsApp</span>
                      </button>
                    </div>

                    <button
                      onClick={copyInviteMessage}
                      className="text-xs text-cyan-200 hover:text-white underline cursor-pointer pt-0.5 text-center"
                    >
                      {copiedMsg ? '¡Mensaje completo copiado al portapapeles!' : 'Copiar mensaje con enlace de registro'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleGenerateMyCodeInside}
                    disabled={isGeneratingCode}
                    className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-white text-blue-700 font-extrabold text-sm shadow-lg hover:bg-cyan-50 transition-all active:scale-95 cursor-pointer"
                  >
                    {isGeneratingCode ? 'Generando Código...' : 'Crear mi Código de Referido Ahora'}
                  </button>
                )}
              </div>
            </div>

            {/* TARJETA 2: MI SALDO Y MÉTRICAS DE MIS REFERIDOS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
              {/* Mi Saldo Disponible por personas que sí asistieron */}
              <div className="md:col-span-1 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-white shadow-lg flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-amber-100">
                    Mi Saldo Disponible
                  </span>
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                </div>

                <div className="my-3.5 sm:my-4">
                  <p className="text-3xl sm:text-4xl font-black">${walletBalance.toLocaleString('es-CO')} COP</p>
                  <p className="text-xs text-amber-100 mt-1">
                    Por las <strong>{referidosAsistieron.length}</strong> personas referidas que ya asistieron
                  </p>
                </div>

                <div className="pt-3 border-t border-white/20 flex items-center justify-between text-[11px] sm:text-xs text-amber-50">
                  <span>Total ganado: ${walletTotalEarned.toLocaleString('es-CO')}</span>
                  <span>Redimido: ${walletTotalRedeemed.toLocaleString('es-CO')}</span>
                </div>
              </div>

              {/* Resumen de Inscritos vs Asistidos */}
              <div className="md:col-span-2 bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#0891b2]" />
                    <span>Resumen de Personas Referidas con Tu Código</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Aquí ves quiénes se han inscrito con tu código y quiénes de ellos ya asistieron por primera vez.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-3 my-3.5 sm:my-4">
                  <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200/70 text-center">
                    <span className="text-xl sm:text-2xl font-black text-slate-800 block">{totalInscritosPorMiCodigo}</span>
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 block leading-tight mt-0.5">Inscritos con mi código</span>
                  </div>

                  <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-amber-50/70 border border-amber-200/70 text-center">
                    <span className="text-xl sm:text-2xl font-black text-amber-600 block">{referidosPendientes.length}</span>
                    <span className="text-[10px] sm:text-[11px] font-bold text-amber-700 block leading-tight mt-0.5">Pendientes por asistir</span>
                  </div>

                  <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-emerald-50/80 border border-emerald-200/70 text-center">
                    <span className="text-xl sm:text-2xl font-black text-emerald-600 block">{referidosAsistieron.length}</span>
                    <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 block leading-tight mt-0.5">¡Sí Asistieron! (1ra vez)</span>
                  </div>
                </div>

                <p className="text-[11px] sm:text-xs text-slate-600 bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-100 leading-relaxed">
                  💡 <strong>¿Cómo redimir tu saldo?</strong> Tu saldo disponible puede ser redimido cuando tú lo desees en cualquier tratamiento a futuro en Holística. Solo indícalo en recepción con tu número de cédula.
                </p>
              </div>
            </div>

            {/* TARJETA 3: PERSONAS INSCRITAS CON MI CÓDIGO + BENEFICIO DE 1RA VEZ REDIMIDO */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-slate-200/80 shadow-xs space-y-4 sm:space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-slate-100 pb-3.5">
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-800 flex items-center gap-2">
                    <BadgeDollarSign className="w-5 h-5 text-blue-600 shrink-0" />
                    <span>
                      Personas Inscritas con Mi Código y Beneficios (
                      {myReferrals.length +
                        (myWelcomeBenefit?.status === 'completed' ? 1 : 0)}
                      )
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Seguimiento en tiempo real de tus amigos inscritos con tu código y el registro del beneficio de bienvenida que redimiste en tu primer tratamiento.
                  </p>
                </div>
              </div>

              {myReferrals.length === 0 &&
              myWelcomeBenefit?.status !== 'completed' ? (
                <div className="text-center py-8 sm:py-10 px-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 space-y-2">
                  <UserPlus className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">
                    Aún nadie se ha inscrito con tu código {patientCode}
                  </p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Comparte tu código por WhatsApp con tus amigos o familiares. Apenas se registren con tu código, aparecerán en esta lista.
                  </p>
                </div>
              ) : (
                <>
                  {/* VISTA MÓVIL (TARJETAS INDIVIDUALES COMPACTAS Y ELEGANTES) */}
                  <div className="block md:hidden space-y-3">
                    {/* ÍTEM 1: REFERIDOS HECHOS POR MÍ */}
                    {myReferrals.map((ref) => (
                      <div
                        key={ref.id}
                        className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-extrabold text-sm text-slate-900 leading-tight">
                              {cleanPersonName(ref.referred_name)}
                            </p>
                            <p className="text-xs text-slate-500 font-mono mt-0.5">
                              CC: {ref.referred_doc}
                            </p>
                          </div>
                          <span className="text-[11px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-lg shrink-0">
                            {new Date(ref.created_at).toLocaleDateString('es-CO')}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                          <div>
                            {ref.status === 'completed' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100/90 text-emerald-800 text-[11px] font-extrabold">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Sí Asistió (El Referido)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100/90 text-amber-800 text-[11px] font-extrabold">
                                <Clock className="w-3.5 h-3.5 shrink-0" /> Pendiente 1ra Cita
                              </span>
                            )}
                          </div>

                          <div className="text-right">
                            {ref.status === 'completed' ? (
                              ref.referrer_reward_status === 'redeemed' ? (
                                <div>
                                  <span className="font-black text-purple-600 text-xs sm:text-sm">
                                    ${ref.reward_amount.toLocaleString('es-CO')} COP
                                  </span>
                                  <span className="block text-[10px] text-purple-600 font-bold">
                                    Redimido en Caja
                                  </span>
                                </div>
                              ) : (
                                <div>
                                  <span className="font-black text-emerald-600 text-xs sm:text-sm">
                                    +${ref.reward_amount.toLocaleString('es-CO')} COP
                                  </span>
                                  <span className="block text-[10px] text-emerald-600 font-bold">
                                    ¡Disponible en Caja!
                                  </span>
                                </div>
                              )
                            ) : (
                              <div>
                                <span className="font-bold text-slate-400 text-xs sm:text-sm">
                                  +${ref.reward_amount.toLocaleString('es-CO')} COP
                                </span>
                                <span className="block text-[10px] text-amber-600 font-semibold">
                                  Al asistir a 1ra cita
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* ÍTEM 2: BENEFICIO DE 1RA VEZ REDIMIDO EN MÓVIL */}
                    {myWelcomeBenefit && myWelcomeBenefit.status === 'completed' && (
                      <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-extrabold text-sm text-slate-900 leading-tight">
                              {cleanPersonName(myWelcomeBenefit.referrer_name)}
                            </p>
                            <p className="text-xs text-slate-500 font-mono mt-0.5">
                              CC: {myWelcomeBenefit.referrer_doc}
                            </p>
                          </div>
                          <span className="text-[11px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-lg shrink-0">
                            {new Date(myWelcomeBenefit.created_at).toLocaleDateString('es-CO')}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-indigo-100/80 flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100/90 text-emerald-800 text-[11px] font-extrabold">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Sí Asistió (por 1ra Vez)
                          </span>

                          <div className="text-right">
                            <span className="font-black text-purple-600 text-xs sm:text-sm">
                              ${myWelcomeBenefit.discount_amount.toLocaleString('es-CO')} COP
                            </span>
                            <span className="block text-[10px] text-purple-600 font-bold">
                              Bono ya redimido en Caja
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* VISTA ESCRITORIO / TABLETS (TABLA COMPLETA TRADICIONAL) */}
                  <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-100">
                    <table className="w-full text-left text-xs sm:text-sm text-slate-600">
                      <thead className="text-[11px] uppercase bg-slate-50 text-slate-500 font-extrabold border-b border-slate-100">
                        <tr>
                          <th className="px-4 py-3.5">Persona Referida</th>
                          <th className="px-4 py-3.5">Fecha Inscripción</th>
                          <th className="px-4 py-3.5 text-center">Estado de Asistencia (1ra Vez)</th>
                          <th className="px-4 py-3.5 text-right">Tu Bonificación</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {/* ÍTEM 1: PERSONAS INSCRITAS CON MI CÓDIGO */}
                        {myReferrals.map((ref) => (
                          <tr key={ref.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-4 py-4">
                              <p className="font-extrabold text-slate-800">
                                {cleanPersonName(ref.referred_name)}
                              </p>
                              <p className="text-[11px] text-slate-400 font-mono">CC: {ref.referred_doc}</p>
                            </td>
                            <td className="px-4 py-4 text-xs text-slate-500">
                              {new Date(ref.created_at).toLocaleDateString('es-CO')}
                            </td>
                            <td className="px-4 py-4 text-center">
                              {ref.status === 'completed' ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-extrabold">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Sí Asistió (El Referido)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-extrabold">
                                  <Clock className="w-3.5 h-3.5" /> Inscrito · Pendiente 1ra Cita
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-right">
                              {ref.status === 'completed' ? (
                                ref.referrer_reward_status === 'redeemed' ? (
                                  <div>
                                    <span className="font-black text-purple-600 text-sm">
                                      ${ref.reward_amount.toLocaleString('es-CO')} COP
                                    </span>
                                    <span className="block text-[10px] text-purple-600 font-semibold">
                                      Bono ya redimido en Caja
                                    </span>
                                  </div>
                                ) : (
                                  <div>
                                    <span className="font-black text-emerald-600 text-sm">
                                      +${ref.reward_amount.toLocaleString('es-CO')} COP
                                    </span>
                                    <span className="block text-[10px] text-emerald-600 font-semibold">
                                      ¡Disponible para redimir en Caja!
                                    </span>
                                  </div>
                                )
                              ) : (
                                <div>
                                  <span className="font-bold text-slate-400 text-sm">
                                    +${ref.reward_amount.toLocaleString('es-CO')} COP
                                  </span>
                                  <span className="block text-[10px] text-amber-600 font-semibold">
                                    Se activa cuando canjee su 1ra cita en Caja
                                  </span>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}

                        {/* ÍTEM 2: BENEFICIO DE 1RA VEZ REDIMIDO */}
                        {myWelcomeBenefit && myWelcomeBenefit.status === 'completed' && (
                          <tr className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-4 py-4">
                              <p className="font-extrabold text-slate-800">
                                {cleanPersonName(myWelcomeBenefit.referrer_name)}
                              </p>
                              <p className="text-[11px] text-slate-400 font-mono">
                                CC: {myWelcomeBenefit.referrer_doc}
                              </p>
                            </td>
                            <td className="px-4 py-4 text-xs text-slate-500">
                              {new Date(myWelcomeBenefit.created_at).toLocaleDateString('es-CO')}
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-extrabold">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Sí Asistió (por 1ra Vez)
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <div>
                                <span className="font-black text-purple-600 text-sm">
                                  ${myWelcomeBenefit.discount_amount.toLocaleString('es-CO')} COP
                                </span>
                                <span className="block text-[10px] text-purple-600 font-semibold">
                                  Bono ya redimido en Caja
                                </span>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          /* Si es una persona nueva que se registró con código de referido y aún no está en la BD de pacientes */
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-cyan-50 text-[#0891b2] flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-800">
                  ¿Quieres crear tu propio código para referir amigos?
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Para poder crear tu código de referido y ganar bonificaciones invitando a otras personas, primero debes{' '}
                  <strong>asistir por primera vez a realizarte tu tratamiento en Holística</strong> (donde además redimirás tu saldo a favor de bienvenida). Una vez tu atención quede registrada en nuestra base de datos de pacientes, podrás crear tu propio código aquí mismo.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

