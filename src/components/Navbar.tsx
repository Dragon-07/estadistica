"use client";
import { motion } from 'motion/react';
import { Menu, X, Activity, User, ShieldCheck, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Inicio', href: '#' },
    { name: 'Nosotros', href: '#nosotros' },
    { name: 'Tratamientos', href: '#servicios' },
    { name: 'Solicitar Cita', href: '#cita' },
  ];

  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 ${
      scrolled 
        ? 'bg-white/95 backdrop-blur-xl py-2.5 sm:py-3 shadow-xl shadow-slate-900/5 border-b border-slate-200/60' 
        : 'bg-white/80 backdrop-blur-md sm:bg-transparent py-3 sm:py-4 border-b border-slate-200/40 sm:border-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center gap-4">
          
          {/* Logo Corporativo */}
          <Link href="/" className="flex items-center gap-3 cursor-pointer group flex-shrink-0">
            <div className="relative flex items-center justify-center">
              <img 
                src="/images/logo.png" 
                alt="Holística - Unidad de Medicina Integral" 
                className="h-10 sm:h-12 lg:h-14 w-auto object-contain transform group-hover:scale-105 transition-all duration-300 drop-shadow-sm" 
              />
            </div>
          </Link>

          {/* Enlaces de Navegación (Desktop) */}
          <div className="hidden xl:flex items-center gap-8">
            {navLinks.map((link, i) => (
              <motion.a
                key={link.name}
                href={link.href}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="text-[13px] font-bold text-slate-700 hover:text-holistica-blue transition-colors relative group uppercase tracking-wider"
              >
                {link.name}
                <span className="absolute -bottom-1.5 left-0 w-0 h-0.5 bg-holistica-cyan transition-all duration-300 group-hover:w-full" />
              </motion.a>
            ))}
          </div>

          {/* BOTONES DE LOGUEO / ACCESO A LA DERECHA (DESKTOP) */}
          <div className="hidden sm:flex items-center gap-2.5 flex-shrink-0">
            {/* Opción 1: Portal de Pacientes */}
            <Link
              href="/pacientes"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-[#0891b2] bg-cyan-50/80 hover:bg-cyan-100/90 border border-cyan-200/80 shadow-xs hover:shadow-md hover:shadow-cyan-500/10 active:scale-95 transition-all"
              title="Portal de Pacientes: Consulta beneficios y comparte con tus amigos"
            >
              <span className="w-6 h-6 rounded-lg bg-cyan-500/15 flex items-center justify-center text-[#0891b2]">
                <User className="w-3.5 h-3.5" />
              </span>
              <span>Portal Pacientes</span>
            </Link>

            {/* Opción 2: Acceso Administrativo */}
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-800 hover:text-white border border-slate-200/90 shadow-xs hover:shadow-md hover:shadow-slate-900/10 active:scale-95 transition-all"
              title="Acceso Administrativo: Gestión interna, facturación y reportes"
            >
              <span className="w-6 h-6 rounded-lg bg-slate-200/80 group-hover:bg-slate-700 flex items-center justify-center text-slate-700 group-hover:text-white transition-colors">
                <ShieldCheck className="w-3.5 h-3.5" />
              </span>
              <span>Acceso Administrativo</span>
            </Link>
          </div>

          {/* Botón de Menú Móvil */}
          <div className="xl:hidden flex items-center gap-2">
            <button 
              onClick={() => setIsOpen(!isOpen)} 
              aria-label={isOpen ? "Cerrar menú" : "Abrir menú de navegación"}
              className="p-2.5 rounded-xl bg-white text-slate-800 border border-slate-200/90 shadow-sm hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
            >
              {isOpen ? <X className="w-5 h-5 text-slate-800" /> : <Menu className="w-5 h-5 text-slate-800" />}
            </button>
          </div>

        </div>
      </div>

      {/* Menú Móvil Desplegable */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="xl:hidden bg-white/98 backdrop-blur-2xl border-t border-b border-slate-200/90 shadow-2xl"
        >
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-3">
            
            {/* Accesos Rápidos Móviles a los Dos Portales */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/70 space-y-2">
              <p className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider px-1">
                Accesos a la Plataforma
              </p>
              
              <Link 
                href="/pacientes"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white border border-cyan-200/80 shadow-xs active:scale-98 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-cyan-50 flex items-center justify-center text-[#0891b2]">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-900 leading-tight">Portal de Pacientes</p>
                    <p className="text-[11px] text-slate-500">Beneficios y sistema de referidos</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#0891b2]" />
              </Link>

              <Link 
                href="/admin"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-900 text-white shadow-xs active:scale-98 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-emerald-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-white leading-tight">Acceso Administrativo</p>
                    <p className="text-[11px] text-slate-300">Gestión interna, cuentas y estadísticas</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-400" />
              </Link>
            </div>

            {/* Enlaces tradicionales de la web */}
            <div className="flex flex-col gap-1 pt-1">
              {navLinks.map((link) => (
                <a 
                  key={link.name} 
                  href={link.href} 
                  onClick={() => setIsOpen(false)}
                  className="text-sm font-bold text-slate-800 px-4 py-2.5 hover:bg-slate-50 active:bg-cyan-50/60 rounded-xl flex justify-between items-center transition-colors"
                >
                  <span>{link.name}</span>
                  <Activity className="w-4 h-4 text-cyan-600 opacity-60" />
                </a>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100">
              <a
                href="#cita"
                onClick={() => setIsOpen(false)}
                className="w-full bg-holistica-orange text-white py-3 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-holistica-orange/20 active:scale-98 transition-all"
              >
                Solicitar Cita o Cotización
              </a>
            </div>
          </div>
        </motion.div>
      )}
    </nav>
  );
};

export default Navbar;
