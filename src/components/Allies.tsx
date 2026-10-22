"use client";

import React from 'react';
import { motion } from 'motion/react';

interface Ally {
  name: string;
  logo: string;
}

const allies: Ally[] = [
  { name: 'Colmena Seguros', logo: '/images/aliados/colmena.png' },
  { name: 'Colsanitas', logo: '/images/aliados/colsanitas.png' },
  { name: 'Coomeva Medicina Prepagada', logo: '/images/aliados/coomeva.png' },
  { name: 'Ecopetrol', logo: '/images/aliados/ecopetrol.png' },
  { name: 'EMCALI', logo: '/images/aliados/emcali.png' },
  { name: 'PREVISER', logo: '/images/aliados/previser.png' },
  { name: 'SURA Seguros', logo: '/images/aliados/sura.png' },
  { name: 'BMT Training', logo: '/images/aliados/bmt.png' },
];

const Allies: React.FC = () => {
  return (
    <section id="aliados" className="py-8 sm:py-10 bg-white border-t border-slate-100 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        
        {/* Título de la sección */}
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 tracking-tight mb-1.5"
        >
          Nuestros <span className="italic font-serif text-[#0891b2]">aliados</span>
        </motion.h2>

        {/* Subtítulo oficial */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.05 }}
          className="text-slate-600 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed mb-6 sm:mb-8"
        >
          Entidades que confían en nuestros tratamientos y nos avalan como prestadores de salud integral.
        </motion.p>

        {/* Contenedor de logos de los aliados */}
        <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-4 max-w-5xl mx-auto">
          {allies.map((ally, idx) => (
            <motion.div
              key={ally.name}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.04, duration: 0.35 }}
              whileHover={{ y: -3, scale: 1.02 }}
              className="w-[135px] sm:w-[155px] h-[70px] sm:h-[78px] bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 p-2.5 sm:p-3 flex items-center justify-center shadow-xs hover:shadow-lg hover:shadow-slate-200/60 hover:border-slate-300 transition-all duration-300 group cursor-default"
            >
              <img
                src={ally.logo}
                alt={ally.name}
                className="max-w-full max-h-full object-contain filter group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
                width={125}
                height={50}
              />
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default Allies;
