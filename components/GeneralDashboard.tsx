
import React, { useMemo } from 'react';
import { Transaction, PalletTransaction, View, OperationType } from '../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Card } from './ui/Card';

interface GeneralDashboardProps {
  transactions: Transaction[];
  palletTransactions: PalletTransaction[];
  setActiveView: (view: View) => void;
}

const ROLL_WEIGHT_KG = 3;

const GeneralDashboard: React.FC<GeneralDashboardProps> = ({ transactions, palletTransactions, setActiveView }) => {
  const summaryData = useMemo(() => {
    // Stretch Film Calculations
    const currentBalanceKg = transactions.length > 0 ? [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].balance : 0;
    const currentBalanceRolls = Math.floor(currentBalanceKg / ROLL_WEIGHT_KG);

    const sortedFilm = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let runningValue = 0;
    let runningInputKg = 0;
    let runningInputCost = 0;
    sortedFilm.forEach(t => {
      const avgCost = runningInputKg > 0 ? runningInputCost / runningInputKg : 0;
      // FIX: Use OperationType enum and include DEVOLUCAO as an output for correct stock value calculation.
      if (t.operation === OperationType.ENTRADA) {
        runningValue += t.value;
        runningInputKg += t.input;
        runningInputCost += t.value;
      } else if (t.operation === OperationType.SAIDA || t.operation === OperationType.DEVOLUCAO) {
        runningValue -= t.output * avgCost;
      }
    });
    const totalStockValue = Math.max(0, runningValue);

    // Pallet Calculations
    const pbrInputs = palletTransactions.reduce((sum, t) => t.operation === 'ENTRADA' ? sum + t.pbrInput : sum, 0);
    const pbrOutputs = palletTransactions.reduce((sum, t) => t.operation === 'SAÍDA' ? sum + t.output : sum, 0);
    const pbrBroken = palletTransactions.reduce((sum, t) => sum + t.pbrBroken, 0);
    const pbrReturns = palletTransactions.reduce((sum, t) => sum + t.returned, 0);
    
    const currentPbrBalance = pbrInputs - pbrOutputs - pbrBroken + pbrReturns;
    const palletsInCirculation = pbrOutputs - pbrReturns;
    
    // Combined Daily Activity
    const activityByDay: Record<string, { film: number; pallets: number }> = {};
    
    transactions.forEach(t => {
      const date = new Date(t.date).toLocaleDateString('pt-BR');
      if (!activityByDay[date]) activityByDay[date] = { film: 0, pallets: 0 };
      activityByDay[date].film++;
    });

    palletTransactions.forEach(p => {
      const date = new Date(p.date).toLocaleDateString('pt-BR');
      if (!activityByDay[date]) activityByDay[date] = { film: 0, pallets: 0 };
      activityByDay[date].pallets++;
    });
    
    const dailyActivityData = Object.entries(activityByDay)
      .map(([date, counts]) => ({ date, ...counts }))
      .slice(-30); // Last 30 days of activity

    return {
      currentBalanceRolls,
      totalStockValue,
      currentPbrBalance,
      palletsInCirculation,
      dailyActivityData,
    };
  }, [transactions, palletTransactions]);

  const formatCurrency = (value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatPlt = (value: number) => `${value.toLocaleString('pt-BR')} plt`;
  const formatRolls = (value: number) => `${value.toLocaleString('pt-BR')} rolos`;

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center pb-8">
        <button onClick={() => setActiveView('dashboard')} className="w-full text-left">
          <Card title="Estoque de Filme Stretch" value={formatRolls(summaryData.currentBalanceRolls)} isCritical={summaryData.currentBalanceRolls < 15} />
        </button>
        <button onClick={() => setActiveView('dashboard')} className="w-full text-left">
          <Card title="Valor do Estoque (Filme)" value={formatCurrency(summaryData.totalStockValue)} />
        </button>
        <button onClick={() => setActiveView('palletsDashboard')} className="w-full text-left">
          <Card title="Saldo de Paletes PBR" value={formatPlt(summaryData.currentPbrBalance)} isCritical={summaryData.currentPbrBalance < 0} />
        </button>
        <button onClick={() => setActiveView('palletsDashboard')} className="w-full text-left">
          <Card title="Paletes em Circulação" value={formatPlt(summaryData.palletsInCirculation)} />
        </button>
      </div>
      <div className="mt-6 bg-slate-900/50 p-6 rounded-2xl shadow-sm">
        <h3 className="text-lg font-semibold mb-4 text-center text-slate-200">Atividade Diária (Últimos 30 Dias)</h3>
        {summaryData.dailyActivityData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={summaryData.dailyActivityData}>
              <CartesianGrid {...chartGridProps} />
              <XAxis dataKey="date" {...chartAxisProps} tick={{ fontSize: 12 }}/>
              <YAxis {...chartAxisProps} />
              <Tooltip {...chartTooltipProps} formatter={(value) => `${value} movimentações`} />
              <Legend {...chartLegendProps} />
              <Bar dataKey="film" stackId="a" fill="#ef4444" name="Filme Stretch" />
              <Bar dataKey="pallets" stackId="a" fill="#10b981" name="Paletes" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-gray-500 h-[400px] flex items-center justify-center">Sem dados de atividade para exibir.</p>
        )}
      </div>
    </div>
  );
};

export default GeneralDashboard;