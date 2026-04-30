'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/shared/lib/supabase/client';
import { User, Gift, Copy, Check, LogOut } from 'lucide-react';
import Link from 'next/link';

export default function PacientesPortal() {
  const [isMounted, setIsMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [cedula, setCedula] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [patientCode, setPatientCode] = useState('');
  const [patientName, setPatientName] = useState('');
  
  // Registration state
  const [viewMode, setViewMode] = useState<'login' | 'register'>('login');
  const [registerName, setRegisterName] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Dashboard state
  const [referralsCount, setReferralsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const auth = sessionStorage.getItem('paciente_auth');
    const savedCedula = sessionStorage.getItem('paciente_cedula');
    if (auth === 'true' && savedCedula) {
      setIsAuthenticated(true);
      setCedula(savedCedula);
      fetchReferrals(savedCedula);
    }
  }, []);

  const fetchReferrals = async (userCedula: string) => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      
      // Fetch completed referrals count
      const { count, error } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_doc', userCedula)
        .eq('status', 'completed');
        
      if (error) throw error;
      setReferralsCount(count || 0);
      
      // Fetch patient directory info
      const { data: patientData, error: patientError } = await supabase
        .from('patients_directory')
        .select('full_name, referral_code')
        .eq('doc_id', userCedula)
        .single();
        
      if (!patientError && patientData) {
        setPatientName(patientData.full_name);
        setPatientCode(patientData.referral_code);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanCedula = cedula.trim();
    const cleanPin = pin.trim();
    
    // Validación simplificada para MVP: PIN debe ser los últimos 4 dígitos de la cédula
    const expectedPin = cleanCedula.slice(-4);
    
    if (cleanCedula.length >= 4 && cleanPin === expectedPin) {
      setIsAuthenticated(true);
      sessionStorage.setItem('paciente_auth', 'true');
      sessionStorage.setItem('paciente_cedula', cleanCedula);
      setError('');
      fetchReferrals(cleanCedula);
    } else {
      setError('Credenciales incorrectas. El PIN son los últimos 4 dígitos de su cédula.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDoc = cedula.trim();
    const cleanName = registerName.trim().toUpperCase();
    
    if (cleanDoc.length < 4 || cleanName.length < 3) {
      setError('Por favor completa todos los campos correctamente.');
      return;
    }
    
    setIsRegistering(true);
    setError('');
    
    try {
      const supabase = createClient();
      
      // Remove accents and special chars for the code
      const normalizedName = cleanName.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const firstName = normalizedName.split(' ')[0].replace(/[^A-Z]/g, '');
      const referralCode = `${firstName}${cleanDoc.slice(-4)}`;
      
      const { error: insertError } = await supabase
        .from('patients_directory')
        .insert([{
          doc_id: cleanDoc,
          full_name: cleanName,
          phone: registerPhone.trim() || null,
          referral_code: referralCode
        }]);
        
      if (insertError) {
        if (insertError.code === '23505') { // Unique violation
          setError('Esta cédula ya está registrada. Por favor ingresa en la pestaña "Ya tengo cuenta".');
        } else {
          throw insertError;
        }
      } else {
        // Log them in immediately
        setIsAuthenticated(true);
        sessionStorage.setItem('paciente_auth', 'true');
        sessionStorage.setItem('paciente_cedula', cleanDoc);
        setPatientName(cleanName);
        setPatientCode(referralCode);
        fetchReferrals(cleanDoc);
      }
    } catch (err: any) {
      console.error('Error registering:', err);
      setError('Ocurrió un error al registrarse. Inténtalo de nuevo.');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCedula('');
    setPin('');
    setPatientCode('');
    setPatientName('');
    sessionStorage.removeItem('paciente_auth');
    sessionStorage.removeItem('paciente_cedula');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(patientCode || cedula);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isMounted) return null;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4" style={{ fontFamily: 'var(--font-manrope, sans-serif)' }}>
        <Link href="/" className="absolute top-6 left-6 text-blue-600 font-semibold hover:underline">
          &larr; Volver
        </Link>
        <div className="bg-white p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full max-w-md border border-gray-100">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
              <User className="w-8 h-8 text-blue-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Portal de Pacientes</h1>
            <p className="text-gray-500 text-sm mt-2">Únete o ingresa para ver tus beneficios</p>
          </div>

          <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
            <button 
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${viewMode === 'login' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => { setViewMode('login'); setError(''); }}
            >
              Ya tengo cuenta
            </button>
            <button 
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${viewMode === 'register' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => { setViewMode('register'); setError(''); }}
            >
              Crear Cuenta
            </button>
          </div>

          {viewMode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Número de Cédula</label>
                <input
                  type="text"
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  placeholder="Ej. 12345678"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">PIN (Últimos 4 dígitos)</label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  placeholder="••••"
                  required
                />
              </div>

              {error && (
                <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded-lg">{error}</p>
              )}

              <button
                type="submit"
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-[0.98]"
              >
                Ingresar
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombres y Apellidos</label>
                <input
                  type="text"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  placeholder="Ej. Maria Perez"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Número de Cédula</label>
                <input
                  type="text"
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  placeholder="Ej. 12345678"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Celular (Opcional)</label>
                <input
                  type="tel"
                  value={registerPhone}
                  onChange={(e) => setRegisterPhone(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  placeholder="Ej. 3001234567"
                />
              </div>

              {error && (
                <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded-lg">{error}</p>
              )}

              <button
                type="submit"
                disabled={isRegistering}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-[0.98]"
              >
                {isRegistering ? 'Ingresando...' : 'Ingresar'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  const goal = 2;
  const progress = Math.min((referralsCount / goal) * 100, 100);

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 sm:p-6 md:p-8" style={{ fontFamily: 'var(--font-manrope, sans-serif)' }}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Bienvenido/a</p>
              <p className="font-bold text-gray-800">{patientName || `Paciente ${cedula.slice(-4)}`}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Cerrar sesión">
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {/* Share Code Card */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-blue-900/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
          
          <div className="relative z-10 text-center space-y-4">
            <h2 className="text-xl md:text-2xl font-bold">Tu Código de Referido</h2>
            <p className="text-blue-100 text-sm max-w-md mx-auto">
              Comparte este código con tus amigos. Cuando asistan a su primera cita, ganarás puntos para una sesión gratis.
            </p>
            
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <div className="bg-white/20 backdrop-blur-md px-8 py-4 rounded-2xl border border-white/30 font-mono text-3xl font-bold tracking-widest">
                {patientCode || cedula}
              </div>
              <button 
                onClick={copyToClipboard}
                className="flex items-center gap-2 px-6 py-4 bg-white text-blue-600 font-bold rounded-2xl hover:scale-105 transition-transform shadow-lg"
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>
        </div>

        {/* Progress Card */}
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
              <Gift className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">Tus Recompensas</h3>
              <p className="text-gray-500 text-sm">Amigos que han asistido: <span className="font-bold text-emerald-600">{referralsCount}</span></p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-sm font-medium text-gray-600">
              <span>Progreso para sesión gratis</span>
              <span>{referralsCount} / {goal}</span>
            </div>
            <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-1000"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            {referralsCount >= goal && (
              <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm text-center font-semibold animate-pulse">
                ¡Felicidades! Has desbloqueado una sesión de cortesía. Muestra este mensaje en recepción.
              </div>
            )}
            {referralsCount < goal && (
              <p className="text-center text-xs text-gray-400 mt-2">
                Te {goal - referralsCount === 1 ? 'falta' : 'faltan'} {goal - referralsCount} {goal - referralsCount === 1 ? 'amigo' : 'amigos'} más
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
