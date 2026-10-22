import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Services from '../components/Services';
import Highlights from '../components/Highlights';
import Testimonials from '../components/Testimonials';
import AppointmentSection from '../components/AppointmentSection';
import Allies from '../components/Allies';
import Footer from '../components/Footer';
import WhatsAppButton from '../components/WhatsAppButton';

export default function Page() {
  return (
    <main className="min-h-screen bg-slate-50/50">
      <Navbar />
      <Hero />
      <StatsBanner />
      <Services />
      <Highlights />
      <Testimonials />
      <AppointmentSection />
      <Allies />
      <Footer />
      <WhatsAppButton />
    </main>
  );
}

// Banner con estadísticas institucionales de Holística
const StatsBanner = () => (
  <div className="bg-white py-5 sm:py-7 border-y border-slate-100/80 relative overflow-hidden">
    <div className="absolute inset-0 geometric-bg -z-10 opacity-[0.01]" />
    <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-2 relative z-10 md:divide-x divide-slate-100">
      {[
        { label: 'Años de Experiencia', value: '28' },
        { label: 'Tratamientos Alternativos', value: '14' },
        { label: 'Entidades Aliadas', value: '11' },
        { label: 'Pacientes Atendidos', value: '75k+' },
      ].map((s, i) => (
        <div key={i} className="text-center px-2 sm:px-4 py-2.5 sm:py-0 bg-slate-50/60 sm:bg-transparent rounded-2xl sm:rounded-none border sm:border-0 border-slate-100/90 flex flex-col justify-center">
          <p className="text-2xl sm:text-3xl lg:text-4xl font-display font-black text-slate-900 tracking-tight">{s.value}</p>
          <p className="text-[10px] sm:text-[11px] uppercase font-bold tracking-widest text-[#0891b2] mt-0.5 leading-tight">{s.label}</p>
        </div>
      ))}
    </div>
  </div>
);
