"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'motion/react';
import { ArrowRight, Calendar, ChevronLeft, ChevronRight, Sparkles, HeartHandshake, Stethoscope } from 'lucide-react';

interface Slide {
  id: number;
  badge: string;
  badgeIcon: typeof Sparkles;
  titleBefore?: string;
  titleEm: string;
  titleAfter?: string;
  description: string;
  buttonText: string;
  buttonHref: string;
}

const slides: Slide[] = [
  {
    id: 1,
    badge: "MEDICINA INTEGRAL",
    badgeIcon: HeartHandshake,
    titleBefore: "Cuerpo, ",
    titleEm: "Mente",
    titleAfter: " y Espíritu",
    description: "Más de 28 años entendiendo y atendiendo el dolor de los pacientes, contribuyendo a una vida de mayor bienestar.",
    buttonText: "Conoce nuestros servicios",
    buttonHref: "#servicios",
  },
  {
    id: 2,
    badge: "TRATAMIENTOS NATURALES",
    badgeIcon: Sparkles,
    titleBefore: "¿Cansado de los ",
    titleEm: "mismos resultados?",
    titleAfter: "",
    description: "Exploramos alternativas que la medicina natural nos ofrece para tratar condiciones complejas de forma segura y efectiva.",
    buttonText: "Ver todos los tratamientos",
    buttonHref: "#servicios",
  },
  {
    id: 3,
    badge: "TECNOLOGÍA + EXPERIENCIA",
    badgeIcon: Stethoscope,
    titleBefore: "",
    titleEm: "Tecnología,",
    titleAfter: " Conocimiento y Experiencia",
    description: "Equipos modernos de cámara hiperbárica, ozonoterapia y campos magnéticos que garantizan seguridad y eficacia en cada tratamiento.",
    buttonText: "Conóce Holística",
    buttonHref: "#nosotros",
  }
];

const AUTOPLAY_DURATION = 6000;

const Hero = () => {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [direction, setDirection] = useState(1);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ── FÍSICAS DE PARALLAX PARA EL MOSAICO DE LA DERECHA ──
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 150, mass: 0.5 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  const move1X = useTransform(smoothX, [-1, 1], [-35, 35]);
  const move1Y = useTransform(smoothY, [-1, 1], [-35, 35]);

  const move2X = useTransform(smoothX, [-1, 1], [28, -28]);
  const move2Y = useTransform(smoothY, [-1, 1], [28, -28]);

  const move3X = useTransform(smoothX, [-1, 1], [-20, 20]);
  const move3Y = useTransform(smoothY, [-1, 1], [20, -20]);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const { clientX, clientY, currentTarget } = e;
    const { width, height, left, top } = currentTarget.getBoundingClientRect();
    const x = ((clientX - left) / width) * 2 - 1;
    const y = ((clientY - top) / height) * 2 - 1;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setIsPaused(false);
  };

  // ── CONTROL DE DIAPOSITIVAS ──
  const nextSlide = useCallback(() => {
    setDirection(1);
    setCurrent((prev) => (prev + 1) % slides.length);
  }, []);

  const prevSlide = useCallback(() => {
    setDirection(-1);
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
  }, []);

  const goToSlide = (index: number) => {
    setDirection(index > current ? 1 : -1);
    setCurrent(index);
  };

  useEffect(() => {
    if (isPaused) return;

    timerRef.current = setInterval(() => {
      nextSlide();
    }, AUTOPLAY_DURATION);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [current, isPaused, nextSlide]);

  const activeSlide = slides[current];

  return (
    <section
      className="relative pt-24 sm:pt-32 lg:pt-40 xl:pt-44 pb-8 lg:pb-12 overflow-hidden bg-medical-bg geometric-bg select-none"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      aria-label="Presentación principal de Holística"
    >
      {/* ── ELEMENTOS TRASLÚCIDOS DE FONDO (BLOBS) (solo para desktop/tablet) ── */}
      <div className="hidden sm:block blob bg-holistica-cyan w-80 h-80 top-16 -left-40 opacity-25 pointer-events-none" />
      <div className="hidden sm:block blob bg-holistica-blue w-80 h-80 bottom-16 -right-40 delay-700 opacity-25 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-12 gap-6 lg:gap-8 items-center relative">

          {/* ── COLUMNA IZQUIERDA: CARRUSEL ANIMADO DE TEXTOS ── */}
          <div
            className="lg:col-span-6 xl:col-span-6 pr-0 lg:pr-2 w-full relative z-10"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <div className="min-h-[300px] sm:min-h-[340px] flex flex-col justify-center">
              <AnimatePresence initial={false} mode="wait" custom={direction}>
                <motion.div
                  key={activeSlide.id}
                  custom={direction}
                  initial={{ opacity: 0, x: direction > 0 ? 25 : -25 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction > 0 ? -20 : 20 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col items-start w-full"
                >
                  {/* Badge temático */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0891b2] text-white text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.16em] mb-3 shadow-xs border border-cyan-300/30">
                    <activeSlide.badgeIcon className="w-3 h-3 text-cyan-200" />
                    <span>{activeSlide.badge}</span>
                  </div>

                  {/* Título editorial de la diapositiva */}
                  <h1 className="text-2xl sm:text-4xl lg:text-[52px] xl:text-[58px] font-serif font-bold text-slate-900 leading-[1.15] sm:leading-[1.06] tracking-tight mb-3 drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]">
                    {activeSlide.titleBefore}
                    <em className="font-serif italic font-normal text-[#0891b2] pr-1">
                      {activeSlide.titleEm}
                    </em>
                    {activeSlide.titleAfter}
                  </h1>

                  {/* Párrafo descriptivo con mayor grosor, contraste y sombra halo protectora */}
                  <p className="text-sm sm:text-base lg:text-[17px] text-slate-800 lg:text-slate-700 leading-relaxed font-semibold sm:font-medium mb-6 max-w-lg drop-shadow-[0_1px_2px_rgba(255,255,255,0.95)]">
                    {activeSlide.description}
                  </p>

                  {/* Botones de acción: adaptables a columna en móvil */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                    {/* Botón CTA exacto de la diapositiva */}
                    <motion.a
                      href={activeSlide.buttonHref}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="inline-flex items-center justify-center gap-2 bg-white text-slate-900 px-5 py-3.5 rounded-full font-bold text-sm sm:text-[15px] border border-slate-200/90 shadow-xs hover:bg-slate-50 transition-all cursor-pointer group"
                    >
                      <span>{activeSlide.buttonText}</span>
                      <ArrowRight className="w-4 h-4 text-slate-900 group-hover:translate-x-1 transition-transform" />
                    </motion.a>

                    {/* Botón de Agendar Cita */}
                    <motion.a
                      href="#cita"
                      whileHover={{ scale: 1.02, boxShadow: "0 15px 30px -8px rgba(255, 140, 0, 0.4)" }}
                      whileTap={{ scale: 0.98 }}
                      className="inline-flex items-center justify-center gap-2 bg-holistica-orange text-white px-5 py-3.5 rounded-full font-black text-sm sm:text-[15px] shadow-lg shadow-holistica-orange/25 hover:brightness-110 active:scale-98 transition-all cursor-pointer"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>Agendar Cita Ahora</span>
                    </motion.a>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* ── CONTROLES INFERIORES DEL CARRUSEL ── */}
            <div className="mt-5 sm:mt-6 flex items-center justify-between max-w-sm pt-3 border-t border-slate-200/60">
              {/* Indicadores de diapositivas (Dots) */}
              <div className="flex items-center gap-2">
                {slides.map((slide, idx) => {
                  const isActive = idx === current;
                  return (
                    <button
                      key={slide.id}
                      onClick={() => goToSlide(idx)}
                      className={`relative h-2 rounded-full transition-all duration-500 cursor-pointer overflow-hidden ${isActive
                        ? "w-8 bg-[#0891b2] shadow-sm shadow-cyan-600/30"
                        : "w-2 bg-slate-300 hover:bg-slate-400"
                        }`}
                      aria-label={`Ir a diapositiva ${idx + 1}: ${slide.badge}`}
                    >
                      {isActive && !isPaused && (
                        <span
                          key={`progress-${current}`}
                          className="absolute inset-0 bg-cyan-200 origin-left animate-slide-progress"
                          style={{ animationDuration: `${AUTOPLAY_DURATION}ms` }}
                        />
                      )}
                    </button>
                  );
                })}

                <span className="ml-2.5 text-[11px] font-mono font-bold tracking-widest text-slate-400">
                  0{current + 1} / 0{slides.length}
                </span>
              </div>

              {/* Botones de navegación Anterior / Siguiente */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={prevSlide}
                  className="w-8 h-8 rounded-full glass bg-white/90 hover:bg-white border border-slate-200 flex items-center justify-center text-slate-700 transition-all hover:scale-105 active:scale-95 shadow-xs cursor-pointer"
                  aria-label="Diapositiva anterior"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={nextSlide}
                  className="w-8 h-8 rounded-full glass bg-white/90 hover:bg-white border border-slate-200 flex items-center justify-center text-slate-700 transition-all hover:scale-105 active:scale-95 shadow-xs cursor-pointer"
                  aria-label="Siguiente diapositiva"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>

          {/* ── RECUADROS INTERACTIVOS CON PARALLAX: TRANSLÚCIDO Y DIFUMINADO DETRÁS EN MÓVILES (MISMO TAMAÑO DEL FRENTE) / COLUMNA DERECHA EN DESKTOP ── */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-35 sm:opacity-20 filter blur-[0.4px] z-0 overflow-hidden select-none lg:static lg:inset-auto lg:col-span-6 xl:col-span-6 lg:flex lg:justify-end lg:pointer-events-auto lg:opacity-100 lg:filter-none lg:z-10 lg:overflow-visible lg:pt-0">
            <div
              className="relative w-full aspect-[10/8] max-w-[460px] sm:max-w-[520px] lg:max-w-[580px] grid grid-cols-10 grid-rows-8 gap-0 scale-[1.32] sm:scale-[1.2] lg:scale-[1.10] origin-center transition-transform duration-500"
            >
              {/* Terapia IV: cols 7-10, rows 1-4 */}
              <div
                className="col-start-7 col-span-4 row-start-1 row-span-4 relative z-10 shadow-lg bg-[#e8e4e0] overflow-hidden"
              >
                <motion.img
                  style={{ x: move1X, y: move1Y }}
                  src="/images/terapia-iv.jpg"
                  className="w-full h-full object-cover scale-[1.35]"
                  alt="Terapia Intravenosa"
                />
              </div>

              {/* Cámara Hiperbárica: cols 3-6, rows 5-8 */}
              <div
                className="col-start-3 col-span-4 row-start-5 row-span-4 relative z-10 shadow-lg bg-[#d5d5d5] overflow-hidden"
              >
                <motion.img
                  style={{ x: move1X, y: move3Y }}
                  src="/images/camara-hiperbarica.jpg"
                  className="w-full h-full object-cover scale-[1.5]"
                  alt="Cámara Hiperbárica"
                />
              </div>

              {/* === 4 CUADROS CENTRALES (2x2 cada uno, exactamente 1/4 de los grandes) === */}

              {/* Acupuntura Facial: cols 5-6, rows 3-4 */}
              <div
                className="col-start-5 col-span-2 row-start-3 row-span-2 relative z-30 shadow-2xl bg-[#d4c9b8] overflow-hidden"
              >
                <motion.img
                  style={{ x: move2X, y: move2Y }}
                  src="/images/acupuntura-facial-hero.jpg"
                  className="w-full h-full object-cover scale-[2.2]"
                  alt="Acupuntura Facial"
                />
              </div>

              {/* Blanco 1: cols 7-8, rows 3-4 */}
              <div
                className="col-start-7 col-span-2 row-start-3 row-span-2 bg-white relative z-20 shadow-xl"
              />

              {/* Blanco 2: cols 5-6, rows 5-6 */}
              <div
                className="col-start-5 col-span-2 row-start-5 row-span-2 bg-white relative z-20 shadow-xl"
              />

              {/* Acupuntura: cols 7-8, rows 5-6 */}
              <div
                className="col-start-7 col-span-2 row-start-5 row-span-2 relative z-30 shadow-2xl bg-slate-900 overflow-hidden"
              >
                <motion.img
                  style={{ x: move3X, y: move1Y }}
                  src="/images/acupuntura.jpg"
                  className="w-full h-full object-cover scale-[1.5]"
                  alt="Acupuntura"
                />
              </div>

              {/* === PATRÓN INFERIOR DERECHA === */}

              {/* Base Blanca 1 (Arriba-Derecha): cols 9-10, rows 5-6 */}
              <div
                className="col-start-9 col-span-2 row-start-5 row-span-2 bg-white relative z-20 shadow-xl"
              />
              {/* Overlay Oscuro 1 */}
              <div
                className="col-start-9 col-span-1 row-start-6 row-span-1 bg-[#0976C4] relative z-30 shadow-md"
              />

              {/* Base Blanca 2 (Abajo-Izquierda): cols 7-8, rows 7-8 */}
              <div
                className="col-start-7 col-span-2 row-start-7 row-span-2 bg-white relative z-20 shadow-xl"
              />
              {/* Overlay Oscuro 2 */}
              <div
                className="col-start-8 col-span-1 row-start-7 row-span-1 bg-[#0976C4] relative z-30 shadow-md"
              />

              {/* Base Oscura 1 (Abajo-Derecha): cols 9-10, rows 7-8 */}
              <div
                className="col-start-9 col-span-2 row-start-7 row-span-2 bg-[#0976C4] relative z-20 shadow-lg"
              />
              {/* Overlay Blanco 1 */}
              <div
                className="col-start-9 col-span-1 row-start-7 row-span-1 bg-white relative z-30 shadow-md"
              />

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Hero;
