
import React, { useState, useEffect } from 'react';
import { Ocorrencia, OcorrenciaOperation, OcorrenciaStatus } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { XCircleIcon, PlusCircleIcon, PaperclipIcon } from './Icons';

type FormData = Omit<Ocorrencia, 'id'>;

interface OcorrenciaFormProps {
  onSave: (ocorrencia: FormData) => void;
  initialData?: Ocorrencia;
  isEditMode?: boolean;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const initialState: FormData = {
    date: new Date().toISOString().split('T')[0],
    plate: '',
    driver: '',
    client: '',
    cte: [''],
    invoice: [''],
    devolutionInvoice: [''],
    quantity: 0,
    volumeType: 'CX',
    monitoringReason: '',
    warehouseReason: '',
    warehouseAnalysis: '',
    receiver: '',
    responsibility: '',
    operation: OcorrenciaOperation.ENTREGA,
    status: OcorrenciaStatus.ABERTA,
    photos: [],
};

// Helper to convert file to base64
const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
});

// Helper component to wrap Input with a Label
const LabeledInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, id, ...props }) => (
  <div>
    <label htmlFor={id} className="block mb-2 text-sm font-medium text-slate-300">{label}</label>
    <Input id={id} {...props} />
  </div>
);

// Helper component for Textarea with a Label
const LabeledTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }> = ({ label, id, ...props }) => (
    <div>
        <label htmlFor={id} className="block mb-2 text-sm font-medium text-slate-300">{label}</label>
        <textarea
            id={id}
            rows={4}
            {...props}
            className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition outline-none"
        />
    </div>
);


const OcorrenciaForm: React.FC<OcorrenciaFormProps> = ({ onSave, initialData, isEditMode = false, addToast }) => {
  const [formData, setFormData] = useState<FormData>(initialState);

  useEffect(() => {
    if (isEditMode && initialData) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...editableData } = initialData;
        setFormData({
            ...editableData,
            // Ensure arrays are not empty for the form inputs
            cte: editableData.cte.length > 0 ? editableData.cte : [''],
            invoice: editableData.invoice.length > 0 ? editableData.invoice : [''],
            devolutionInvoice: editableData.devolutionInvoice.length > 0 ? editableData.devolutionInvoice : [''],
        });
    } else {
        setFormData(initialState);
    }
  }, [initialData, isEditMode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: Number(value) }));
  };
  
  const handleDynamicListChange = (listName: 'cte' | 'invoice' | 'devolutionInvoice', index: number, value: string) => {
    const newList = [...formData[listName]];
    newList[index] = value;
    setFormData(prev => ({ ...prev, [listName]: newList }));
  };

  const addToList = (listName: 'cte' | 'invoice' | 'devolutionInvoice') => {
    if (formData[listName].length < 15) {
        setFormData(prev => ({ ...prev, [listName]: [...prev[listName], ''] }));
    } else {
        addToast(`Limite de 15 ${listName === 'cte' ? 'CTEs' : 'Notas Fiscais'} atingido.`, 'error');
    }
  };

  const removeFromList = (listName: 'cte' | 'invoice' | 'devolutionInvoice', index: number) => {
    if (formData[listName].length > 1) {
        const newList = formData[listName].filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, [listName]: newList }));
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    if (formData.photos.length + files.length > 20) {
        addToast('Você pode anexar no máximo 20 fotos.', 'error');
        return;
    }

    try {
        const base64Promises = [];
        for (let i = 0; i < files.length; i++) {
            const file = files.item(i);
            if (file) {
                base64Promises.push(toBase64(file));
            }
        }
        const newPhotos = await Promise.all(base64Promises);
        setFormData(prev => ({...prev, photos: [...prev.photos, ...newPhotos]}));
    } catch (error) {
        console.error("Error converting images to base64", error);
        addToast('Ocorreu um erro ao processar as imagens.', 'error');
    }
  };

  const removePhoto = (indexToRemove: number) => {
    setFormData(prev => ({...prev, photos: prev.photos.filter((_, index) => index !== indexToRemove)}));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.client || !formData.plate || !formData.monitoringReason) {
        addToast('Os campos Cliente, Placa e Motivo Monitoramento são obrigatórios.', 'error');
        return;
    }

    // Filter out empty strings from dynamic lists before saving
    const cleanedFormData = {
        ...formData,
        cte: formData.cte.filter(item => item.trim() !== ''),
        invoice: formData.invoice.filter(item => item.trim() !== ''),
        devolutionInvoice: formData.devolutionInvoice.filter(item => item.trim() !== ''),
    };

    onSave(cleanedFormData);
    if (!isEditMode) {
      setFormData(initialState);
    }
  };
  
  const DynamicInputList: React.FC<{
    listName: 'cte' | 'invoice' | 'devolutionInvoice';
    label: string;
  }> = ({ listName, label }) => (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
      <div className="space-y-2 p-3 border border-slate-700 rounded-lg bg-slate-900/30">
        {formData[listName].map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              type="text"
              value={item}
              onChange={(e) => handleDynamicListChange(listName, index, e.target.value)}
              placeholder={`${label} #${index + 1}`}
            />
            {formData[listName].length > 1 && (
              <button type="button" onClick={() => removeFromList(listName, index)} className="p-2 text-slate-400 hover:text-accent-error rounded-full flex-shrink-0">
                <XCircleIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={() => addToList(listName)} className="flex items-center gap-2 text-sm text-primary-500 hover:text-primary-400 font-medium pt-1">
          <PlusCircleIcon className="w-5 h-5" /> Adicionar {label}
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto">
        <div className="bg-slate-800 p-8 sm:p-10 lg:p-12 rounded-3xl shadow-xl">
          <h2 className="text-xl font-semibold text-slate-100 mb-6 text-center">
            {isEditMode ? 'Editar Ocorrência Logística' : 'Adicionar Nova Ocorrência Logística'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-8">

            <div className="space-y-4 p-4 border border-slate-700 rounded-xl">
                <h3 className="text-lg font-semibold text-slate-200">Informações Gerais</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <LabeledInput label="Data" type="date" id="date" value={formData.date} onChange={handleChange} required />
                    <LabeledInput label="Cliente" type="text" id="client" value={formData.client} onChange={handleChange} required placeholder="Nome do cliente" />
                    <LabeledInput label="Placa" type="text" id="plate" value={formData.plate} onChange={handleChange} required placeholder="ABC-1234" />
                    <LabeledInput label="Motorista" type="text" id="driver" value={formData.driver} onChange={handleChange} placeholder="Nome do motorista"/>
                </div>
            </div>

            <div className="space-y-4 p-4 border border-slate-700 rounded-xl">
                <h3 className="text-lg font-semibold text-slate-200">Documentos e Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="operation" className="block mb-2 text-sm font-medium text-slate-300">Operação</label>
                            <Select id="operation" value={formData.operation} onChange={handleChange}>
                                {Object.values(OcorrenciaOperation).map(op => <option key={op} value={op}>{op}</option>)}
                            </Select>
                        </div>
                        <div>
                            <label htmlFor="status" className="block mb-2 text-sm font-medium text-slate-300">Status</label>
                            <Select id="status" value={formData.status} onChange={handleChange}>
                                {Object.values(OcorrenciaStatus).map(s => <option key={s} value={s}>{s}</option>)}
                            </Select>
                        </div>
                    </div>
                     <DynamicInputList listName="invoice" label="Nota Fiscal"/>
                     <DynamicInputList listName="devolutionInvoice" label="NF Devolução"/>
                     <div className="md:col-span-3"><DynamicInputList listName="cte" label="Nº CTE"/></div>
                </div>
            </div>

            <div className="space-y-4 p-4 border border-slate-700 rounded-xl">
                <h3 className="text-lg font-semibold text-slate-200">Detalhes da Ocorrência</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid grid-cols-2 gap-2">
                        <LabeledInput label="Quantidade" type="number" id="quantity" value={formData.quantity} onChange={handleNumberChange} min="0" />
                        <LabeledInput label="Volume" type="text" id="volumeType" value={formData.volumeType} onChange={handleChange} placeholder="CX, PLT, etc." />
                    </div>
                    <div className="md:col-span-2 space-y-4">
                        <LabeledTextarea label="Motivo Monitoramento" id="monitoringReason" value={formData.monitoringReason} onChange={handleChange} required />
                        <LabeledTextarea label="Motivo Armazém" id="warehouseReason" value={formData.warehouseReason} onChange={handleChange} />
                        <LabeledTextarea label="Análise Armazém" id="warehouseAnalysis" value={formData.warehouseAnalysis} onChange={handleChange} />
                    </div>
                </div>
            </div>
            
            <div className="space-y-4 p-4 border border-slate-700 rounded-xl">
                <h3 className="text-lg font-semibold text-slate-200">Fotos da Ocorrência</h3>
                <label htmlFor="photo-upload" className="flex items-center justify-center gap-2 w-full px-4 py-3 text-sm font-semibold text-slate-300 bg-slate-700 rounded-xl border border-slate-600 hover:bg-slate-600 cursor-pointer">
                    <PaperclipIcon className="w-5 h-5"/> Anexar Fotos ({formData.photos.length}/20)
                </label>
                <input id="photo-upload" type="file" multiple accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                {formData.photos.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 mt-4">
                        {formData.photos.map((photo, index) => (
                            <div key={index} className="relative group">
                                <img src={photo} alt={`Preview ${index}`} className="w-full h-24 object-cover rounded-lg"/>
                                <button type="button" onClick={() => removePhoto(index)} className="absolute top-1 right-1 p-0.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                    <XCircleIcon className="w-4 h-4"/>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="space-y-4 p-4 border border-slate-700 rounded-xl">
                <h3 className="text-lg font-semibold text-slate-200">Responsabilidade e Conferência</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <LabeledInput label="Responsabilidade" type="text" id="responsibility" value={formData.responsibility} onChange={handleChange} placeholder="Ex: Transportadora, Armazém..." />
                    <LabeledInput label="Recebedor / Conferente" type="text" id="receiver" value={formData.receiver} onChange={handleChange} placeholder="Nome do conferente"/>
                </div>
            </div>
            
            <Button type="submit" className="w-full !mt-10">
                 {isEditMode ? 'Salvar Alterações' : 'Adicionar Ocorrência'}
            </Button>
          </form>
        </div>
    </div>
  );
};

export default OcorrenciaForm;
