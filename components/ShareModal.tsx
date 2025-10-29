
import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { XIcon, LinkIcon, CheckCircleIcon } from './Icons';
import { View, TransactionFilters, PalletFilters } from '../types';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareToken: string;
  addToast: (message: string, type: 'success' | 'info') => void;
  activeView: View;
  transactionFilters: TransactionFilters;
  palletFilters: PalletFilters;
}

const ShareModal: React.FC<ShareModalProps> = ({ 
    isOpen, 
    onClose, 
    shareToken, 
    addToast, 
    activeView,
    transactionFilters,
    palletFilters
}) => {
  const [shareUrl, setShareUrl] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Construct the URL with current view and filters
      const url = new URL(window.location.origin + window.location.pathname);
      url.searchParams.set('share_id', shareToken);
      url.searchParams.set('view', activeView);

      let filtersToUse: Partial<TransactionFilters & PalletFilters> | null = null;
      if (activeView === 'history') {
        filtersToUse = transactionFilters;
      } else if (activeView === 'palletHistory') {
        filtersToUse = palletFilters;
      }

      if (filtersToUse) {
        Object.entries(filtersToUse).forEach(([key, value]) => {
          if (value && value !== 'ALL') { // Only add non-empty/default filters
            url.searchParams.set(key, String(value));
          }
        });
      }

      setShareUrl(url.toString());
      setIsCopied(false); // Reset copied state each time modal opens
    }
  }, [isOpen, shareToken, activeView, transactionFilters, palletFilters]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      addToast('Link de compartilhamento copiado!', 'success');
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
    }).catch(err => {
      addToast('Falha ao copiar o link.', 'error');
      console.error('Failed to copy: ', err);
    });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
      <div 
        className="relative bg-slate-800 text-slate-200 rounded-3xl shadow-xl w-full max-w-lg p-8 animate-scaleIn"
        role="document"
      >
        <div className="flex items-start justify-between">
            <div>
                <h2 className="text-xl font-bold text-slate-100">Compartilhar Acesso de Visualização</h2>
                <p className="mt-1 text-sm text-slate-400">Qualquer pessoa com este link poderá visualizar a tela e os filtros atuais.</p>
            </div>
            <button 
                onClick={onClose} 
                className="p-2 text-slate-400 hover:text-slate-200 rounded-full bg-slate-700 hover:bg-slate-600 transition"
                aria-label="Fechar modal"
            >
                <XIcon className="h-6 w-6" />
            </button>
        </div>
        
        <div className="mt-6 flex items-center space-x-2">
            <div className="relative flex-grow">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="!pl-10 !pr-4 w-full"
                    aria-label="Link de compartilhamento"
                />
            </div>
            <Button
                onClick={handleCopyLink}
                className={`w-auto px-4 py-2 text-sm !rounded-xl transition-colors ${
                    isCopied 
                    ? '!bg-accent-success hover:!bg-green-700' 
                    : '!bg-primary-600 hover:!bg-primary-700'
                }`}
            >
                {isCopied ? (
                    <span className="flex items-center"><CheckCircleIcon className="h-5 w-5 mr-2" />Copiado</span>
                ) : 'Copiar Link'}
            </Button>
        </div>
        
        <div className="mt-6 text-right">
            <button 
                onClick={onClose}
                className="px-4 py-2 font-semibold text-slate-300 bg-slate-600 rounded-xl hover:bg-slate-500 transition"
            >
                Concluído
            </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
