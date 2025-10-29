
import React, { useMemo } from 'react';
import { PalletTransaction, PalletOperationType, PalletProfile, View, PalletFilters } from '../types';
import { Card } from './ui/Card';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface PalletDashboardProps {
  transactions: PalletTransaction[];
  setActiveView: (view: View) => void;
  onFiltersChange: React.Dispatch<React.SetStateAction<PalletFilters>>;
}

const PROFILE_COLORS = {
  [PalletProfile.ATACADO]: '#3B82F6', // accent-info
  [PalletProfile.VAREJO]: '#10B981', // accent-success
  [PalletProfile.CROSS]: '#F59E0B', // accent-warning
  [PalletProfile.DEVOLUCAO]: '#EF4444', // primary-500
};

// --- Calculation Helper Functions ---

const calculatePbrMetrics = (transactions: PalletTransaction[]) => {
    const pbrInputs = transactions.reduce((sum, t) => t.operation === PalletOperationType.ENTRADA ? sum + t.pbrInput : sum, 0);
    const pbrOutputs = transactions.reduce((sum, t) => t.operation === PalletOperationType.SAIDA ? sum + t.output : sum, 0);
    const pbrBroken = transactions.reduce((sum, t) => sum + t.pbrBroken, 0);
    const pbrReturns = transactions.reduce((sum, t) => sum + t.returned, 0);
    
    const currentPbrBalance = pbrInputs - pbrOutputs - pbrBroken + pbrReturns;
    const palletsInCirculation = pbrOutputs - pbrReturns;

    return { currentPbrBalance, palletsInCirculation, pbrBroken };
};

const calculateChepMetrics = (transactions: PalletTransaction[]) => {
    const chepBroken = transactions.reduce((sum, t) => sum + t.chepBroken, 0);
    const chepInputs = transactions.reduce((sum, t) => sum + t.chepInput, 0);
    const totalChepBalance = chepInputs - chepBroken;
    return { totalChepBalance, chepBroken };
};

const calculateBrokenPalletsMetrics = (transactions: PalletTransaction[], pbrBroken: number, chepBroken: number) => {
    const totalBroken = pbrBroken + chepBroken;
    
    const brokenData = transactions.reduce((acc, t) => {
        const month = new Date(t.date).toLocaleString('pt-BR', { year: '2-digit', month: 'short' }).replace('.', '');
        if (!acc[month]) {
            acc[month] = { month, pbr: 0, chep: 0 };
        }
        acc[month].pbr += t.pbrBroken;
        acc[month].chep += t.chepBroken;
        return acc;
    }, {} as Record<string, { month: string; pbr: number; chep: number }>);

    const monthOrder = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const brokenByMonthData = Object.values(brokenData).sort((a, b) => {
        const [aMonthStr, aYear] = a.month.split('/');
        const [bMonthStr, bYear] = b.month.split('/');
        if (aYear !== bYear) return `20${aYear}`.localeCompare(`20${bYear}`);
        return monthOrder.indexOf(aMonthStr) - monthOrder.indexOf(bMonthStr);
    });
    
    return { totalBroken, brokenByMonthData };
};

const calculateAvgOperationTime = (transactions: PalletTransaction[]) => {
    const totalMinutes = transactions.reduce((sum, t) => {
        if (!t.startTime || !t.endTime) return sum;
        const [startH, startM] = t.startTime.split(':').map(Number);
        const [endH, endM] = t.endTime.split(':').map(Number);
        if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return sum;

        const startTotalMinutes = startH * 60 + startM;
        const endTotalMinutes = endH * 60 + endM;
        return sum + (endTotalMinutes - startTotalMinutes);
    }, 0);
    
    const avgMinutes = transactions.length > 0 ? totalMinutes / transactions.length : 0;
    const avgH = Math.floor(avgMinutes / 60);
    const avgM = Math.round(avgMinutes % 60);
    return `${avgH}:${avgM.toString().padStart(2, '0')}`;
};

const calculateBonusMetrics = (transactions: PalletTransaction[]) => {
    return transactions.filter(t => t.bonusId).length;
};

const calculateProfileDistribution = (transactions: PalletTransaction[]) => {
    const profileCounts = transactions.reduce((acc, t) => {
        acc[t.profile] = (acc[t.profile] || 0) + 1;
        return acc;
    }, {} as Record<PalletProfile, number>);
    return Object.entries(profileCounts).map(([name, value]) => ({ name, value }));
};

const calculateCirculationByClient = (transactions: PalletTransaction[]) => {
    const clientData = transactions.reduce((acc, t) => {
        if (!t.client) return acc;
        if (!acc[t.client]) {
            acc[t.client] = { output: 0, returned: 0 };
        }
        acc[t.client].output += t.output;
        acc[t.client].returned += t.returned;
        return acc;
    }, {} as Record<string, { output: number; returned: number }>);

    return Object.entries(clientData)
        .map(([client, data]) => ({
            client,
            emCirculacao: data.output - data.returned,
        }))
        .filter(d => d.emCirculacao > 0)
        .sort((a, b) => b.emCirculacao - a.emCirculacao)
        .slice(0, 10);
};

const getMonthDateRange = (monthYearStr: string): { startDate: string; endDate: string } | null => {
  const [monthStr, yearStr] = monthYearStr.split('/');
  if (!monthStr || !yearStr) return null;

  const monthMap: { [key: string]: number } = {
    'jan': 0, 'fev': 1, 'mar': 2, 'abr': 3, 'mai': 4, 'jun': 5,
    'jul': 6, 'ago': 7, 'set': 8, 'out': 9, 'nov': 10, 'dez': 11,
  };
  
  const monthIndex = monthMap[monthStr.toLowerCase()];
  const year = 2000 + parseInt(yearStr, 10);

  if (monthIndex === undefined || isNaN(year)) return null;

  const startDate = new Date(year, monthIndex, 1);
  const endDate = new Date(year, monthIndex + 1, 0); // Last day of the month

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
};

const PalletDashboard: React.FC<PalletDashboardProps> = ({ transactions, setActiveView, onFiltersChange }) => {

  const dashboardData = useMemo(() => {
    if (transactions.length === 0) {
      return {
        currentPbrBalance: 0,
        palletsInCirculation: 0,
        totalBroken: 0,
        avgOperationTime: "0:00",
        totalBonus: 0,
        totalChepBalance: 0,
        profileDistributionData: [],
        circulationByClientData: [],
        brokenByMonthData: [],
        monthlyPbrFlowData: [],
      };
    }

    const { currentPbrBalance, palletsInCirculation, pbrBroken } = calculatePbrMetrics(transactions);
    const { totalChepBalance, chepBroken } = calculateChepMetrics(transactions);
    const { totalBroken, brokenByMonthData } = calculateBrokenPalletsMetrics(transactions, pbrBroken, chepBroken);
    
    const totalBonus = calculateBonusMetrics(transactions);
    const avgOperationTime = calculateAvgOperationTime(transactions);
    const profileDistributionData = calculateProfileDistribution(transactions);
    const circulationByClientData = calculateCirculationByClient(transactions);
    
    const monthlyPbrFlow = transactions.reduce((acc, t) => {
        const month = new Date(t.date).toLocaleString('pt-BR', { year: '2-digit', month: 'short' }).replace('.', '');
        if (!acc[month]) {
            acc[month] = { month, entradas: 0, saidas: 0, devolucoes: 0 };
        }
        if (t.operation === PalletOperationType.ENTRADA) acc[month].entradas += t.pbrInput;
        if (t.operation === PalletOperationType.SAIDA) acc[month].saidas += t.output;
        if (t.operation === PalletOperationType.DEVOLUCAO) acc[month].devolucoes += t.returned;
        return acc;
    }, {} as Record<string, { month: string; entradas: number; saidas: number; devolucoes: number }>);
    const monthlyPbrFlowData = Object.values(monthlyPbrFlow);


    return {
      currentPbrBalance,
      palletsInCirculation,
      totalBroken,
      avgOperationTime,
      totalBonus,
      totalChepBalance,
      profileDistributionData,
      circulationByClientData,
      brokenByMonthData,
      monthlyPbrFlowData,
    };
  }, [transactions]);

  const handleProfilePieClick = (data: any) => {
    onFiltersChange({
        startDate: '',
        endDate: '',
        operation: 'ALL',
        client: '',
        profile: data.name as PalletProfile,
    });
    setActiveView('palletHistory');
  };

  const handleClientBarClick = (e: any) => {
    if (e && e.activePayload && e.activePayload.length > 0) {
        const clientName = e.activePayload[0].payload.client;
        onFiltersChange({
            startDate: '',
            endDate: '',
            operation: 'ALL',
            client: clientName,
            profile: 'ALL',
        });
        setActiveView('palletHistory');
    }
  };
  
  const handleBrokenBarClick = (e: any) => {
    if (e && e.activePayload && e.activePayload.length > 0) {
        const monthYear = e.activePayload[0].payload.month;
        const dateRange = getMonthDateRange(monthYear);
        if (dateRange) {
            onFiltersChange({
                startDate: dateRange.startDate,
                endDate: dateRange.endDate,
                operation: 'ALL',
                client: '',
                profile: 'ALL',
            });
            setActiveView('palletHistory');
        }
    }
  };
  
  const formatPlt = (value: number) => `${value.toLocaleString('pt-BR')} plt`;

  const chartTooltipProps = {
    contentStyle: { backgroundColor: 'rgba(30, 41, 59, 0.9)', border: '1px solid #475569', borderRadius: '0.75rem' },
    itemStyle: { color: '#e2e8f0' },
    labelStyle: { color: '#94a3b8' }
  };
  const chartLegendProps = { wrapperStyle: { color: '#cbd5e1' } };
  const chartAxisProps = { tick: { fill: '#94a3b8' } };
  const chartGridProps = { stroke: "#475569", strokeDasharray: "3 3" };

  return (
    <div className="bg-slate-800 p-8 rounded-3xl shadow-xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 text-center pb-4" style={{minWidth: '960px'}}>
        <Card title="Saldo Atual (PBR)" value={formatPlt(dashboardData.currentPbrBalance)} isCritical={dashboardData.currentPbrBalance < 0} />
        <Card title="Paletes em Circulação" value={formatPlt(dashboardData.palletsInCirculation)} />
        <Card title="Paletes Quebrados" value={formatPlt(dashboardData.totalBroken)} isCritical={dashboardData.totalBroken > 0} />
        <Card title="Saldo CHEP" value={formatPlt(dashboardData.totalChepBalance)} />
        <Card title="Bônus Concedidos" value={dashboardData.totalBonus.toLocaleString('pt-BR')} />
        <Card title="Tempo Médio Operação" value={dashboardData.avgOperationTime} />
      </div>
      <div className="mt-8 grid grid-cols-1 xl:grid-cols-5 gap-8">
          <div className="xl:col-span-2 bg-slate-900/50 p-6 rounded-2xl shadow-sm">
             <h3 className="text-lg font-semibold mb-4 text-center text-slate-200">Movimentação por Perfil de Cliente</h3>
             {dashboardData.profileDistributionData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie data={dashboardData.profileDistributionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelStyle={{ fill: '#e2e8f0' }} onClick={handleProfilePieClick} cursor="pointer">
                            {dashboardData.profileDistributionData.map((entry) => (
                                <Cell key={`cell-${entry.name}`} fill={PROFILE_COLORS[entry.name as PalletProfile] || '#8884d8'} />
                            ))}
                        </Pie>
                        <Tooltip {...chartTooltipProps} formatter={(value) => `${value} operaçõe(s)`}/>
                        <Legend {...chartLegendProps} />
                    </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-gray-500">Sem dados para exibir.</p>}
          </div>
          <div className="xl:col-span-3 bg-slate-900/50 p-6 rounded-2xl shadow-sm">
              <h3 className="text-lg font-semibold mb-4 text-center text-slate-200">Top 10 Clientes com Paletes em Circulação</h3>
              {dashboardData.circulationByClientData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dashboardData.circulationByClientData} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }} onClick={handleClientBarClick}>
                        <CartesianGrid {...chartGridProps}/>
                        <XAxis type="number" {...chartAxisProps} />
                        <YAxis type="category" dataKey="client" width={100} {...chartAxisProps} tick={{ fontSize: 12 }} interval={0} />
                        <Tooltip {...chartTooltipProps} formatter={(value) => [`${value} paletes`, "Em Circulação"]}/>
                        <Bar dataKey="emCirculacao" fill="#dc2626" name="Em Circulação" cursor="pointer"/>
                    </BarChart>
                </ResponsiveContainer>
               ) : <p className="text-center text-gray-500">Nenhum palete em circulação para exibir.</p>}
          </div>
           <div className="xl:col-span-2 bg-slate-900/50 p-6 rounded-2xl shadow-sm">
              <h3 className="text-lg font-semibold mb-4 text-center text-slate-200">Avarias de Paletes por Mês</h3>
              {dashboardData.brokenByMonthData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dashboardData.brokenByMonthData} onClick={handleBrokenBarClick}>
                        <CartesianGrid {...chartGridProps}/>
                        <XAxis dataKey="month" {...chartAxisProps} />
                        <YAxis {...chartAxisProps} />
                        <Tooltip {...chartTooltipProps} formatter={(value) => `${value} paletes`}/>
                        <Legend {...chartLegendProps} />
                        <Bar dataKey="pbr" stackId="a" fill="#EF4444" name="PBR Quebrado" cursor="pointer"/>
                        <Bar dataKey="chep" stackId="a" fill="#F59E0B" name="CHEP Quebrado" cursor="pointer"/>
                    </BarChart>
                </ResponsiveContainer>
                ) : <p className="text-center text-gray-500">Sem dados de avarias para exibir.</p>}
          </div>
          <div className="xl:col-span-3 bg-slate-900/50 p-6 rounded-2xl shadow-sm">
            <h3 className="text-lg font-semibold mb-4 text-center text-slate-200">Fluxo Mensal de Paletes PBR</h3>
            {dashboardData.monthlyPbrFlowData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dashboardData.monthlyPbrFlowData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid {...chartGridProps}/>
                  <XAxis dataKey="month" {...chartAxisProps}/>
                  <YAxis {...chartAxisProps}/>
                  <Tooltip {...chartTooltipProps} formatter={(value) => `${value} paletes`}/>
                  <Legend {...chartLegendProps}/>
                  {/* FIX: Use bracket notation to access PROFILE_COLORS with enum members to prevent property access errors, especially with keys containing special characters. */}
                  <Bar dataKey="entradas" fill={PROFILE_COLORS[PalletProfile.VAREJO]} name="Entradas PBR" />
                  <Bar dataKey="saidas" fill={PROFILE_COLORS[PalletProfile.DEVOLUCAO]} name="Saídas PBR" />
                  <Bar dataKey="devolucoes" fill={PROFILE_COLORS[PalletProfile.ATACADO]} name="Devoluções PBR" />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-gray-500">Sem dados de fluxo para exibir.</p>}
          </div>
      </div>
    </div>
  );
};

export default PalletDashboard;