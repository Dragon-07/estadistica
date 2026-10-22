"use client";

import { motion } from 'motion/react';
import { Microscope, HeartHandshake, Sparkles, ArrowRight } from 'lucide-react';

const pillars = [
  {
    title: "Ciencia y Naturaleza",
    description: "Combinamos el conocimiento científico con el poder de la medicina natural para ofrecerte tratamientos efectivos y seguros.",
    icon: Microscope,
    iconBg: "bg-teal-50 border-teal-100/80 text-[#0891b2]",
  },
  {
    title: "Atención Personalizada",
    description: "No existen enfermedades, existen enfermos. Cada paciente recibe un plan de tratamiento único y adaptado a su condición.",
    icon: HeartHandshake,
    iconBg: "bg-cyan-50 border-cyan-100/80 text-cyan-700",
  },
  {
    title: "Sin Efectos Secundarios",
    description: "Todos nuestros tratamientos están diseñados para ser eficaces sin comprometer tu salud con efectos adversos.",
    icon: Sparkles,
    iconBg: "bg-amber-50/80 border-amber-100/80 text-amber-600",
  },
];

const Highlights = () => {
  return (
    <section id="nosotros" className="scroll-mt-20 sm:scroll-mt-24 py-12 sm:py-20 lg:py-24 bg-white relative overflow-hidden">
      {/* Resplandores ambientales sutiles para profundidad y armonía médica */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-96 h-96 bg-cyan-100/20 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-50/40 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-10 sm:gap-12 lg:gap-16 items-center">
          
          {/* ── COLUMNA IZQUIERDA: FOTO REAL DE LA FACHADA Y BADGE FLOTANTE ── */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="lg:col-span-5 xl:col-span-6 relative pb-5 sm:pb-8 lg:pb-0"
          >
            <div className="relative mx-auto max-w-[500px] lg:max-w-none">
              {/* Imagen de la sede principal de Holística en Cali */}
              <div className="relative overflow-hidden rounded-[24px] sm:rounded-[36px] shadow-2xl shadow-slate-900/10 border border-slate-100 aspect-[16/11] sm:aspect-[4/3] bg-slate-100">
                <img
                  src="/images/fachada-holistica.jpg"
                  alt="Sede Principal Holística Medicina Integral en Cali"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/15 via-transparent to-transparent pointer-events-none" />
              </div>

              {/* Badge flotante "+75 mil pacientes atendidos" exacto a la web de referencia */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="absolute -bottom-3 right-2 sm:right-6 sm:-bottom-6 bg-[#1a4a35] text-white px-4 sm:px-8 py-3 sm:py-5 rounded-2xl sm:rounded-3xl shadow-2xl shadow-[#1a4a35]/40 border border-emerald-500/20 text-center min-w-[145px] sm:min-w-[200px]"
              >
                <div className="font-serif text-2xl sm:text-4xl lg:text-[40px] font-bold text-[#d4b07a] leading-none mb-0.5 sm:mb-1">
                  +75 mil
                </div>
                <div className="text-[10px] sm:text-[12px] font-medium tracking-wide text-white/80">
                  pacientes atendidos
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* ── COLUMNA DERECHA: TEXTOS Y LOS 3 PILARES ── */}
          <div className="lg:col-span-7 xl:col-span-6 flex flex-col justify-center">
            
            {/* Etiqueta superior con línea distintiva */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex items-center gap-2.5 mb-3.5"
            >
              <span className="w-7 h-[2px] bg-[#0891b2] rounded-full inline-block" />
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.2em] text-[#0891b2]">
                Quiénes somos
              </span>
            </motion.div>

            {/* Título editorial exacto */}
            <motion.h2
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.08 }}
              className="text-3xl sm:text-4xl lg:text-[44px] font-serif font-bold text-slate-900 leading-[1.12] mb-5 tracking-tight"
            >
              28 años entendiendo el{" "}
              <em className="font-serif italic font-normal text-[#0891b2] pr-1">
                dolor humano
              </em>
            </motion.h2>

            {/* Párrafo descriptivo exacto */}
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 }}
              className="text-slate-600 text-[15px] sm:text-base leading-relaxed mb-8 font-normal"
            >
              Desde hace más de 28 años, Holística es la unidad especializada en tratamientos alternativos de base natural en Cali. Entendemos el dolor de nuestros pacientes y trabajamos junto a ellos para restablecer su bienestar integral: cuerpo, mente y espíritu.
            </motion.p>

            {/* Lista de los 3 pilares */}
            <div className="space-y-5 sm:space-y-6">
              {pillars.map((pilar, index) => (
                <motion.div
                  key={pilar.title}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + index * 0.1, duration: 0.45 }}
                  className="flex items-start gap-4 sm:gap-5 group"
                >
                  {/* Icono del pilar con fondo redondeado */}
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-xs flex-shrink-0 group-hover:scale-110 transition-transform duration-300 ${pilar.iconBg}`}>
                    <pilar.icon className="w-5 h-5" />
                  </div>

                  {/* Contenido del pilar */}
                  <div className="pt-0.5">
                    <h3 className="font-semibold text-slate-900 text-base sm:text-[17px] mb-1 group-hover:text-[#0891b2] transition-colors">
                      {pilar.title}
                    </h3>
                    <p className="text-slate-500 text-sm sm:text-[14.5px] leading-relaxed">
                      {pilar.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Enlace sutil para agendar cita */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.55 }}
              className="mt-8 pt-6 border-t border-slate-100 flex items-center"
            >
              <a
                href="#cita"
                className="inline-flex items-center gap-2 text-sm font-bold text-[#0891b2] hover:text-cyan-800 transition-colors group cursor-pointer"
              >
                <span>Solicitar una consulta de valoración médica</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </motion.div>

          </div>

        </div>
      </div>
    </section>
  );
};

export default Highlights;
