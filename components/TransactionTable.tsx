
import React, { useState, useMemo } from 'react';
import { Transaction, OperationType, TransactionFilters } from '../types';
import { PencilIcon, TrashIcon, TableIcon, TableCellsIcon, ArrowDownTrayIcon, XCircleIcon } from './Icons';
import SpreadsheetView from './SpreadsheetView';
import ExportView from './ExportView';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Button } from './ui/Button';
import Tooltip from './ui/Tooltip';

interface TransactionTableProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
  isGuestMode: boolean;
  filters: TransactionFilters;
  onFiltersChange: React.Dispatch<React.SetStateAction<TransactionFilters>>;
}

type Tab = 'table' | 'spreadsheet' | 'export';

const TransactionTable: React.FC<TransactionTableProps> = ({ transactions, onEdit, onDelete, isGuestMode, filters, onFiltersChange }) => {
  const [activeTab, setActiveTab] = useState<Tab>('table');
  
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onFiltersChange(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    onFiltersChange({
      startDate: '',
      endDate: '',
      operation: 'ALL',
      conferente: '',
    });
  };

  const isFilterActive = useMemo(() => {
    return filters.startDate || filters.endDate || filters.operation !== 'ALL' || filters.conferente;
  }, [filters]);

  const filteredTransactions = useMemo(() => {
    const lowerCaseConferente = filters.conferente.toLowerCase();
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
      if (filters.operation !== 'ALL' && t.operation !== filters.operation) {
        return false;
      }
      if (filters.conferente && !t.conferente?.toLowerCase().includes(lowerCaseConferente)) {
        return false;
      }
      return true;
    });
  }, [transactions, filters]);

  const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      const userTimezoneOffset = date.getTimezoneOffset() * 60000;
      return new Date(date.getTime() + userTimezoneOffset).toLocaleDateString('pt-BR');
  }

  const columns = useMemo(() => [
    { key: 'date', label: 'Data', format: formatDate },
    { key: 'operation', label: 'Operação' },
    { key: 'input', label: 'Entrada (kg)' },
    { key: 'output', label: 'Saída (kg)' },
    { key: 'conferente', label: 'Conferente' },
    { key: 'invoice', label: 'NF' },
    { key: 'value', label: 'Valor (R$)', format: (v: number) => v > 0 ? v.toLocaleString('pt-BR', {style:'currency', currency: 'BRL'}) : '-' },
    { key: 'balance', label: 'Saldo (kg)' },
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
            <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-slate-300 mb-1">Data Início</label>
                <Input type="date" name="startDate" id="startDate" value={filters.startDate} onChange={handleFilterChange} />
            </div>
            <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-slate-300 mb-1">Data Fim</label>
                <Input type="date" name="endDate" id="endDate" value={filters.endDate} onChange={handleFilterChange} />
            </div>
            <div>
                <label htmlFor="operation" className="block mb-2 text-sm font-medium text-slate-300">Operação</label>
                <Select name="operation" id="operation" value={filters.operation} onChange={handleFilterChange}>
                <option value="ALL">Todas</option>
                {Object.values(OperationType).map(op => <option key={op} value={op}>{op}</option>)}
                </Select>
            </div>
            <div>
                <label htmlFor="conferente" className="block mb-2 text-sm font-medium text-slate-300">Conferente</label>
                <Input type="text" name="conferente" id="conferente" value={filters.conferente} onChange={handleFilterChange} placeholder="Nome do conferente..." />
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
                        <th scope="col" className="px-3 py-2 font-bold border border-gray-400 text-right">Entrada</th>
                        <th scope="col" className="px-3 py-2 font-bold border border-gray-400 text-right">Saída</th>
                        <th scope="col" className="px-3 py-2 font-bold border border-gray-400">Conferente</th>
                        <th scope="col" className="px-3 py-2 font-bold border border-gray-400">NF</th>
                        <th scope="col" className="px-3 py-2 font-bold border border-gray-400 text-right">Valor (R$)</th>
                        <th scope="col" className="px-3 py-2 font-bold border border-gray-400 text-right">Saldo (kg)</th>
                        <th scope="col" className="px-3 py-2 font-bold border border-gray-400">Observações</th>
                        <th scope="col" className="px-3 py-2 font-bold border border-gray-400 text-center">Ações</th>
                    </tr>
                    </thead>
                    <tbody className="text-gray-800">
                    {filteredTransactions.length > 0 ? filteredTransactions.map((t) => (
                        <tr key={t.id} className="border-b border-gray-300 hover:bg-emerald-50/50">
                            <td className="px-3 py-1 border border-gray-300 whitespace-nowrap">{formatDate(t.date)}</td>
                            <td className="px-3 py-1 border border-gray-300 font-medium">{t.operation}</td>
                            <td className="px-3 py-1 border border-gray-300 text-right font-medium text-green-700">{t.input > 0 ? t.input.toLocaleString('pt-BR') : '-'}</td>
                            <td className="px-3 py-1 border border-gray-300 text-right font-medium text-red-700">{t.output > 0 ? t.output.toLocaleString('pt-BR') : '-'}</td>
                            <td className="px-3 py-1 border border-gray-300">{t.conferente || '-'}</td>
                            <td className="px-3 py-1 border border-gray-300">{t.invoice || '-'}</td>
                            <td className="px-3 py-1 border border-gray-300 text-right">{t.value > 0 ? t.value.toLocaleString('pt-BR', {style:'currency', currency: 'BRL'}) : '-'}</td>
                            <td className={`px-3 py-1 border border-gray-300 text-right font-bold ${t.balance < 50 ? 'text-red-600' : 'text-gray-800'}`}>{t.balance.toLocaleString('pt-BR')}</td>
                            <td className="px-3 py-1 border border-gray-300 max-w-sm truncate" title={t.observations}>{t.observations || '-'}</td>
                            <td className="px-3 py-1 border border-gray-300">
                                <div className="flex items-center justify-center space-x-1">
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
                    )) : (
                        <tr>
                        <td colSpan={10} className="text-center py-8 text-slate-500">Nenhuma transação encontrada para os filtros selecionados.</td>
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
            <ExportView data={filteredTransactions} headers={columns} filename="historico_filmes_stretch_filtrado" />
        )}
    </div>
  );
};

export default TransactionTable;