import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Project } from '@/types';

interface ProjectsChartProps {
  projects: Project[];
}

export const ProjectsChart: React.FC<ProjectsChartProps> = ({ projects }) => {
  // Datos para el gráfico de barras (proyectos por mes)
  const getProjectsByMonth = () => {
    const monthCounts: { [key: string]: number } = {};
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    // Inicializar últimos 6 meses
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      monthCounts[key] = 0;
    }

    // Contar proyectos por mes
    projects.forEach(project => {
      const date = new Date(project.createdAt);
      const key = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      if (key in monthCounts) {
        monthCounts[key]++;
      }
    });

    return Object.entries(monthCounts).map(([month, count]) => ({
      month,
      proyectos: count
    }));
  };

  // Datos para el gráfico circular (distribución de estados)
  const getStatusDistribution = () => {
    const statusCounts = {
      DRAFT: projects.filter(p => p.status === 'DRAFT').length,
      IN_PROGRESS: projects.filter(p => p.status === 'IN_PROGRESS').length,
      COMPLETED: projects.filter(p => p.status === 'COMPLETED').length,
    };

    return [
      { name: 'Borradores', value: statusCounts.DRAFT, color: '#71717a' },
      { name: 'En Progreso', value: statusCounts.IN_PROGRESS, color: '#f59e0b' },
      { name: 'Completados', value: statusCounts.COMPLETED, color: '#10b981' },
    ].filter(item => item.value > 0);
  };

  const monthlyData = getProjectsByMonth();
  const statusData = getStatusDistribution();

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-xl p-3 shadow-2xl">
          <p className="text-zinc-400 text-sm font-light">{payload[0].payload.month}</p>
          <p className="text-white text-lg font-light">{payload[0].value} proyectos</p>
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-xl p-3 shadow-2xl">
          <p className="text-zinc-400 text-sm font-light">{payload[0].name}</p>
          <p className="text-white text-lg font-light">{payload[0].value} proyectos</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Gráfico de Barras */}
      <div className="group relative">
        <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-3xl blur-lg opacity-10 group-hover:opacity-20 transition duration-500"></div>

        <div className="relative rounded-3xl bg-zinc-950/90 backdrop-blur-2xl border border-zinc-800/50 overflow-hidden p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none"></div>

          <div className="relative mb-6">
            <h3 className="text-lg font-light text-white tracking-wide mb-2">Proyectos por Mes</h3>
            <p className="text-sm text-zinc-500 font-light">Últimos 6 meses</p>
          </div>

          <div className="relative h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="month"
                  stroke="#71717a"
                  style={{ fontSize: '12px', fontWeight: '300' }}
                />
                <YAxis
                  stroke="#71717a"
                  style={{ fontSize: '12px', fontWeight: '300' }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }} />
                <Bar
                  dataKey="proyectos"
                  fill="url(#colorGradient)"
                  radius={[8, 8, 0, 0]}
                />
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Gráfico Circular */}
      <div className="group relative">
        <div className="absolute -inset-0.5 bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl blur-lg opacity-10 group-hover:opacity-20 transition duration-500"></div>

        <div className="relative rounded-3xl bg-zinc-950/90 backdrop-blur-2xl border border-zinc-800/50 overflow-hidden p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none"></div>

          <div className="relative mb-6">
            <h3 className="text-lg font-light text-white tracking-wide mb-2">Distribución de Estados</h3>
            <p className="text-sm text-zinc-500 font-light">Estado actual de proyectos</p>
          </div>

          <div className="relative h-64 flex items-center justify-center">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-zinc-500">
                <p className="font-light">No hay datos disponibles</p>
              </div>
            )}
          </div>

          {/* Leyenda */}
          <div className="relative mt-6 grid grid-cols-3 gap-3">
            {statusData.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-xs text-zinc-400 font-light">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
