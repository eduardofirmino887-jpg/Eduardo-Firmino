

import React, { useState, useEffect } from 'react';
import { Transaction, OperationType } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';

type FormData = Omit<Transaction, 'balance' | 'unitKg' | 'id'>;

interface TransactionFormProps {
  onSave: (transaction: FormData) => void;
  initialData?: Transaction;
  isEditMode?: boolean;
  addToast: (message: string, type: 'success' | 'error') => void;
  currentBalance?: number;
}

const ROLL_WEIGHT_KG = 3; // Standard weight for one roll of stretch film in kg

const defaultState: FormData = {
    date: new Date().toISOString().split('T')[0],
    operation: OperationType.SAIDA,
    output: 0,
    input: 0,
    invoice: '',
    value: 0,
    observations: '',
    conferente: '',
};

const TransactionForm: React.FC<TransactionFormProps> = ({ onSave, initialData, isEditMode = false, addToast, currentBalance = 0 }) => {
  const [formData, setFormData] = useState<FormData>(defaultState);
  const [outputInRolls, setOutputInRolls] = useState<string>('');

  useEffect(() => {
    if (isEditMode && initialData) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, balance, unitKg, ...editableData } = initialData;
        setFormData(editableData);
        if (editableData.output > 0 && (editableData.operation === OperationType.SAIDA || editableData.operation === OperationType.DEVOLUCAO)) {
            setOutputInRolls(String(editableData.output / ROLL_WEIGHT_KG));
        } else {
            setOutputInRolls('');
        }
    } else {
        setFormData(defaultState);
        setOutputInRolls('');
    }
  }, [initialData, isEditMode]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };
  
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    const numericValue = value === '' ? 0 : Number(value);
    setFormData(prev => ({ ...prev, [id]: numericValue }));
  };

  const handleRollsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rollsValue = e.target.value;
    setOutputInRolls(rollsValue);
    const numericRolls = rollsValue === '' ? 0 : Number(rollsValue);
    if (!isNaN(numericRolls)) {
      setFormData(prev => ({ ...prev, output: numericRolls * ROLL_WEIGHT_KG }));
    }
  };

  const operation = formData.operation;
  const isEntry = operation === OperationType.ENTRADA;
  const isOutput = operation === OperationType.SAIDA || operation === OperationType.DEVOLUCAO;
  const isAdjust = operation === OperationType.AJUSTE;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEntry && (formData.input <= 0)) {
        addToast('Para ENTRADA, o campo "Entrada (kg)" deve ser maior que zero.', 'error');
        return;
    }
    if (isOutput && formData.output <= 0) {
        addToast('Para SAÍDA ou DEVOLUÇÃO, o campo "Saída (Rolos)" deve ser maior que zero.', 'error');
        return;
    }
    if (isAdjust && formData.input === 0) {
        addToast('Para AJUSTE, o valor não pode ser zero.', 'error');
        return;
    }
     if (!formData.conferente) {
        addToast('O campo "Conferente" é obrigatório.', 'error');
        return;
    }

    onSave(formData);
    if (!isEditMode) {
        setFormData(defaultState);
        setOutputInRolls('');
    }
  };
  

  return (
    <div className="max-w-4xl mx-auto">
        <div className="bg-slate-800 p-8 sm:p-10 lg:p-12 rounded-3xl shadow-xl">
          <h2 className="text-xl font-semibold text-slate-100 mb-6 text-center">
            {isEditMode ? 'Editar Movimentação' : 'Adicionar Nova Movimentação'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="date" className="block mb-2 text-sm font-medium text-slate-300">Data</label>
                    <Input type="date" id="date" value={formData.date} onChange={handleChange} required />
                </div>
                <div>
                    <label htmlFor="operation" className="block mb-2 text-sm font-medium text-slate-300">Operação</label>
                    <Select id="operation" value={formData.operation} onChange={handleChange}>
                      {Object.values(OperationType).map(op => <option key={op} value={op}>{op}</option>)}
                    </Select>
                </div>
            </div>
            
            <div>
                <label htmlFor="conferente" className="block mb-2 text-sm font-medium text-slate-300">Conferente</label>
                <Input type="text" id="conferente" value={formData.conferente} onChange={handleChange} required placeholder="Nome do conferente" />
            </div>

            {/* --- Movimentação --- */}
            
            {isOutput && (
                <div className="grid grid-cols-2 gap-4 items-end">
                    <div>
                        <label htmlFor="outputRolls" className="block mb-2 text-sm font-medium text-slate-300">Saída (Rolos)</label>
                        <Input type="number" id="outputRolls" value={outputInRolls} onChange={handleRollsChange} required={isOutput} min="0" placeholder="Nº de rolos"/>
                    </div>
                    <div className="pb-3 text-slate-400 text-sm">
                        (Equivalente a: <span className="font-semibold text-slate-200">{formData.output.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg</span>)
                    </div>
                </div>
            )}
            
            {(isEntry || isAdjust) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                      <label htmlFor="input" className="block mb-2 text-sm font-medium text-slate-300">
                          {isAdjust ? 'Ajuste (kg)' : 'Entrada (kg)'}
                      </label>
                      <Input 
                          type="number" 
                          id="input" 
                          value={formData.input} 
                          onChange={handleNumberChange} 
                          required={isEntry}
                          min={isEntry ? "0" : undefined}
                          placeholder={isAdjust ? "Use valor negativo para remover" : ""}
                      />
                  </div>
                   {(isEntry) && (
                     <div>
                        <label htmlFor="value" className="block mb-2 text-sm font-medium text-slate-300">Valor (R$)</label>
                        <Input type="number" id="value" value={formData.value} onChange={handleNumberChange} min="0"/>
                    </div>
                   )}
                </div>
            )}

            {isEntry && (
                <div>
                    <label htmlFor="invoice" className="block mb-2 text-sm font-medium text-slate-300">Nota Fiscal (NF)</label>
                    <Input type="text" id="invoice" value={formData.invoice} onChange={handleChange} />
                </div>
            )}
            
            <div>
                <label className="block mb-2 text-sm font-medium text-slate-400">Saldo Físico Atual</label>
                <div className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-300 font-semibold">
                    {Math.floor(currentBalance / ROLL_WEIGHT_KG).toLocaleString('pt-BR')} rolos ({currentBalance.toLocaleString('pt-BR')} kg)
                </div>
            </div>

            <div>
                <label htmlFor="observations" className="block mb-2 text-sm font-medium text-slate-300">Observações</label>
                <Input type="text" id="observations" value={formData.observations} onChange={handleChange} />
            </div>

            <Button type="submit" className="w-full !mt-8">
                {isEditMode ? 'Salvar Alterações' : 'Adicionar Movimentação'}
            </Button>
          </form>
        </div>
    </div>
  );
};

export default TransactionForm;
