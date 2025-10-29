
import React, { useMemo, useState } from 'react';
import { PalletTransaction, PalletOperationType, PalletProfile, PalletFilters } from '../types';
import { PencilIcon, TrashIcon, TableIcon, TableCellsIcon, ArrowDownTrayIcon, XCircleIcon, ChevronDownIcon } from './Icons';
import SpreadsheetView from './SpreadsheetView';
import ExportView from './ExportView';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Button } from './ui/Button';
import Tooltip from './ui/Tooltip';

interface PalletTableProps {
  transactions: PalletTransaction[];
  onEdit: (transaction: PalletTransaction) => void;
  onDelete: (id: string) => void;
  isGuestMode: boolean;
  filters: PalletFilters;
  onFiltersChange: React.Dispatch<React.SetStateAction<PalletFilters>>;
}

type Tab = 'table' | 'spreadsheet' | 'export';

const DetailItem: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm text-slate-200">{value || '-'}</p>
    </div>
);

const PalletTable: React.FC<PalletTableProps> = ({ transactions, onEdit, onDelete, isGuestMode, filters, onFiltersChange }) => {
  const [activeTab, setActiveTab] = useState<Tab>('table');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onFiltersChange(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    onFiltersChange({
      startDate: '',
      endDate: '',
      operation: 'ALL',
      client: '',
      profile: 'ALL',
    });
  };

  const isFilterActive = useMemo(() => {
    return filters.startDate || filters.endDate || filters.operation !== 'ALL' || filters.client || filters.profile !== 'ALL';
  }, [filters]);

  const filteredTransactions = useMemo(() => {
    const lowerCaseClient = filters.client.toLowerCase();
    return transactions.filter(t => {
      const transactionDate = new Date(t.date);
       if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        if (transactionDate.setHours(0,0,0,0) < startDate.setHours(0,0,0,0)) return false;
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        if (transactionDate.setHours(0,0,0,0) > endDate.setHours(0,0,0,0)) return false;
      }
      if (filters.operation !== 'ALL' && t.operation !== filters.operation) return false;
      if (filters.client && !t.client.toLowerCase().includes(lowerCaseClient)) return false;
      if (filters.profile !== 'ALL' && t.profile !== filters.profile) return false;
      return true;
    });
  }, [transactions, filters]);
  

  const getOperationClass = (operation: PalletOperationType) => {
    switch (operation) {
      case PalletOperationType.ENTRADA: return 'text-green-700';
      case PalletOperationType.SAIDA: return 'text-amber-700';
      case PalletOperationType.AJUSTE: return 'text-slate-600';
      case PalletOperationType.DEVOLUCAO: return 'text-blue-600';
      default: return 'text-gray-700';
    }
  };
  
  const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      const userTimezoneOffset = date.getTimezoneOffset() * 60000;
      return new Date(date.getTime() + userTimezoneOffset).toLocaleDateString('pt-BR');
  }
  
  const columns = useMemo(() => [
    { key: 'month', label: 'Mês' },
    { key: 'date', label: 'Data', format: formatDate },
    { key: 'operation', label: 'Operação' },
    { key: 'invoice', label: 'NF' },
    { key: 'client', label: 'Cliente' },
    { key: 'profile', label: 'Perfil' },
    { key: 'origin', label: 'Origem/Destino' },
    { key: 'driver', label: 'Motorista' },
    { key: 'plate', label: 'Placa' },
    { key: 'cte', label: 'CTE' },
    { key: 'pbrInput', label: 'Entrada PBR' },
    { key: 'output', label: 'Saída' },
    { key: 'returned', label: 'Retorno' },
    { key: 'pbrBroken', label: 'PBR Queb.' },
    { key: 'chepInput', label: 'Entrada CHEP' },
    { key: 'chepBroken', label: 'CHEP Queb.' },
    { key: 'oneWay', label: 'One Way' },
    { key: 'checker', label: 'Conferente' },
    { key: 'startTime', label: 'Início' },
    { key: 'endTime', label: 'Fim' },
    { key: 'duration', label: 'Temp.' },
    { key: 'bonus', label: 'Bônus' },
    { key: 'bonusId', label: 'ID Bônus' },
    { key: 'observations', label: 'OBS' },
  ], []);

  const TabButton: React.FC<{tab: Tab, label: string, icon: React.ReactNode}> = ({ tab, label, icon }) => (
     <button
        onClick={() => setActiveTab(tab)}
        className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold rounded-t-xl transition-colors duration-200 ${
            activeTab === tab 
            ? 'bg-slate-800 text-primary-500 border-b-2 border-primary-500'
            : 'text-slate-400 hover:text-primary-500'
        }`}
    >
        {icon}
        {label}
    </button>
  );

  return (
    <div className="bg-slate-800 p-8 rounded-3xl shadow-xl">
      <div className="mb-6 p-6 bg-slate-900/50 rounded-2xl shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-slate-300 mb-1">Data Início</label>
            <Input type="date" name="startDate" id="startDate" value={filters.startDate} onChange={handleFilterChange} />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-slate-300 mb-1">Data Fim</label>
            <Input type="date" name="endDate" id="endDate" value={filters.endDate} onChange={handleFilterChange} />
          </div>
          <div>
            <label htmlFor="operation" className="block text-sm font-medium text-slate-300 mb-1">Operação</label>
            <Select name="operation" id="operation" value={filters.operation} onChange={handleFilterChange}>
              <option value="ALL">Todas</option>
              {Object.values(PalletOperationType).map(op => <option key={op} value={op}>{op}</option>)}
            </Select>
          </div>
          <div>
            <label htmlFor="client" className="block text-sm font-medium text-slate-300 mb-1">Cliente</label>
            <Input type="text" name="client" id="client" placeholder="Nome do cliente..." value={filters.client} onChange={handleFilterChange} />
          </div>
          <div>
            <label htmlFor="profile" className="block text-sm font-medium text-slate-300 mb-1">Perfil</label>
            <Select name="profile" id="profile" value={filters.profile} onChange={handleFilterChange}>
              <option value="ALL">Todos</option>
              {Object.values(PalletProfile).map(p => <option key={p} value={p}>{p}</option>)}
            </Select>
          </div>
          <Button 
            onClick={clearFilters} 
            disabled={!isFilterActive}
            className={`flex items-center justify-center gap-2 px-4 py-2 font-semibold text-white rounded-xl transition-colors h-10 ${
                isFilterActive
                ? 'bg-primary-600 hover:bg-primary-700'
                : 'bg-slate-600 opacity-50 cursor-not-allowed'
            }`}
          >
            <XCircleIcon className="w-5 h-5" />
            Limpar Filtros
          </Button>
        </div>
      </div>
      <div className="flex border-b border-slate-700 mb-4" role="tablist">
        <TabButton tab="table" label="Visualizar Tabela" icon={<TableIcon className="w-5 h-5" />} />
        <TabButton tab="spreadsheet" label="Visualizar em Planilha" icon={<TableCellsIcon className="w-5 h-5" />} />
        <TabButton tab="export" label="Exportar Dados" icon={<ArrowDownTrayIcon className="w-5 h-5" />} />
      </div>

      {activeTab === 'table' && (
        <div className="overflow-x-auto rounded-lg border border-gray-400">
            <table className="w-full text-sm text-left bg-white border-collapse">
            <thead className="text-xs text-white uppercase bg-emerald-800">
            <tr>
                <th scope="col" className="px-3 py-2 font-bold border border-gray-400">Data</th>
                <th scope="col" className="px-3 py-2 font-bold border border-gray-400">Operação</th>
                <th scope="col" className="px-3 py-2 font-bold border border-gray-400">Cliente</th>
                <th scope="col" className="px-3 py-2 font-bold border border-gray-400">Placa</th>
                <th scope="col" className="px-3 py-2 font-bold border border-gray-400">Entrada/Saída</th>
                <th scope="col" className="px-3 py-2 font-bold border border-gray-400 text-center">Ações</th>
            </tr>
            </thead>
            <tbody className="text-gray-800">
            {filteredTransactions.length > 0 ? filteredTransactions.map((t) => (
                <React.Fragment key={t.id}>
                    <tr className="border-b border-gray-300 hover:bg-emerald-50/50">
                        <td className="px-3 py-1 border border-gray-300 whitespace-nowrap">{formatDate(t.date)}</td>
                        <td className={`px-3 py-1 border border-gray-300 font-semibold ${getOperationClass(t.operation)}`}>
                            {t.operation}
                        </td>
                        <td className="px-3 py-1 border border-gray-300 font-semibold">{t.client || '-'}</td>
                        <td className="px-3 py-1 border border-gray-300">{t.plate || '-'}</td>
                        <td className="px-3 py-1 border border-gray-300 font-medium">
                            {t.pbrInput > 0 && <span className="text-green-700">+{t.pbrInput} PBR </span>}
                            {t.chepInput > 0 && <span className="text-green-700">+{t.chepInput} CHEP </span>}
                            {t.output > 0 && <span className="text-red-700">-{t.output} PBR </span>}
                            {t.returned > 0 && <span className="text-blue-700">↩ {t.returned} PBR </span>}
                        </td>
                         <td className="px-3 py-1 border border-gray-300">
                            <div className="flex items-center justify-center space-x-1">
                                <Tooltip content="Ver Detalhes">
                                    <button onClick={() => setExpandedRowId(prevId => prevId === t.id ? null : t.id)} className="p-2 text-slate-600 rounded-full hover:bg-slate-200 hover:text-blue-600 transition-all duration-200 transform hover:scale-110 active:scale-95">
                                        <ChevronDownIcon className={`h-5 w-5 transition-transform ${expandedRowId === t.id ? 'rotate-180' : ''}`} />
                                    </button>
                                </Tooltip>
                                {!isGuestMode && (
                                    <>
                                        <Tooltip content="Editar">
                                            <button onClick={() => onEdit(t)} className="p-2 text-slate-600 rounded-full hover:bg-slate-200 hover:text-blue-600 transition-all duration-200 transform hover:scale-110 active:scale-95">
                                                <PencilIcon className="h-4 w-4" />
                                            </button>
                                        </Tooltip>
                                        <Tooltip content="Excluir">
                                            <button onClick={() => onDelete(t.id)} className="p-2 text-slate-600 rounded-full hover:bg-slate-200 hover:text-red-600 transition-all duration-200 transform hover:scale-110 active:scale-95">
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        </Tooltip>
                                    </>
                                )}
                            </div>
                        </td>
                    </tr>
                     {expandedRowId === t.id && (
                        <tr className="bg-slate-700/50">
                            <td colSpan={6} className="p-4">
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-6">
                                    <DetailItem label="NF" value={t.invoice} />
                                    <DetailItem label="Perfil" value={t.profile} />
                                    <DetailItem label="Motorista" value={t.driver} />
                                    <DetailItem label="Origem/Destino" value={t.origin} />
                                    <DetailItem label="CTE" value={t.cte} />
                                    <DetailItem label="Conferente" value={t.checker} />

                                    <DetailItem label="Entrada PBR" value={`${t.pbrInput}`} />
                                    <DetailItem label="Saída PBR" value={`${t.output}`} />
                                    <DetailItem label="Retorno PBR" value={`${t.returned}`} />
                                    <DetailItem label="PBR Quebrado" value={<span className={t.pbrBroken > 0 ? 'text-accent-error font-bold' : ''}>{t.pbrBroken}</span>} />
                                    
                                    <DetailItem label="Entrada CHEP" value={`${t.chepInput}`} />
                                    <DetailItem label="CHEP Quebrado" value={<span className={t.chepBroken > 0 ? 'text-accent-error font-bold' : ''}>{t.chepBroken}</span>} />

                                    <DetailItem label="One Way" value={`${t.oneWay}`} />
                                    <DetailItem label="Início" value={t.startTime} />
                                    <DetailItem label="Fim" value={t.endTime} />
                                    <DetailItem label="Duração" value={t.duration} />
                                    
                                    <DetailItem label="Bônus" value={t.bonus} />
                                    <DetailItem label="ID Bônus" value={t.bonusId} />
                                    
                                    <div className="col-span-full">
                                        <DetailItem label="Observações" value={t.observations} />
                                    </div>
                                </div>
                            </td>
                        </tr>
                    )}
                </React.Fragment>
            )) : (
                <tr>
                <td colSpan={6} className="text-center py-8 text-slate-500">Nenhuma transação encontrada para os filtros selecionados.</td>
                </tr>
            )}
            </tbody>
            </table>
        </div>
      )}

      {activeTab === 'spreadsheet' && (
        <SpreadsheetView data={filteredTransactions} columns={columns} />
      )}
      
      {activeTab === 'export' && (
        <ExportView data={filteredTransactions} headers={columns} filename="historico_paletes_filtrado" />
      )}
    </div>
  );
};

export default PalletTable;