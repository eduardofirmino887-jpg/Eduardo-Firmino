
import React, { useMemo } from 'react';
import { Ocorrencia, View, OcorrenciaFilters, OcorrenciaStatus } from '../types';
import { Card } from './ui/Card';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface OcorrenciaDashboardProps {
  ocorrencias: Ocorrencia[];
  setActiveView: (view: View) => void;
  onFiltersChange: React.Dispatch<React.SetStateAction<OcorrenciaFilters>>;
}

const RESPONSIBILITY_COLOR_MAP: { [key: string]: string } = {
  'TRANSPORTADORA': '#F59E0B', // accent-warning
  'CLIENTE': '#3B82F6', // accent-info
  'ARMAZÉM': '#EF4444', // primary-500
  'INDEFINIDO': '#64748b', // slate-500
};
const FALLBACK_COLOR = '#8884d8';


const STATUS_COLORS: { [key in OcorrenciaStatus]: string } = {
  [OcorrenciaStatus.ABERTA]: '#F59E0B',
  [OcorrenciaStatus.EM_ANALISE]: '#3B82F6',
  [OcorrenciaStatus.CONCLUIDA]: '#10B981',
  [OcorrenciaStatus.FECHADA]: '#64748b',
};

const OcorrenciaDashboard: React.FC<OcorrenciaDashboardProps> = ({ ocorrencias, setActiveView, onFiltersChange }) => {

  const dashboardData = useMemo(() => {
    if (ocorrencias.length === 0) {
      return {
        totalOcorrencias: 0,
        abertas: 0,
        concluidasEsteMes: 0,
        responsabilidadeArmazem: '0%',
        responsabilidadeDistribution: [],
        statusDistribution: [],
        ocorrenciasPorCliente: [],
      };
    }

    const totalOcorrencias = ocorrencias.length;
    const abertas = ocorrencias.filter(o => o.status === OcorrenciaStatus.ABERTA || o.status === OcorrenciaStatus.EM_ANALISE).length;

    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const concluidasEsteMes = ocorrencias.filter(o => {
      const oDate = new Date(o.date);
      return (o.status === OcorrenciaStatus.CONCLUIDA || o.status === OcorrenciaStatus.FECHADA) && oDate.getMonth() === thisMonth && oDate.getFullYear() === thisYear;
    }).length;
    
    const armazemCount = ocorrencias.filter(o => o.responsibility.toUpperCase() === 'ARMAZÉM').length;
    const responsabilidadeArmazem = totalOcorrencias > 0 ? `${((armazemCount / totalOcorrencias) * 100).toFixed(1)}%` : '0%';

    const responsabilidadeCounts = ocorrencias.reduce((acc, o) => {
      const key = o.responsibility || 'Indefinido';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const responsabilidadeDistribution = Object.entries(responsabilidadeCounts).map(([name, value]) => ({ name, value }));
    
    const statusCounts = ocorrencias.reduce((acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, {} as Record<OcorrenciaStatus, number>);
    const statusDistribution = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

    // FIX: The initial value for the reduce function was an empty object, which TypeScript
    // infers as type `{}`, causing an error during the arithmetic operation.
    // Typing the initial value as `Record<string, number>` correctly defines the accumulator's shape.
    const clienteCounts = ocorrencias.reduce((acc, o) => {
        if(o.client) {
            acc[o.client] = (acc[o.client] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);
    const ocorrenciasPorCliente = Object.entries(clienteCounts)
        .map(([client, ocorrencias]) => ({ client, ocorrencias }))
        .sort((a,b) => b.ocorrencias - a.ocorrencias)
        .slice(0, 10); // Top 10 clients

    return {
      totalOcorrencias,
      abertas,
      concluidasEsteMes,
      responsabilidadeArmazem,
      responsabilidadeDistribution,
      statusDistribution,
      ocorrenciasPorCliente,
    };
  }, [ocorrencias]);

  const handleResponsibilityClick = (data: any) => {
    onFiltersChange({ startDate: '', endDate: '', client: '', plate: '', driver: '', operation: 'ALL', status: 'ALL', responsibility: data.name });
    setActiveView('ocorrenciaHistory');
  };

  const handleStatusClick = (data: any) => {
    onFiltersChange({ startDate: '', endDate: '', client: '', plate: '', driver: '', operation: 'ALL', responsibility: '', status: data.name });
    setActiveView('ocorrenciaHistory');
  };

  const handleClientClick = (e: any) => {
    if (e && e.activePayload && e.activePayload.length > 0) {
        const clientName = e.activePayload[0].payload.client;
        onFiltersChange({ startDate: '', endDate: '', client: clientName, plate: '', driver: '', operation: 'ALL', responsibility: '', status: 'ALL' });
        setActiveView('ocorrenciaHistory');
    }
  };

  const chartTooltipProps = {
    contentStyle: { backgroundColor: 'rgba(30, 41, 59, 0.9)', border: '1px solid #475569', borderRadius: '0.75rem' },
    itemStyle: { color: '#e2e8f0' },
    labelStyle: { color: '#94a3b8' }
  };
  const chartAxisProps = { tick: { fill: '#94a3b8' } };
  const chartGridProps = { stroke: "#475569", strokeDasharray: "3 3" };

  return (
    <div className="bg-slate-800 p-8 rounded-3xl shadow-xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center pb-4" style={{minWidth: '768px'}}>
        <Card title="Total de Ocorrências" value={dashboardData.totalOcorrencias.toLocaleString('pt-BR')} />
        <Card title="Ocorrências em Aberto" value={dashboardData.abertas.toLocaleString('pt-BR')} isCritical={dashboardData.abertas > 0} />
        <Card title="Concluídas (Mês Atual)" value={dashboardData.concluidasEsteMes.toLocaleString('pt-BR')} />
        <Card title="Responsabilidade Armazém" value={dashboardData.responsabilidadeArmazem} />
      </div>
      <div className="mt-8 grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div className="bg-slate-900/50 p-6 rounded-2xl shadow-sm">
             <h3 className="text-lg font-semibold mb-4 text-center text-slate-200">Distribuição por Responsabilidade</h3>
             {dashboardData.responsabilidadeDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie data={dashboardData.responsabilidadeDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} onClick={handleResponsibilityClick} cursor="pointer">
                            {dashboardData.responsabilidadeDistribution.map((entry) => (
                                <Cell key={`cell-${entry.name}`} fill={RESPONSIBILITY_COLOR_MAP[entry.name.toUpperCase()] || FALLBACK_COLOR} />
                            ))}
                        </Pie>
                        <Tooltip {...chartTooltipProps} formatter={(value, name) => [`${value} (${((value as number / dashboardData.totalOcorrencias) * 100).toFixed(1)}%)`, name]}/>
                        <Legend wrapperStyle={{ color: '#cbd5e1', paddingTop: '20px' }} />
                    </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-gray-500">Sem dados para exibir.</p>}
          </div>
          <div className="bg-slate-900/50 p-6 rounded-2xl shadow-sm">
             <h3 className="text-lg font-semibold mb-4 text-center text-slate-200">Distribuição por Status</h3>
             {dashboardData.statusDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie data={dashboardData.statusDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} label={({ name, value }) => `${name}: ${value}`} onClick={handleStatusClick} cursor="pointer">
                            {dashboardData.statusDistribution.map((entry) => (
                                <Cell key={`cell-${entry.name}`} fill={STATUS_COLORS[entry.name as OcorrenciaStatus] || '#8884d8'} />
                            ))}
                        </Pie>
                        <Tooltip {...chartTooltipProps} formatter={(value, name) => [`${value} (${((value as number / dashboardData.totalOcorrencias) * 100).toFixed(1)}%)`, name]}/>
                    </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-gray-500">Sem dados para exibir.</p>}
          </div>
          <div className="xl:col-span-2 bg-slate-900/50 p-6 rounded-2xl shadow-sm">
              <h3 className="text-lg font-semibold mb-4 text-center text-slate-200">Top 10 Clientes com Mais Ocorrências</h3>
              {dashboardData.ocorrenciasPorCliente.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dashboardData.ocorrenciasPorCliente} margin={{ top: 5, right: 20, left: 20, bottom: 5 }} onClick={handleClientClick} style={{cursor: 'pointer'}}>
                        <CartesianGrid {...chartGridProps}/>
                        <XAxis dataKey="client" {...chartAxisProps} tick={{ fontSize: 12 }} />
                        <YAxis {...chartAxisProps} />
                        <Tooltip {...chartTooltipProps} formatter={(value) => [`${value} ocorrência(s)`, "Ocorrências"]}/>
                        <Bar dataKey="ocorrencias" fill="#6d28d9" name="Ocorrências"/>
                    </BarChart>
                </ResponsiveContainer>
               ) : <p className="text-center text-gray-500">Sem dados de ocorrências por cliente para exibir.</p>}
          </div>
      </div>
    </div>
  );
};

export default OcorrenciaDashboard;