"use client";

import { motion } from 'motion/react';
import { Flower2, Zap, Leaf, Wind, ShieldCheck, Sparkles, HeartPulse, Shield } from 'lucide-react';

const services = [
  {
    category: "Medicina Holística",
    title: "Acupuntura",
    description: "Terapia que trata al paciente de manera individual, partiendo de la premisa de que no existen enfermedades sino enfermos. Tiene en cuenta al ser de forma integral: cuerpo, mente y espíritu.",
    icon: Flower2,
    color: "bg-gradient-to-br from-teal-500 to-emerald-600 shadow-teal-500/25",
    badgeColor: "bg-teal-50 text-teal-800 border-teal-200",
    image: "/images/acupuntura.jpg",
  },
  {
    category: "Medicina Holística",
    title: "Terapia Neural",
    description: "Técnica de curación de origen alemán que realiza una rehabilitación electrobiológica del organismo. Actúa sobre las redes eléctricas que hacen funcionar las células del cuerpo.",
    icon: Zap,
    color: "bg-gradient-to-br from-blue-600 to-indigo-600 shadow-blue-500/25",
    badgeColor: "bg-blue-50 text-blue-800 border-blue-200",
    image: "/images/terapia-neural.jpg",
  },
  {
    category: "Medicina Holística",
    title: "Homeopatía",
    description: "Basada en el principio de que lo similar cura lo similar. Emplea sustancias extraídas de los tres reinos: animal, vegetal y mineral. Libre de efectos secundarios.",
    icon: Leaf,
    color: "bg-gradient-to-br from-emerald-500 to-teal-700 shadow-emerald-500/25",
    badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
    image: "/images/homeopatia.jpg",
  },
  {
    category: "Tratamientos Complementarios",
    title: "Cámara Hiperbárica",
    description: "Oxigenoterapia con oxígeno puro medicinal a más de una atmósfera de presión. Ideal para tratar enfermedades ocasionadas por falta de oxígeno, incluyendo accidentes cerebrovasculares.",
    icon: Wind,
    color: "bg-gradient-to-br from-sky-500 to-blue-600 shadow-sky-500/25",
    badgeColor: "bg-sky-50 text-sky-800 border-sky-200",
    image: "/images/camara-hiperbarica.jpg",
  },
  {
    category: "Medicina Ortomolecular",
    title: "Antioxidantes",
    description: "Sueros con efecto antioxidante para combatir radicales libres. Utilizamos vitamina C, oligoelementos, ozono y glutatión para proteger el ADN y prevenir enfermedades crónicas.",
    icon: ShieldCheck,
    color: "bg-gradient-to-br from-[#b8935a] to-[#967138] shadow-amber-500/25",
    badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
    image: "/images/terapia-iv.jpg",
  },
  {
    category: "Tratamientos Complementarios",
    title: "Ozonoterapia",
    description: "El ozono médico activa la producción de antioxidantes endógenos como el glutatión y la superóxido dismutasa, con efecto antiinflamatorio, regenerador y antienvejecimiento.",
    icon: Sparkles,
    color: "bg-gradient-to-br from-cyan-500 to-teal-600 shadow-cyan-500/25",
    badgeColor: "bg-cyan-50 text-cyan-800 border-cyan-200",
    image: "/images/ozonoterapia.jpg",
  },
];

const conditions = [
  {
    title: "Tratamientos de Cáncer",
    description: "El cáncer es una de las experiencias más difíciles para un ser humano. Exploramos alternativas de la medicina natural para hacerla más manejable mientras es expulsada del cuerpo.",
    icon: Shield,
    tag: "Acompañamiento Integral",
    badgeColor: "bg-amber-50 text-amber-800 border-amber-200/80",
    image: "/images/acompanamiento-cancer.jpg",
  },
  {
    title: "Falla Renal",
    description: "Sin el trabajo de los riñones el cuerpo no puede sobrevivir. En Holística ofrecemos tratamientos alternativos que pueden ayudar a evitar diálisis u otros procedimientos invasivos.",
    icon: HeartPulse,
    tag: "Medicina Biológica",
    badgeColor: "bg-blue-50 text-blue-800 border-blue-200/80",
    image: "/images/medicina-renal.jpg",
  },
];

const Services = () => {
  return (
    <section id="servicios" className="scroll-mt-20 sm:scroll-mt-24 pt-6 sm:pt-8 pb-12 sm:pb-16 bg-white relative overflow-hidden">
      {/* Sutil resplandor cálido/médico de fondo para mayor riqueza visual sin ocupar espacio */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[520px] h-48 bg-gradient-to-b from-[#0891b2]/10 via-[#00cfd5]/5 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute inset-0 geometric-bg -z-10 opacity-[0.02]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Cabecera optimizada: más compacta en vertical y con estética refinada */}
        <div className="text-center mb-8 sm:mb-10 relative">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0891b2]/10 border border-[#0891b2]/25 text-[#0891b2] text-[11px] font-bold uppercase tracking-widest mb-2.5 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#0891b2]" />
            <span>Lo que ofrecemos</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-slate-900 mb-2.5 tracking-tight leading-tight"
          >
            Tratamientos integrales para una{" "}
            <span className="italic font-serif text-[#0891b2] pr-1">
              vida plena
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-sm sm:text-[15px] text-slate-600 max-w-xl mx-auto leading-relaxed"
          >
            Nuestros especialistas combinan la sabiduría de la medicina tradicional con las últimas tecnologías en medicina alternativa, para ofrecerte soluciones sin efectos secundarios.
          </motion.p>
        </div>

        {/* Cuadrícula de Tratamientos con imágenes traslúcidas de fondo */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-10 sm:mb-16">
          {services.map((service, index) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.4 }}
              viewport={{ once: true }}
              whileHover={{ y: -6 }}
              className="group relative p-5 sm:p-7 md:p-8 rounded-[24px] sm:rounded-[32px] bg-white/85 border border-slate-200/80 hover:bg-white hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-300 flex flex-col justify-between overflow-hidden"
            >
              {/* Imagen traslúcida de fondo específica de cada tratamiento */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none -z-0">
                <img
                  src={service.image}
                  alt=""
                  className="w-full h-full object-cover opacity-97 group-hover:opacity-25 group-hover:scale-105 transition-all duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-white/60" />
              </div>

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl ${service.color} flex items-center justify-center group-hover:scale-110 transition-all duration-300 shadow-md text-white`}>
                    <service.icon className="w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300 group-hover:scale-105" />
                  </div>
                  <span className={`text-[10px] sm:text-[11px] uppercase font-bold tracking-wider px-2.5 sm:px-3 py-1 rounded-full border backdrop-blur-xs bg-white/90 shadow-2xs ${service.badgeColor}`}>
                    {service.category}
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-serif font-bold text-slate-900 mb-2 sm:mb-3 group-hover:text-holistica-blue transition-colors">
                  {service.title}
                </h3>

                <p className="text-slate-700 leading-relaxed text-sm font-normal">
                  {service.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tarjetas destacadas: Cáncer y Falla Renal con diseño armónico y luminoso */}
        <div className="grid md:grid-cols-2 gap-8">
          {conditions.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className="group rounded-[32px] bg-slate-50/70 border border-slate-100 hover:bg-white hover:border-slate-200/80 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 overflow-hidden flex flex-col"
            >
              {/* Imagen superior nítida y acorde a la temática humana y biológica */}
              <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full overflow-hidden bg-slate-100">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent pointer-events-none" />

                {/* Insignia flotante con fondo traslúcido */}
                <div className="absolute top-4 left-4">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider shadow-sm border backdrop-blur-md bg-white/95 ${item.badgeColor}`}>
                    <item.icon className="w-3.5 h-3.5 text-[#0891b2]" />
                    {item.tag}
                  </span>
                </div>
              </div>

              {/* Contenido descriptivo limpio, legible y coherente con el estilo de la clínica */}
              <div className="p-7 sm:p-8 flex-1 flex flex-col justify-start">
                <h4 className="text-2xl font-serif font-bold text-slate-900 mb-3 group-hover:text-holistica-blue transition-colors">
                  {item.title}
                </h4>

                <p className="text-slate-600 text-sm sm:text-[15px] leading-relaxed">
                  {item.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default Services;
