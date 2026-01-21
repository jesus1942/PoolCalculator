import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, Waves, Settings, BarChart3, Calendar } from 'lucide-react';

export const QuickActions: React.FC = () => {
  const navigate = useNavigate();

  const actions = [
    {
      title: 'Nuevo Proyecto',
      description: 'Crear un proyecto de piscina',
      icon: <Plus className="w-6 h-6" />,
      gradient: 'from-blue-600 to-cyan-600',
      shadowColor: 'shadow-blue-500/50',
      onClick: () => navigate('/projects')
    },
    {
      title: 'Ver Proyectos',
      description: 'Gestionar proyectos activos',
      icon: <FolderOpen className="w-6 h-6" />,
      gradient: 'from-emerald-600 to-green-600',
      shadowColor: 'shadow-emerald-500/50',
      onClick: () => navigate('/projects')
    },
    {
      title: 'Modelos',
      description: 'Explorar catálogo ACQUAM',
      icon: <Waves className="w-6 h-6" />,
      gradient: 'from-cyan-600 to-teal-600',
      shadowColor: 'shadow-cyan-500/50',
      onClick: () => navigate('/pool-models')
    },
    {
      title: 'Configuración',
      description: 'Ajustar precios y presets',
      icon: <Settings className="w-6 h-6" />,
      gradient: 'from-purple-600 to-pink-600',
      shadowColor: 'shadow-purple-500/50',
      onClick: () => navigate('/settings')
    },
    {
      title: 'La Agenda',
      description: 'Planificar visitas y trabajos',
      icon: <Calendar className="w-6 h-6" />,
      gradient: 'from-slate-600 to-cyan-600',
      shadowColor: 'shadow-cyan-500/50',
      onClick: () => navigate('/agenda')
    }
  ];

  return (
    <div className="group relative">
      <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-600 rounded-3xl blur-lg opacity-10 group-hover:opacity-20 transition duration-500"></div>

      <div className="relative rounded-3xl bg-zinc-950/90 backdrop-blur-2xl border border-zinc-800/50 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none"></div>

        <div className="relative p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl blur-md opacity-50"></div>
              <div className="relative p-3 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 shadow-xl shadow-blue-500/50">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
            </div>
            <h2 className="text-xl font-light text-white tracking-wide">Acciones Rápidas</h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                className="group/action relative overflow-hidden rounded-2xl bg-zinc-900/30 border border-zinc-800/50 hover:bg-zinc-900/60 hover:border-zinc-700/50 transition-all duration-300 transform hover:scale-105 p-6 text-left"
                style={{
                  animation: `fadeInUp 0.5s ease-out ${index * 0.1}s backwards`
                }}
              >
                {/* Glow effect on hover */}
                <div className={`absolute -inset-0.5 bg-gradient-to-br ${action.gradient} rounded-2xl blur opacity-0 group-hover/action:opacity-30 transition duration-300`}></div>

                {/* Icon */}
                <div className="relative mb-4">
                  <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} rounded-xl blur-sm opacity-50`}></div>
                  <div className={`relative p-3 rounded-xl bg-gradient-to-br ${action.gradient} ${action.shadowColor} shadow-lg transform group-hover/action:scale-110 transition-transform duration-300`}>
                    {action.icon}
                  </div>
                </div>

                {/* Content */}
                <div className="relative">
                  <h3 className="text-white font-light text-lg mb-1">{action.title}</h3>
                  <p className="text-zinc-500 text-sm font-light">{action.description}</p>
                </div>

                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover/action:translate-x-full transition-transform duration-700 pointer-events-none"></div>

                {/* Arrow indicator */}
                <div className="absolute bottom-4 right-4 opacity-0 group-hover/action:opacity-100 transition-opacity duration-300">
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
