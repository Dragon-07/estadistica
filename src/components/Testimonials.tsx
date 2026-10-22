"use client";
import { motion } from 'motion/react';
import { Quote, Star } from 'lucide-react';

const testimonials = [
  {
    text: "Cuando llegué a Holística hace 6 años, movía solamente mi cabeza. A medida del tiempo y gracias a los tratamientos y al profesionalismo de los especialistas, he ido recuperando mis funciones. Hoy me movilizo con bastones canadienses. Me siento en familia.",
    author: "John Alexander Morales Rodríguez",
    role: "Cuadraplejia por trauma raquimedular",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
  },
  {
    text: "Por muchos años sufrí de fuertes migrañas con náuseas, mareos y visión borrosa, eran insoportables. Uno de los médicos me realizó Terapia Neural y desde la tercera sesión nunca más volví a sufrir esos terribles malestares.",
    author: "Zaira Lorena Octavo Paz",
    role: "Migraña crónica severa",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150",
  },
  {
    text: "Tuve una cirugía de biopsia que no sanaba después de 3 meses. Con la ozonoterapia empezó a cerrar y sanar cada día. Después de estar 3 meses abierta sin evolución, en dos semanas cicatrizó hasta sanar totalmente.",
    author: "Emilse Moyano Arias",
    role: "Cáncer de mama · Cicatrización",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150",
  },
];

const Testimonials = () => {
  return (
    <section id="testimonios" className="py-24 bg-slate-50 overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-holistica-cyan font-bold uppercase tracking-widest text-xs mb-3 block">Historias de Transformación Real</span>
          <h2 className="text-4xl lg:text-5xl font-display font-bold text-slate-900 mb-4 tracking-tight">
            Lo que nuestros <span className="text-gradient">pacientes dicen</span>
          </h2>
          <p className="text-slate-500 max-w-2xl mx-auto text-base">
            Testimonios reales de personas que han recuperado su bienestar y calidad de vida con nosotros en Cali.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="glass p-8 rounded-[40px] shadow-xl relative flex flex-col justify-between"
            >
              <Quote className="absolute top-6 right-8 w-12 h-12 text-holistica-cyan/15" />
              <div>
                <div className="flex gap-1 mb-6">
                  {[1,2,3,4,5].map(star => <Star key={star} className="w-4 h-4 fill-holistica-orange text-holistica-orange" />)}
                </div>
                <p className="text-slate-700 italic mb-8 leading-relaxed text-sm">
                  "{t.text}"
                </p>
              </div>
              <div className="flex items-center gap-4 pt-4 border-t border-slate-100/80">
                <img src={t.image} alt={t.author} className="w-12 h-12 rounded-full object-cover shadow-md" referrerPolicy="no-referrer" />
                <div>
                  <p className="font-bold text-slate-900 text-sm">{t.author}</p>
                  <p className="text-xs text-slate-500 font-medium">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;

