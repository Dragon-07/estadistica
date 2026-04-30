import Link from "next/link";
import { ArrowRight, User, Settings } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#1e293b] flex flex-col items-center justify-center p-6 text-white font-sans relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/20 rounded-full blur-[120px]" />

      <div className="relative z-10 max-w-4xl w-full flex flex-col items-center text-center space-y-12">
        <div className="space-y-6 animate-fade-in-up">
          <div className="inline-flex items-center justify-center p-4 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl mb-4">
            <span className="text-4xl">🌿</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
            Holística
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto font-light">
            Unidad de Medicina Integral
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl mt-12 animate-fade-in-up" style={{ animationDelay: "150ms" }}>
          {/* Card Pacientes */}
          <Link href="/pacientes" className="group relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
            <div className="relative h-full flex flex-col items-center justify-center p-8 bg-[#1e293b]/80 backdrop-blur-xl rounded-3xl border border-white/10 hover:border-blue-500/50 transition-all duration-300">
              <div className="w-16 h-16 mb-6 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform duration-300">
                <User size={32} />
              </div>
              <h3 className="text-2xl font-bold mb-2 text-white">Portal de Pacientes</h3>
              <p className="text-gray-400 text-sm mb-6">Accede a tus beneficios e invita amigos</p>
              <div className="flex items-center text-blue-400 font-semibold group-hover:text-blue-300">
                Ingresar <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          {/* Card Admin */}
          <Link href="/admin" className="group relative">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
            <div className="relative h-full flex flex-col items-center justify-center p-8 bg-[#1e293b]/80 backdrop-blur-xl rounded-3xl border border-white/10 hover:border-emerald-500/50 transition-all duration-300">
              <div className="w-16 h-16 mb-6 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform duration-300">
                <Settings size={32} />
              </div>
              <h3 className="text-2xl font-bold mb-2 text-white">Acceso Administrativo</h3>
              <p className="text-gray-400 text-sm mb-6">Gestión interna y estadísticas</p>
              <div className="flex items-center text-emerald-400 font-semibold group-hover:text-emerald-300">
                Ingresar <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
