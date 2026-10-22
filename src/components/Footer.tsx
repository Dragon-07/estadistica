import { Mail, Phone, MapPin, Activity } from 'lucide-react';

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

const Footer = () => {
  return (
    <footer id="contacto" className="bg-white pt-10 sm:pt-14 pb-10 border-t border-slate-100 relative overflow-hidden">
      <div className="absolute inset-x-0 bottom-0 h-full geometric-bg -z-10 opacity-[0.03]" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-12 sm:mb-14">
          <div className="col-span-1 lg:col-span-1">
            <div className="mb-6">
              <img 
                src="/images/logo.png" 
                alt="Holística - Unidad de Medicina Integral" 
                className="h-14 w-auto object-contain" 
              />
            </div>
            <p className="text-slate-500 mb-8 leading-relaxed text-sm">
              Especialistas en tratamientos alternativos de base natural. 28 años cuidando y transformando la salud de nuestros pacientes en Cali, Colombia.
            </p>
            <div className="flex gap-4">
              <a href="https://www.youtube.com/@HOLISTICAMEDICINA" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-holistica-blue hover:text-white transition-all" aria-label="YouTube">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"/></svg>
              </a>
              <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-holistica-blue hover:text-white transition-all" aria-label="Instagram">
                <InstagramIcon />
              </a>
              <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-holistica-blue hover:text-white transition-all" aria-label="Facebook">
                <FacebookIcon />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-display font-bold text-slate-900 mb-6 uppercase tracking-wider text-sm">Navegación</h4>
            <ul className="space-y-4 text-sm">
              {[
                { label: 'Sobre Nosotros', href: '#nosotros' },
                { label: 'Nuestros Tratamientos', href: '#servicios' },
                { label: 'Historias Reales', href: '#testimonios' },
                { label: 'Solicitar Cita', href: '#cita' },
                { label: 'Pacientes Internacionales', href: '#cita' },
              ].map((item) => (
                <li key={item.label}>
                  <a href={item.href} className="text-slate-500 hover:text-holistica-blue transition-colors">{item.label}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold text-slate-900 mb-6 uppercase tracking-wider text-sm">Tratamientos</h4>
            <ul className="space-y-4 text-sm">
              {[
                'Acupuntura',
                'Terapia Neural',
                'Cámara Hiperbárica',
                'Homeopatía',
                'Ozonoterapia',
                'Sueroterapia Antioxidante',
              ].map((service) => (
                <li key={service}>
                  <a href="#servicios" className="text-slate-500 hover:text-holistica-blue transition-colors">{service}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold text-slate-900 mb-6 uppercase tracking-wider text-sm">Sede Cali</h4>
            <ul className="space-y-5">
              <li className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-holistica-cyan/10 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4 text-holistica-cyan" />
                </div>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Cra. 29 #5A-66, Cali, Valle del Cauca, Colombia
                </p>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-holistica-blue/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Phone className="w-4 h-4 text-holistica-blue" />
                </div>
                <div>
                  <a href="https://wa.me/573152978441" target="_blank" rel="noopener noreferrer" className="text-slate-700 text-xs font-bold hover:text-holistica-blue transition-colors">
                    +57 315 297 8441
                  </a>
                  <p className="text-[11px] text-slate-400">Atención WhatsApp</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-holistica-orange/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Mail className="w-4 h-4 text-holistica-orange" />
                </div>
                <div>
                  <a href="mailto:info@holisticamedicina.com" className="text-slate-600 text-xs hover:text-holistica-blue transition-colors">
                    info@holisticamedicina.com
                  </a>
                  <p className="text-[11px] text-slate-400">Lun–Vie 7:30–16:30 · Sáb 8:00–12:00</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-100 flex flex-col items-center justify-center text-center">
          <p className="text-slate-400 text-xs font-medium">
            © 2026 Holística Unidad de Medicina Integral. Cali, Colombia. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
