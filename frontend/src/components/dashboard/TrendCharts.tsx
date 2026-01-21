import React from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Project } from '@/types';
import { TrendingUp, Activity } from 'lucide-react';

interface TrendChartsProps {
  projects: Project[];
}

export const TrendCharts: React.FC<TrendChartsProps> = ({ projects }) => {
  // Generar datos de tendencia por mes
  const getTrendData = () => {
    const monthData: { [key: string]: { total: number; completed: number; inProgress: number; volume: number } } = {};
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    // Inicializar últimos 12 meses
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${monthNames[date.getMonth()]}`;
      monthData[key] = { total: 0, completed: 0, inProgress: 0, volume: 0 };
    }

    // Contar proyectos y acumular volumen por mes
    projects.forEach(project => {
      const date = new Date(project.createdAt);
      const key = monthNames[date.getMonth()];
      if (key in monthData) {
        monthData[key].total++;
        if (project.status === 'COMPLETED') monthData[key].completed++;
        if (project.status === 'IN_PROGRESS') monthData[key].inProgress++;
        monthData[key].volume += project.volume || 0;
      }
    });

    return Object.entries(monthData).map(([month, data]) => ({
      month,
      total: data.total,
      completados: data.completed,
      enProgreso: data.inProgress,
      volumen: parseFloat(data.volume.toFixed(2))
    }));
  };

  const trendData = getTrendData();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-xl p-4 shadow-2xl">
          <p className="text-white font-light mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
              <span className="text-zinc-400">{entry.name}:</span>
              <span className="text-white font-light">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Gráfico de Líneas - Tendencia de Proyectos */}
      <div className="group relative">
        <div className="absolute -inset-0.5 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-3xl blur-lg opacity-10 group-hover:opacity-20 transition duration-500"></div>

        <div className="relative rounded-3xl bg-zinc-950/90 backdrop-blur-2xl border border-zinc-800/50 overflow-hidden p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none"></div>

          <div className="relative mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl blur-md opacity-50"></div>
                <div className="relative p-2 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 shadow-lg">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-light text-white tracking-wide">Tendencia de Proyectos</h3>
            </div>
            <p className="text-sm text-zinc-500 font-light ml-[52px]">Últimos 12 meses</p>
          </div>

          <div className="relative h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
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
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Total"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="completados"
                  name="Completados"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="enProgreso"
                  name="En Progreso"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ fill: '#f59e0b', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Gráfico de Área - Volumen Acumulado */}
      <div className="group relative">
        <div className="absolute -inset-0.5 bg-gradient-to-br from-violet-600 to-purple-600 rounded-3xl blur-lg opacity-10 group-hover:opacity-20 transition duration-500"></div>

        <div className="relative rounded-3xl bg-zinc-950/90 backdrop-blur-2xl border border-zinc-800/50 overflow-hidden p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none"></div>

          <div className="relative mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl blur-md opacity-50"></div>
                <div className="relative p-2 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 shadow-lg">
                  <Activity className="w-5 h-5 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-light text-white tracking-wide">Volumen de Agua</h3>
            </div>
            <p className="text-sm text-zinc-500 font-light ml-[52px]">Acumulado por mes (m³)</p>
          </div>

          <div className="relative h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
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
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="volumen"
                  name="Volumen (m³)"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  fill="url(#volumeGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Total acumulado */}
          <div className="relative mt-6 p-4 rounded-2xl bg-gradient-to-br from-violet-950/50 to-purple-950/50 border border-violet-500/30">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 text-sm font-light">Volumen Total Acumulado</span>
              <span className="text-white text-2xl font-light">
                {trendData.reduce((acc, curr) => acc + curr.volumen, 0).toFixed(2)} m³
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
