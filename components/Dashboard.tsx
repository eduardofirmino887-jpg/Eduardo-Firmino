import React, { useMemo } from 'react';
import { Transaction, OperationType, View, TransactionFilters } from '../types';
import { ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from 'recharts';
import { Card } from './ui/Card';

interface DashboardProps {
  transactions: Transaction[];
  setActiveView: (view: View) => void;
  onFiltersChange: React.Dispatch<React.SetStateAction<TransactionFilters>>;
}

const COLORS = {
  [OperationType.ENTRADA]: '#10B981', // Emerald 500 (accent-success)
  [OperationType.SAIDA]: '#F59E0B',    // Amber 500 (accent-warning)
  [OperationType.AJUSTE]: '#64748b',   // Slate 500
  [OperationType.DEVOLUCAO]: '#EF4444',// primary-500 (Red 500)
};

const ROLL_WEIGHT_KG = 3;

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


const Dashboard: React.FC<DashboardProps> = ({ transactions, setActiveView, onFiltersChange }) => {
  const dashboardData = useMemo(() => {
    if (transactions.length === 0) {
      return {
        currentBalance: 0,
        monthlyConsumption: 0,
        avgCost: 0,
        totalInput: 0,
        totalOutput: 0,
        operationDistribution: [],
        monthlyConsumptionData: [],
        stockValueData: [],
        monthlyFlowData: [],
        movementsByConferente: [],
      };
    }

    const currentBalance = transactions.length > 0 ? [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].balance : 0;
    const totalInput = transactions.reduce((sum, t) => t.operation === OperationType.ENTRADA ? sum + t.input : sum, 0);
    const totalOutput = transactions.reduce((sum, t) => t.operation === OperationType.SAIDA ? sum + t.output : sum, 0);
    
    const inputsWithValue = transactions.filter(t => t.operation === OperationType.ENTRADA && t.unitKg > 0);
    const avgCost = inputsWithValue.length > 0
      ? inputsWithValue.reduce((sum, t) => sum + t.unitKg, 0) / inputsWithValue.length
      : 0;

    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const monthlyConsumption = transactions
      .filter(t => {
        const tDate = new Date(t.date);
        return t.operation === OperationType.SAIDA && tDate.getMonth() === thisMonth && tDate.getFullYear() === thisYear;
      })
      .reduce((sum, t) => sum + t.output, 0);
      
    const operationCounts = transactions.reduce((acc, t) => {
      acc[t.operation] = (acc[t.operation] || 0) + 1;
      return acc;
    }, {} as Record<OperationType, number>);

    const operationDistribution = Object.entries(operationCounts).map(([name, value]) => ({ name, value }));
    
    const monthlyConsumptionByMonth = transactions
        .filter(t => t.operation === OperationType.SAIDA)
        .reduce((acc, t) => {
            const month = new Date(t.date).toLocaleString('pt-BR', { year: '2-digit', month: 'short' }).replace('.', '');
            acc[month] = (acc[month] || 0) + t.output;
            return acc;
        }, {} as Record<string, number>);

    // FIX: Add helper to sort month strings like "jan/25" chronologically, correcting chart display order.
    const monthToSortableString = (monthYearStr: string) => {
        const [monthStr, yearStr] = monthYearStr.split('/');
        if (!monthStr || !yearStr) return '9999-99';
        const monthMap: { [key: string]: string } = {
            'jan': '01', 'fev': '02', 'mar': '03', 'abr': '04', 'mai': '05', 'jun': '06',
            'jul': '07', 'ago': '08', 'set': '09', 'out': '10', 'nov': '11', 'dez': '12',
        };
        const month = monthMap[monthStr.toLowerCase()];
        if (!month) return `20${yearStr}-99`;
        return `20${yearStr}-${month}`;
    };

    const monthlyConsumptionData = Object.entries(monthlyConsumptionByMonth)
        .map(([month, consumo]) => ({ month, consumo }))
        .sort((a, b) => monthToSortableString(a.month).localeCompare(monthToSortableString(b.month)));

    const sortedTransactions = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    let runningValue = 0;
    let runningInputKg = 0;
    let runningInputCost = 0;
    const stockValueData = sortedTransactions.map(t => {
      const avgCost = runningInputKg > 0 ? runningInputCost / runningInputKg : 0;
      if (t.operation === OperationType.ENTRADA) {
        runningValue += t.value;
        runningInputKg += t.input;
        runningInputCost += t.value;
      // FIX: Handle DEVOLUCAO operation type, which also represents an output of stock. This resolves a potential type error and a logical bug.
      } else if (t.operation === OperationType.SAIDA || t.operation === OperationType.DEVOLUCAO) {
        runningValue -= t.output * avgCost;
      } else if (t.operation === OperationType.AJUSTE) {
        runningValue += t.input * avgCost;
        runningInputKg += t.input;
      }
      return {
        date: new Date(t.date).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }),
        valor: Math.max(0, runningValue),
      };
    });

    const monthlyFlow = sortedTransactions.reduce((acc, t) => {
      const month = new Date(t.date).toLocaleString('pt-BR', { year: '2-digit', month: 'short' }).replace('.', '');
      if (!acc[month]) {
        acc[month] = { month, entradas: 0, saidas: 0 };
      }
      // FIX: Ensure values are treated as numbers to prevent type errors from corrupted data.
      if (t.operation === OperationType.ENTRADA) {
        acc[month].entradas += Number(t.input) || 0;
      // FIX: Correctly categorize DEVOLUCAO as an output and handle positive/negative AJUSTE for more accurate flow data.
      } else if (t.operation === OperationType.SAIDA || t.operation === OperationType.DEVOLUCAO) {
        acc[month].saidas += Number(t.output) || 0;
      } else if (t.operation === OperationType.AJUSTE) {
        const inputValue = Number(t.input) || 0;
        if (inputValue > 0) {
            acc[month].entradas += inputValue;
        } else {
            acc[month].saidas += -inputValue;
        }
      }
      return acc;
    }, {} as Record<string, { month: string; entradas: number; saidas: number }>);
    const monthlyFlowData = Object.values(monthlyFlow);
    
    // FIX: The initial value for the reduce function was an empty object, which TypeScript
    // infers as type `{}`, causing an error during the arithmetic operation.
    // Typing the initial value as `Record<string, number>` correctly defines the accumulator's shape.
    const conferenteCounts = transactions.reduce((acc, t) => {
        if (t.conferente) {
            acc[t.conferente] = (acc[t.conferente] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    const movementsByConferente = Object.entries(conferenteCounts)
        .map(([conferente, movimentacoes]) => ({ conferente, movimentacoes }))
        .sort((a, b) => b.movimentacoes - a.movimentacoes);


    return {
      currentBalance,
      monthlyConsumption,
      avgCost,
      totalInput,
      totalOutput,
      operationDistribution,
      monthlyConsumptionData,
      stockValueData,
      monthlyFlowData,
      movementsByConferente,
    };
  }, [transactions]);

  const handlePieClick = (data: any) => {
    onFiltersChange({
        startDate: '',
        endDate: '',
        operation: data.name as OperationType,
        conferente: '',
    });
    setActiveView('history');
  };

  const handleLineClick = (e: any) => {
    if (e && e.activeLabel) {
        const monthYear = e.activeLabel;
        const dateRange = getMonthDateRange(monthYear);
        if (dateRange) {
            onFiltersChange({
                ...dateRange,
                operation: OperationType.SAIDA,
                conferente: '',
            });
            setActiveView('history');
        }
    }
  };
  
  const handleFlowBarClick = (e: any) => {
    if (e && e.activePayload && e.activePayload.length > 0) {
        const payload = e.activePayload[0];
        const monthYear = payload.payload.month;
        const clickedDataKey = payload.dataKey; // 'entradas' or 'saidas'
        const dateRange = getMonthDateRange(monthYear);

        if (dateRange) {
            onFiltersChange({
                ...dateRange,
                operation: clickedDataKey === 'entradas' ? OperationType.ENTRADA : OperationType.SAIDA,
                conferente: '',
            });
            setActiveView('history');
        }
    }
  };

  const handleConferenteBarClick = (e: any) => {
    if (e && e.activePayload && e.activePayload.length > 0) {
        const conferenteName = e.activePayload[0].payload.conferente;
        onFiltersChange({
            startDate: '',
            endDate: '',
            operation: 'ALL',
            conferente: conferenteName,
        });
        setActiveView('history');
    }
  };

  const formatKg = (value: number) => `${value.toLocaleString('pt-BR')} kg`;
  const formatCurrency = (value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 text-center pb-4" style={{minWidth: '960px'}}>
        <Card title="Saldo Atual (Rolos)" value={`${Math.floor(dashboardData.currentBalance / ROLL_WEIGHT_KG)}`} isCritical={dashboardData.currentBalance < 50} />
        <Card title="Consumo Mensal" value={formatKg(dashboardData.monthlyConsumption)} />
        <Card title="Custo Médio" value={formatCurrency(dashboardData.avgCost)} />
        <Card title="Entradas (Total)" value={formatKg(dashboardData.totalInput)} />
        <Card title="Saídas (Total)" value={formatKg(dashboardData.totalOutput)} />
      </div>
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-1 bg-slate-900/50 p-6 rounded-2xl shadow-sm">
              <h3 className="text-lg font-semibold mb-4 text-center text-slate-200">Distribuição de Operações</h3>
              {dashboardData.operationDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                        <Pie data={dashboardData.operationDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={{fill: '#e2e8f0'}} onClick={handlePieClick} cursor="pointer">
                            {dashboardData.operationDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[entry.name as OperationType]} />
                            ))}
                        </Pie>
                        <Tooltip {...chartTooltipProps} formatter={(value) => `${value} operaçõe(s)`}/>
                        <Legend {...chartLegendProps}/>
                    </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-gray-500">Sem dados para exibir.</p>}
          </div>
          <div className="xl:col-span-2 bg-slate-900/50 p-6 rounded-2xl shadow-sm">
              <h3 className="text-lg font-semibold mb-4 text-center text-slate-200">Consumo Mensal (kg)</h3>
               {dashboardData.monthlyConsumptionData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={dashboardData.monthlyConsumptionData} onClick={handleLineClick} style={{ cursor: 'pointer' }}>
                        <CartesianGrid {...chartGridProps}/>
                        <XAxis dataKey="month" {...chartAxisProps}/>
                        <YAxis {...chartAxisProps}/>
                        <Tooltip {...chartTooltipProps} formatter={(value) => [`${value} kg`, "Consumo"]}/>
                        <Legend {...chartLegendProps}/>
                        <Line type="monotone" dataKey="consumo" stroke="#ef4444" strokeWidth={2} activeDot={{ r: 8 }} />
                    </LineChart>
                </ResponsiveContainer>
               ) : <p className="text-center text-gray-500">Sem dados para exibir.</p>}
          </div>
          <div className="xl:col-span-1 bg-slate-900/50 p-6 rounded-2xl shadow-sm">
              <h3 className="text-lg font-semibold mb-4 text-center text-slate-200">Valor do Estoque (R$)</h3>
               {dashboardData.stockValueData.length > 1 ? (
                <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={dashboardData.stockValueData}>
                        <CartesianGrid {...chartGridProps}/>
                        <XAxis dataKey="date" {...chartAxisProps} tick={{ fontSize: 12 }}/>
                        <YAxis {...chartAxisProps} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                        <Tooltip {...chartTooltipProps} formatter={(value: number) => [formatCurrency(value), "Valor"]}/>
                        <Legend {...chartLegendProps}/>
                        <Line type="monotone" dataKey="valor" stroke="#10B981" strokeWidth={2} activeDot={{ r: 8 }} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
               ) : <p className="text-center text-gray-500">Dados insuficientes para exibir tendência.</p>}
          </div>
          <div className="xl:col-span-2 bg-slate-900/50 p-6 rounded-2xl shadow-sm">
              <h3 className="text-lg font-semibold mb-4 text-center text-slate-200">Fluxo Mensal de Material (kg)</h3>
               {dashboardData.monthlyFlowData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={dashboardData.monthlyFlowData} onClick={handleFlowBarClick}>
                        <CartesianGrid {...chartGridProps}/>
                        <XAxis dataKey="month" {...chartAxisProps}/>
                        <YAxis {...chartAxisProps}/>
                        <Tooltip {...chartTooltipProps} formatter={(value) => `${value} kg`}/>
                        <Legend {...chartLegendProps}/>
                        <Bar dataKey="entradas" fill="#10B981" name="Entradas" cursor="pointer"/>
                        <Bar dataKey="saidas" fill="#F59E0B" name="Saídas" cursor="pointer"/>
                    </BarChart>
                </ResponsiveContainer>
               ) : <p className="text-center text-gray-500">Sem dados para exibir.</p>}
          </div>
          <div className="lg:col-span-2 xl:col-span-3 bg-slate-900/50 p-6 rounded-2xl shadow-sm">
            <h3 className="text-lg font-semibold mb-4 text-center text-slate-200">Movimentações por Conferente</h3>
            {dashboardData.movementsByConferente.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dashboardData.movementsByConferente} onClick={handleConferenteBarClick}>
                    <CartesianGrid {...chartGridProps} />
                    <XAxis dataKey="conferente" {...chartAxisProps} />
                    <YAxis {...chartAxisProps} />
                    <Tooltip {...chartTooltipProps} formatter={(value) => `${value} movimentações`} />
                    <Bar dataKey="movimentacoes" fill="#6366f1" name="Movimentações" cursor="pointer" />
                </BarChart>
            </ResponsiveContainer>
            ) : <p className="text-center text-gray-500">Sem dados para exibir.</p>}
          </div>
      </div>
    </div>
  );
};

export default Dashboard;