

import React, { useMemo, useState } from 'react';
import { Ocorrencia, OcorrenciaOperation, OcorrenciaStatus, OcorrenciaFilters } from '../types';
import { PencilIcon, TrashIcon, TableIcon, TableCellsIcon, ArrowDownTrayIcon, XCircleIcon, ChevronDownIcon } from './Icons';
import SpreadsheetView from './SpreadsheetView';
import ExportView from './ExportView';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Button } from './ui/Button';
import Tooltip from './ui/Tooltip';

interface OcorrenciaTableProps {
  ocorrencias: Ocorrencia[];
  onEdit: (ocorrencia: Ocorrencia) => void;
  onDelete: (id: string) => void;
  isGuestMode: boolean;
  filters: OcorrenciaFilters;
  onFiltersChange: React.Dispatch<React.SetStateAction<OcorrenciaFilters>>;
}

type Tab = 'table' | 'spreadsheet' | 'export';

const DetailItem: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm text-slate-200">{value || '-'}</p>
    </div>
);

const OcorrenciaTable: React.FC<OcorrenciaTableProps> = ({ ocorrencias, onEdit, onDelete, isGuestMode, filters, onFiltersChange }) => {
  const [activeTab, setActiveTab] = useState<Tab>('table');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onFiltersChange(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    onFiltersChange({
      startDate: '', endDate: '', client: '', plate: '', driver: '',
      operation: 'ALL', responsibility: '', status: 'ALL',
    });
  };

  const isFilterActive = useMemo(() => {
    return filters.startDate || filters.endDate || filters.client || filters.plate || filters.driver || filters.operation !== 'ALL' || filters.responsibility !== '' || filters.status !== 'ALL';
  }, [filters]);

  const filteredOcorrencias = useMemo(() => {
    return ocorrencias.filter(o => {
      const transactionDate = new Date(o.date);
       if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        if (transactionDate.setHours(0,0,0,0) < startDate.setHours(0,0,0,0)) return false;
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        if (transactionDate.setHours(0,0,0,0) > endDate.setHours(0,0,0,0)) return false;
      }
      if (filters.operation !== 'ALL' && o.operation !== filters.operation) return false;
      if (filters.responsibility && !o.responsibility.toLowerCase().includes(filters.responsibility.toLowerCase())) return false;
      if (filters.status !== 'ALL' && o.status !== filters.status) return false;
      if (filters.client && !o.client.toLowerCase().includes(filters.client.toLowerCase())) return false;
      if (filters.plate && !o.plate.toLowerCase().includes(filters.plate.toLowerCase())) return false;
      if (filters.driver && !o.driver.toLowerCase().includes(filters.driver.toLowerCase())) return false;
      return true;
    });
  }, [ocorrencias, filters]);
  

  const getStatusClass = (status: OcorrenciaStatus) => {
    switch (status) {
      case OcorrenciaStatus.ABERTA: return 'bg-amber-500/20 text-amber-400 border-amber-500';
      case OcorrenciaStatus.EM_ANALISE: return 'bg-blue-500/20 text-blue-400 border-blue-500';
      case OcorrenciaStatus.CONCLUIDA: return 'bg-green-500/20 text-green-400 border-green-500';
      case OcorrenciaStatus.FECHADA: return 'bg-slate-500/20 text-slate-400 border-slate-500';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500';
    }
  };
  
  const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      const userTimezoneOffset = date.getTimezoneOffset() * 60000;
      return new Date(date.getTime() + userTimezoneOffset).toLocaleDateString('pt-BR');
  }
  
  const columns = useMemo(() => [
    { key: 'date', label: 'Data', format: formatDate },
    { key: 'status', label: 'Status' },
    { key: 'client', label: 'Cliente' },
    { key: 'plate', label: 'Placa' },
    { key: 'driver', label: 'Motorista' },
    { key: 'operation', label: 'Operação' },
    { key: 'responsibility', label: 'Responsabilidade' },
    { key: 'monitoringReason', label: 'Motivo Monitoramento' },
    { key: 'warehouseReason', label: 'Motivo Armazém' },
    { key: 'warehouseAnalysis', label: 'Análise Armazém' },
    { key: 'quantity', label: 'Qtd', format: (v: any, row: Ocorrencia) => `${row.quantity} ${row.volumeType}` },
    { key: 'invoice', label: 'NF', format: (v: string[]) => v.join(', ') },
    { key: 'devolutionInvoice', label: 'NF Devolução', format: (v: string[]) => v.join(', ') },
    { key: 'cte', label: 'CTE', format: (v: string[]) => v.join(', ') },
    { key: 'receiver', label: 'Recebedor' },
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
          <Input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} />
          <Input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} />
          <Input type="text" name="client" placeholder="Filtrar por cliente..." value={filters.client} onChange={handleFilterChange} />
          <Input type="text" name="plate" placeholder="Filtrar por placa..." value={filters.plate} onChange={handleFilterChange} />
          <Select name="operation" value={filters.operation} onChange={handleFilterChange}>
              <option value="ALL">Todas Operações</option>
              {Object.values(OcorrenciaOperation).map(op => <option key={op} value={op}>{op}</option>)}
          </Select>
          <Input type="text" name="responsibility" placeholder="Filtrar por responsável..." value={filters.responsibility} onChange={handleFilterChange} />
           <Select name="status" value={filters.status} onChange={handleFilterChange}>
              <option value="ALL">Todos Status</option>
              {Object.values(OcorrenciaStatus).map(op => <option key={op} value={op}>{op}</option>)}
          </Select>
          <Button onClick={clearFilters} disabled={!isFilterActive} className="flex items-center justify-center gap-2">
            <XCircleIcon className="w-5 h-5" /> Limpar Filtros
          </Button>
        </div>
      </div>
      <div className="flex border-b border-slate-700 mb-4" role="tablist">
        <TabButton tab="table" label="Visualizar Tabela" icon={<TableIcon className="w-5 h-5" />} />
        <TabButton tab="spreadsheet" label="Visualizar em Planilha" icon={<TableCellsIcon className="w-5 h-5" />} />
        <TabButton tab="export" label="Exportar Dados" icon={<ArrowDownTrayIcon className="w-5 h-5" />} />
      </div>

      {activeTab === 'table' && (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-300">
            <thead className="text-xs text-slate-400 uppercase bg-slate-900/50">
            <tr>
                <th scope="col" className="px-4 py-3">Data</th>
                <th scope="col" className="px-4 py-3">Cliente</th>
                <th scope="col" className="px-4 py-3">Placa</th>
                <th scope="col" className="px-4 py-3">Motivo</th>
                <th scope="col" className="px-4 py-3 text-center">Status</th>
                <th scope="col" className="px-4 py-3 text-center">Ações</th>
            </tr>
            </thead>
            <tbody>
            {filteredOcorrencias.length > 0 ? filteredOcorrencias.map((o) => (
                <React.Fragment key={o.id}>
                    <tr className="border-b border-slate-700 hover:bg-slate-700/50">
                        <td className="px-4 py-3 whitespace-nowrap">{formatDate(o.date)}</td>
                        <td className="px-4 py-3 font-semibold text-slate-100">{o.client || '-'}</td>
                        <td className="px-4 py-3">{o.plate || '-'}</td>
                        <td className="px-4 py-3 max-w-sm truncate" title={o.monitoringReason}>{o.monitoringReason || '-'}</td>
                        <td className="px-4 py-3 text-center">
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusClass(o.status)}`}>
                                {o.status}
                            </span>
                        </td>
                         <td className="px-4 py-3">
                            <div className="flex items-center justify-center space-x-1">
                                <Tooltip content="Ver Detalhes">
                                    <button onClick={() => setExpandedRowId(prevId => prevId === o.id ? null : o.id)} className="p-2 text-slate-400 rounded-full hover:bg-slate-600 hover:text-primary-400">
                                        <ChevronDownIcon className={`h-5 w-5 transition-transform ${expandedRowId === o.id ? 'rotate-180' : ''}`} />
                                    </button>
                                </Tooltip>
                                {!isGuestMode && (
                                    <>
                                        <Tooltip content="Editar">
                                            <button onClick={() => onEdit(o)} className="p-2 text-slate-400 rounded-full hover:bg-slate-600 hover:text-primary-400">
                                                <PencilIcon className="h-4 w-4" />
                                            </button>

                                        </Tooltip>
                                        <Tooltip content="Excluir">
                                            <button onClick={() => onDelete(o.id)} className="p-2 text-slate-400 rounded-full hover:bg-slate-600 hover:text-accent-error">
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        </Tooltip>
                                    </>
                                )}
                            </div>
                        </td>
                    </tr>
                     {expandedRowId === o.id && (
                        <tr className="bg-slate-900/40">
                            <td colSpan={6} className="p-4">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-6">
                                        <DetailItem label="Operação" value={o.operation} />
                                        <DetailItem label="Responsabilidade" value={o.responsibility} />
                                        <DetailItem label="Motorista" value={o.driver} />
                                        <DetailItem label="Recebedor" value={o.receiver} />
                                        <DetailItem label="Quantidade" value={`${o.quantity} ${o.volumeType}`} />
                                        <DetailItem label="NF(s)" value={o.invoice.join(', ')} />
                                        <DetailItem label="NF(s) Devolução" value={o.devolutionInvoice.join(', ')} />
                                        <DetailItem label="CTE(s)" value={o.cte.join(', ')} />
                                        <div className="col-span-full"> <DetailItem label="Motivo Armazém" value={<p className="whitespace-pre-wrap">{o.warehouseReason}</p>} /></div>
                                        <div className="col-span-full"> <DetailItem label="Análise Armazém" value={<p className="whitespace-pre-wrap">{o.warehouseAnalysis}</p>} /></div>
                                    </div>
                                    {o.photos.length > 0 && (
                                        <div>
                                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Fotos</p>
                                            <div className="flex flex-wrap gap-2">
                                                {o.photos.map((photo, index) => (
                                                    <a key={index} href={photo} target="_blank" rel="noopener noreferrer">
                                                        <img src={photo} alt={`Ocorrência ${o.id} - Foto ${index+1}`} className="w-24 h-24 object-cover rounded-lg border-2 border-slate-600 hover:border-primary-500 transition"/>
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </td>
                        </tr>
                    )}
                </React.Fragment>
            )) : (
                <tr>
                <td colSpan={6} className="text-center py-8 text-slate-500">Nenhuma ocorrência encontrada para os filtros selecionados.</td>
                </tr>
            )}
            </tbody>
            </table>
        </div>
      )}

      {activeTab === 'spreadsheet' && (
        <SpreadsheetView data={filteredOcorrencias} columns={columns} />
      )}
      
      {activeTab === 'export' && (
        <ExportView data={filteredOcorrencias} headers={columns} filename="historico_ocorrencias_filtrado" />
      )}
    </div>
  );
};

export default OcorrenciaTable;
