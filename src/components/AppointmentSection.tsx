"use client";
import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calendar, Clock, MapPin, Globe, Phone, CheckCircle, Send, Sparkles, ChevronDown, Check } from 'lucide-react';

const COUNTRY_CODES = [
  { code: '+57', country: 'Colombia', iso: 'co', placeholder: '300 123 4567' },
  { code: '+1', country: 'Estados Unidos', iso: 'us', placeholder: '(555) 123-4567' },
  { code: '+1', country: 'Canadá', iso: 'ca', placeholder: '(555) 123-4567' },
  { code: '+507', country: 'Panamá', iso: 'pa', placeholder: '6000 0000' },
  { code: '+593', country: 'Ecuador', iso: 'ec', placeholder: '099 123 4567' },
  { code: '+51', country: 'Perú', iso: 'pe', placeholder: '912 345 678' },
  { code: '+58', country: 'Venezuela', iso: 've', placeholder: '412 123 4567' },
  { code: '+506', country: 'Costa Rica', iso: 'cr', placeholder: '8000 0000' },
  { code: '+52', country: 'México', iso: 'mx', placeholder: '55 1234 5678' },
  { code: '+34', country: 'España', iso: 'es', placeholder: '612 345 678' },
  { code: '+56', country: 'Chile', iso: 'cl', placeholder: '9 1234 5678' },
  { code: '+54', country: 'Argentina', iso: 'ar', placeholder: '11 1234-5678' },
  { code: '+55', country: 'Brasil', iso: 'br', placeholder: '11 91234-5678' },
  { code: '+1 809', country: 'República Dominicana', iso: 'do', placeholder: '809 123 4567' },
  { code: '+1 787', country: 'Puerto Rico', iso: 'pr', placeholder: '787 123 4567' },
];

const AppointmentSection = () => {
  const [genero, setGenero] = useState('Hombre');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [dropdownAbierto, setDropdownAbierto] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [telefono, setTelefono] = useState('');
  const [servicio, setServicio] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownAbierto(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const buildWhatsAppUrl = () => {
    const textoWhatsApp = 
      `*¡Hola Holística Medicina Integral! Deseo agendar una cita o cotizar un tratamiento.* 🌿\n\n` +
      `📋 *Datos de la Solicitud:*\n` +
      `• *Nombre:* ${nombre.trim()} ${apellido.trim()}\n` +
      `• *Paciente:* ${genero}\n` +
      `• *Teléfono / WhatsApp:* ${selectedCountry.code} ${telefono.trim()}\n` +
      `• *Correo Electrónico:* ${email.trim()}\n` +
      `• *Tratamiento de Interés:* ${servicio || 'Consulta Médica Integral'}\n` +
      (mensaje.trim() ? `• *Motivo / Detalle:* ${mensaje.trim()}\n` : '') +
      `\nQuedo atento(a) a la disponibilidad de agenda, información y costos. ¡Muchas gracias!`;

    return `https://wa.me/573152978441?text=${encodeURIComponent(textoWhatsApp)}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const url = buildWhatsAppUrl();
    window.open(url, '_blank');
    setEnviado(true);
  };

  return (
    <section id="cita" className="pt-10 sm:pt-16 pb-8 sm:pb-10 px-3 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="rounded-[32px] sm:rounded-[48px] lg:rounded-[60px] bg-gradient-to-br from-[#274075] via-[#3b5998] to-[#00cfd5] p-5 sm:p-10 lg:p-16 text-white relative overflow-hidden shadow-2xl shadow-holistica-blue/30">
          <div className="absolute inset-0 geometric-bg -z-10 opacity-10 pointer-events-none" />
          <div className="blob bg-white/20 w-96 h-96 -top-20 -right-20 pointer-events-none" />

          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start relative z-10">
            {/* Columna Izquierda: Información de Sede y Horarios */}
            <div className="lg:col-span-5 flex flex-col justify-between">
              <div>
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white text-[11px] font-black uppercase tracking-[0.2em] mb-6">
                  <Sparkles className="w-3.5 h-3.5 text-holistica-orange" />
                  Primer Paso Hacia Tu Sanación
                </span>
                
                <h2 className="text-4xl sm:text-5xl font-display font-black leading-tight mb-6">
                  Solicita tu <span className="text-holistica-orange drop-shadow-md">Cita Médica</span>
                </h2>
                
                <p className="text-white/90 text-base leading-relaxed mb-10 font-medium">
                  Estamos en Cali para acompañarte de manera cercana y profesional. Cuéntanos cuándo deseas visitarnos y nuestro equipo se comunicará contigo para confirmar tu consulta.
                </p>
              </div>

              {/* Pilares Informativos de la Clínica con miniaturas correspondientes */}
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 hover:bg-white/15 transition-all duration-300 group">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 group-hover:bg-white/30 transition-colors">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">Lunes a Viernes</h4>
                    <p className="text-white/80 text-xs mt-0.5 leading-relaxed">7:30 a.m. – 12:30 p.m. &nbsp;·&nbsp; 2:00 p.m. – 4:30 p.m.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 hover:bg-white/15 transition-all duration-300 group">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 group-hover:bg-white/30 transition-colors">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">Sábados</h4>
                    <p className="text-white/80 text-xs mt-0.5 leading-relaxed">8:00 a.m. – 12:00 m.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 hover:bg-white/15 transition-all duration-300 group">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 group-hover:bg-white/30 transition-colors">
                    <Phone className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">Confirmación de cita</h4>
                    <p className="text-white/80 text-xs mt-0.5 leading-relaxed">Recibirás confirmación por email en menos de 24 horas hábiles.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 hover:bg-white/15 transition-all duration-300 group">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 group-hover:bg-white/30 transition-colors">
                    <Globe className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">Pacientes internacionales</h4>
                    <p className="text-white/80 text-xs mt-0.5 leading-relaxed">¿Visitas Colombia? Tenemos paquetes especiales para turistas de salud.</p>
                  </div>
                </div>

                <div className="pt-1 flex items-center gap-2 text-xs text-white/70">
                  <MapPin className="w-3.5 h-3.5 text-holistica-cyan shrink-0" />
                  <span>Cra. 29 #5A-66, Cali, Valle del Cauca, Colombia</span>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Formulario Interactivo */}
            <div className="lg:col-span-7">
              <div className="bg-white rounded-[26px] sm:rounded-[36px] p-5 sm:p-8 lg:p-10 text-slate-900 shadow-2xl">
                {enviado ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-12"
                  >
                    <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-6">
                      <CheckCircle className="w-10 h-10" />
                    </div>
                    <h3 className="text-3xl font-display font-bold text-slate-900 mb-3">¡Solicitud de Cita Enviada!</h3>
                    <p className="text-slate-600 max-w-md mx-auto mb-8 text-sm">
                      Gracias, <strong className="text-slate-900">{nombre}</strong>. Hemos recibido tu solicitud para <strong className="text-holistica-blue">{servicio || "consulta médica"}</strong>. Nuestro equipo de Holística Cali te contactará en menos de 24 horas hábiles.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                      <a
                        href={buildWhatsAppUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-emerald-600 text-white px-6 py-3.5 rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20"
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className="w-4 h-4 shrink-0">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                        Abrir WhatsApp nuevamente
                      </a>
                      <button
                        onClick={() => {
                          setEnviado(false);
                          setNombre('');
                          setApellido('');
                          setEmail('');
                          setTelefono('');
                          setSelectedCountry(COUNTRY_CODES[0]);
                          setServicio('');
                          setMensaje('');
                        }}
                        className="bg-slate-100 text-slate-700 px-6 py-3.5 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all"
                      >
                        Enviar otra solicitud o cotización
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                    <div className="border-b border-slate-100 pb-4 sm:pb-5">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 border border-cyan-200/60 text-[#0891b2] text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Respuesta Inmediata vía WhatsApp
                      </div>
                      <h3 className="text-xl sm:text-2xl lg:text-[27px] font-serif font-bold text-slate-900 leading-snug tracking-tight mb-1.5 sm:mb-2">
                        Agenda tu Cita o Cotiza tu{' '}
                        <span className="italic font-normal text-[#0891b2]">Tratamiento</span>
                      </h3>
                      <p className="text-slate-500 text-xs sm:text-[13px] leading-relaxed">
                        Completa tus datos y te brindaremos los horarios disponibles o la cotización personalizada para tu atención médica integral en Cali.
                      </p>
                    </div>

                    {/* Selector de Paciente */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Paciente</label>
                      <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        {['Hombre', 'Mujer', 'Niño/a'].map((tipo) => (
                          <button
                            key={tipo}
                            type="button"
                            onClick={() => setGenero(tipo)}
                            className={`py-2 px-2 sm:px-4 rounded-xl text-xs font-bold transition-all border text-center ${
                              genero === tipo
                                ? 'bg-holistica-blue text-white border-holistica-blue shadow-md'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {tipo}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Nombre y Apellido */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Nombre *</label>
                        <input
                          type="text"
                          required
                          value={nombre}
                          onChange={(e) => setNombre(e.target.value)}
                          placeholder="Tu nombre"
                          className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:border-holistica-blue focus:ring-2 focus:ring-holistica-blue/10 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Apellido</label>
                        <input
                          type="text"
                          value={apellido}
                          onChange={(e) => setApellido(e.target.value)}
                          placeholder="Tu apellido"
                          className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:border-holistica-blue focus:ring-2 focus:ring-holistica-blue/10 outline-none transition-all"
                        />
                      </div>
                    </div>

                    {/* Email y Teléfono */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Correo Electrónico *</label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="tu@email.com"
                          className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:border-holistica-blue focus:ring-2 focus:ring-holistica-blue/10 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Teléfono / WhatsApp *</label>
                        <div className="relative" ref={dropdownRef}>
                          <div className="flex rounded-xl bg-slate-50 border border-slate-200 focus-within:bg-white focus-within:border-holistica-blue focus-within:ring-2 focus-within:ring-holistica-blue/10 transition-all">
                            {/* Botón selector con banderita gráfica real */}
                            <button
                              type="button"
                              onClick={() => setDropdownAbierto((prev) => !prev)}
                              className="flex items-center gap-2 pl-3 pr-2.5 py-3 bg-slate-100/90 hover:bg-slate-200/80 border-r border-slate-200 rounded-l-xl transition-colors shrink-0 group focus:outline-none cursor-pointer"
                              aria-haspopup="listbox"
                              aria-expanded={dropdownAbierto}
                            >
                              <img
                                src={`/flags/${selectedCountry.iso}.svg`}
                                alt={selectedCountry.country}
                                className="w-5 h-3.5 object-cover rounded-[2px] shadow-xs border border-black/15 shrink-0"
                                width="20"
                                height="14"
                              />
                              <span className="text-xs sm:text-sm font-bold text-slate-800">{selectedCountry.code}</span>
                              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${dropdownAbierto ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Campo de número */}
                            <input
                              type="tel"
                              required
                              value={telefono}
                              onChange={(e) => setTelefono(e.target.value)}
                              placeholder={selectedCountry.placeholder}
                              className="w-full px-3.5 py-3 bg-transparent text-slate-900 text-sm outline-none placeholder:text-slate-400"
                            />
                          </div>

                          {/* Menú desplegable con banderitas reales */}
                          {dropdownAbierto && (
                            <div className="absolute top-full left-0 mt-1.5 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
                              <div className="py-2 px-3 border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Selecciona tu país
                              </div>
                              <div className="max-h-60 overflow-y-auto divide-y divide-slate-50 p-1">
                                {COUNTRY_CODES.map((item) => {
                                  const isSelected = selectedCountry.country === item.country;
                                  return (
                                    <button
                                      key={item.country}
                                      type="button"
                                      onClick={() => {
                                        setSelectedCountry(item);
                                        setDropdownAbierto(false);
                                      }}
                                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                                        isSelected
                                          ? 'bg-holistica-blue/10 text-holistica-blue font-bold'
                                          : 'hover:bg-slate-100 text-slate-700'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <img
                                          src={`/flags/${item.iso}.svg`}
                                          alt={item.country}
                                          className="w-5 h-3.5 object-cover rounded-[2px] shadow-xs border border-black/15 shrink-0"
                                          width="20"
                                          height="14"
                                        />
                                        <span className="truncate">{item.country}</span>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0 ml-2">
                                        <span className={`text-[11px] font-semibold ${isSelected ? 'text-holistica-blue' : 'text-slate-400'}`}>
                                          {item.code}
                                        </span>
                                        {isSelected && (
                                          <Check className="w-3.5 h-3.5 text-holistica-blue shrink-0" />
                                        )}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Tratamiento de Interés */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Tratamiento o Servicio de Interés *</label>
                      <select
                        required
                        value={servicio}
                        onChange={(e) => setServicio(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:border-holistica-blue focus:ring-2 focus:ring-holistica-blue/10 outline-none transition-all"
                      >
                        <option value="">Selecciona un tratamiento...</option>
                        <option value="Acupuntura">Acupuntura Médica</option>
                        <option value="Terapia Neural">Terapia Neural</option>
                        <option value="Cámara Hiperbárica">Cámara Hiperbárica</option>
                        <option value="Homeopatía">Homeopatía</option>
                        <option value="Ozonoterapia">Ozonoterapia</option>
                        <option value="Sueroterapia Antioxidante">Antioxidantes y Sueros (Megadosis Vitamina C / Glutatión)</option>
                        <option value="Apoyo Oncológico">Acompañamiento en Tratamiento de Cáncer</option>
                        <option value="Apoyo Renal">Tratamientos Alternativos para Falla Renal</option>
                        <option value="Consulta General">Consulta de Medicina Integral</option>
                      </select>
                    </div>

                    {/* Mensaje Opcional */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Motivo de consulta o comentario (opcional)</label>
                      <textarea
                        rows={3}
                        value={mensaje}
                        onChange={(e) => setMensaje(e.target.value)}
                        placeholder="Cuéntanos brevemente tu situación o motivo de consulta..."
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:border-holistica-blue focus:ring-2 focus:ring-holistica-blue/10 outline-none transition-all resize-none"
                      />
                    </div>

                    {/* Botón de Envío */}
                    <button
                      type="submit"
                      disabled={cargando}
                      className="w-full bg-holistica-orange text-white py-4 rounded-2xl font-black text-base shadow-xl shadow-holistica-orange/30 hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {cargando ? (
                        <span>Enviando solicitud...</span>
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          Enviar Solicitud o Cotización
                        </>
                      )}
                    </button>

                    <p className="text-center text-[11px] text-slate-400">
                      Tus datos son confidenciales y están protegidos conforme a las normativas de salud médica en Colombia.
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AppointmentSection;
