
import React, { useState, useEffect } from 'react';
import { PalletTransaction, PalletOperationType, PalletProfile } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';

type FormData = Omit<PalletTransaction, 'id' | 'month' | 'duration'>;

interface PalletFormProps {
  onSave: (transaction: FormData) => void;
  initialData?: PalletTransaction;
  isEditMode?: boolean;
  addToast: (message: string, type: 'success' | 'error') => void;
}

const initialState: FormData = {
    date: new Date().toISOString().split('T')[0],
    invoice: '',
    pbrInput: 0,
    oneWay: 0,
    pbrBroken: 0,
    chepInput: 0,
    chepBroken: 0,
    origin: '',
    plate: '',
    driver: '',
    client: '',
    profile: PalletProfile.ATACADO,
    cte: '',
    operation: PalletOperationType.ENTRADA,
    checker: '',
    startTime: '08:00',
    endTime: '09:00',
    output: 0,
    returned: 0,
    bonus: '',
    bonusId: '',
    observations: '',
};


const PalletForm: React.FC<PalletFormProps> = ({ onSave, initialData, isEditMode = false, addToast }) => {
  const [formData, setFormData] = useState<FormData>(initialState);

  useEffect(() => {
    if (isEditMode && initialData) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, month, duration, ...editableData } = initialData;
        setFormData(editableData);
    } else {
        setFormData(initialState);
    }
  }, [initialData, isEditMode]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };
  
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: Number(value) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const totalPalletsMoved = formData.pbrInput + formData.oneWay + formData.pbrBroken + formData.chepInput + formData.chepBroken + formData.output + formData.returned;
    if (totalPalletsMoved <= 0) {
        addToast('Nenhuma movimentação de palete foi registrada. Preencha ao menos um campo de quantidade.', 'error');
        return;
    }
    if (!formData.client || !formData.driver || !formData.plate) {
        addToast('Os campos Cliente, Motorista e Placa são obrigatórios.', 'error');
        return;
    }

    onSave(formData);
    if (!isEditMode) {
      setFormData(initialState);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
        <div className="bg-slate-800 p-8 sm:p-10 lg:p-12 rounded-3xl shadow-xl">
          <h2 className="text-xl font-semibold text-slate-100 mb-6 text-center">
            {isEditMode ? 'Editar Movimentação de Palete' : 'Adicionar Movimentação de Palete'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-200">Informações Gerais</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="date" className="block mb-2 text-sm font-medium text-slate-300">Data</label>
                        <Input type="date" id="date" value={formData.date} onChange={handleChange} required />
                    </div>
                    <div>
                        <label htmlFor="operation" className="block mb-2 text-sm font-medium text-slate-300">Operação</label>
                        <Select id="operation" value={formData.operation} onChange={handleChange}>
                        {Object.values(PalletOperationType).map(op => <option key={op} value={op}>{op}</option>)}
                        </Select>
                    </div>
                    <div>
                        <label htmlFor="invoice" className="block mb-2 text-sm font-medium text-slate-300">Nota Fiscal</label>
                        <Input type="text" id="invoice" value={formData.invoice} onChange={handleChange} />
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-200">Detalhes dos Paletes</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <label htmlFor="pbrInput" className="block mb-2 text-sm font-medium text-slate-300">Entrada PBR</label>
                        <Input type="number" id="pbrInput" value={formData.pbrInput} onChange={handleNumberChange} min="0"/>
                    </div>
                    <div>
                        <label htmlFor="pbrBroken" className="block mb-2 text-sm font-medium text-slate-300">PBR Quebrado</label>
                        <Input type="number" id="pbrBroken" value={formData.pbrBroken} onChange={handleNumberChange} min="0"/>
                    </div>
                    <div>
                        <label htmlFor="output" className="block mb-2 text-sm font-medium text-slate-300">Saída</label>
                        <Input type="number" id="output" value={formData.output} onChange={handleNumberChange} min="0"/>
                    </div>
                    <div>
                        <label htmlFor="returned" className="block mb-2 text-sm font-medium text-slate-300">Retorno</label>
                        <Input type="number" id="returned" value={formData.returned} onChange={handleNumberChange} min="0"/>
                    </div>
                    <div>
                        <label htmlFor="chepInput" className="block mb-2 text-sm font-medium text-slate-300">Entrada CHEP</label>
                        <Input type="number" id="chepInput" value={formData.chepInput} onChange={handleNumberChange} min="0"/>
                    </div>
                    <div>
                        <label htmlFor="chepBroken" className="block mb-2 text-sm font-medium text-slate-300">CHEP Quebrado</label>
                        <Input type="number" id="chepBroken" value={formData.chepBroken} onChange={handleNumberChange} min="0"/>
                    </div>
                    <div>
                        <label htmlFor="oneWay" className="block mb-2 text-sm font-medium text-slate-300">One Way</label>
                        <Input type="number" id="oneWay" value={formData.oneWay} onChange={handleNumberChange} min="0"/>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-200">Transporte e Cliente</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="origin" className="block mb-2 text-sm font-medium text-slate-300">Origem/Destino</label>
                        <Input type="text" id="origin" value={formData.origin} onChange={handleChange} />
                    </div>
                    <div>
                        <label htmlFor="client" className="block mb-2 text-sm font-medium text-slate-300">Cliente</label>
                        <Input type="text" id="client" value={formData.client} onChange={handleChange} />
                    </div>
                    <div>
                        <label htmlFor="profile" className="block mb-2 text-sm font-medium text-slate-300">Perfil</label>
                        <Select id="profile" value={formData.profile} onChange={handleChange}>
                        {Object.values(PalletProfile).map(op => <option key={op} value={op}>{op}</option>)}
                        </Select>
                    </div>
                    <div>
                        <label htmlFor="driver" className="block mb-2 text-sm font-medium text-slate-300">Motorista</label>
                        <Input type="text" id="driver" value={formData.driver} onChange={handleChange} />
                    </div>
                    <div>
                        <label htmlFor="plate" className="block mb-2 text-sm font-medium text-slate-300">Placa</label>
                        <Input type="text" id="plate" value={formData.plate} onChange={handleChange} />
                    </div>
                    <div>
                        <label htmlFor="cte" className="block mb-2 text-sm font-medium text-slate-300">Nº CTE</label>
                        <Input type="text" id="cte" value={formData.cte} onChange={handleChange} />
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-200">Conferência e Bônus</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="checker" className="block mb-2 text-sm font-medium text-slate-300">Conferente</label>
                        <Input type="text" id="checker" value={formData.checker} onChange={handleChange} />
                    </div>
                    <div>
                        <label htmlFor="startTime" className="block mb-2 text-sm font-medium text-slate-300">Início</label>
                        <Input type="time" id="startTime" value={formData.startTime} onChange={handleChange} />
                    </div>
                    <div>
                        <label htmlFor="endTime" className="block mb-2 text-sm font-medium text-slate-300">Fim</label>
                        <Input type="time" id="endTime" value={formData.endTime} onChange={handleChange} />
                    </div>
                    <div>
                        <label htmlFor="bonus" className="block mb-2 text-sm font-medium text-slate-300">Bônus</label>
                        <Input type="text" id="bonus" value={formData.bonus} onChange={handleChange} />
                    </div>
                    <div>
                        <label htmlFor="bonusId" className="block mb-2 text-sm font-medium text-slate-300">Nº Bônus</label>
                        <Input type="text" id="bonusId" value={formData.bonusId} onChange={handleChange} />
                    </div>
                    <div className="md:col-span-3">
                        <label htmlFor="observations" className="block mb-2 text-sm font-medium text-slate-300">Observações</label>
                        <Input type="text" id="observations" value={formData.observations} onChange={handleChange} />
                    </div>
                </div>
            </div>

            <Button type="submit" className="w-full !mt-10">
                 {isEditMode ? 'Salvar Alterações' : 'Adicionar Movimentação de Palete'}
            </Button>
          </form>
        </div>
    </div>
  );
};

export default PalletForm;